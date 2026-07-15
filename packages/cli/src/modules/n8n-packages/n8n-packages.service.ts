import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { Readable } from 'node:stream';

import { N8N_VERSION } from '@/constants';
import { EventService } from '@/events/event.service';

import { N8nPackageParser } from './engine/n8n-package-parser';
import { ProjectPackageImporter } from './engine/project-package-importer';
import { WorkflowPackageImporter } from './engine/workflow-package-importer';
import { CredentialExporter } from './entities/credential/credential.exporter';
import { DataTableExporter } from './entities/data-table/data-table.exporter';
import { FolderExporter } from './entities/folder/folder.exporter';
import { PackageExportBlockedError } from './entities/package-export.errors';
import { ProjectExporter } from './entities/project/project.exporter';
import { mergeRequirements } from './entities/requirements.types';
import { PackageWorkflowRequirementValidator } from './entities/workflow/package-workflow-requirement.validator';
import { WorkflowExporter } from './entities/workflow/workflow.exporter';
import type { WorkflowWorkflowRequirement } from './entities/workflow/workflow.types';
import { TarPackageReader } from './io/tar/tar-package-reader';
import { TarPackageWriter } from './io/tar/tar-package-writer';
import { PackageImportConfig } from './n8n-packages.config';
import {
	MissingWorkflowDependencyPolicy,
	type ExportPackageRequest,
	type ImportPackageRequest,
	type ImportResult,
} from './n8n-packages.types';
import { FORMAT_VERSION } from './spec/constants';
import {
	type ManifestEntry,
	type PackageManifest,
	packageManifestSchema,
} from './spec/manifest.schema';
import type { PackageRequirements } from './spec/requirements.schema';

@Service()
export class N8nPackagesService {
	constructor(
		private readonly projectExporter: ProjectExporter,
		private readonly workflowExporter: WorkflowExporter,
		private readonly folderExporter: FolderExporter,
		private readonly credentialExporter: CredentialExporter,
		private readonly dataTableExporter: DataTableExporter,
		private readonly instanceSettings: InstanceSettings,
		private readonly packageParser: N8nPackageParser,
		private readonly packageImportConfig: PackageImportConfig,
		private readonly projectPackageImporter: ProjectPackageImporter,
		private readonly workflowPackageImporter: WorkflowPackageImporter,
		private readonly eventService: EventService,
		private readonly workflowRequirementValidator: PackageWorkflowRequirementValidator,
	) {}

	async exportPackage(request: ExportPackageRequest): Promise<Readable> {
		// TODO: remove this once the other options are implemented
		const missingWorkflowDependencyPolicy =
			request.missingWorkflowDependencyPolicy ?? MissingWorkflowDependencyPolicy.Fail;

		if (missingWorkflowDependencyPolicy !== MissingWorkflowDependencyPolicy.Fail) {
			throw new PackageExportBlockedError(
				`missingWorkflowDependencyPolicy="${missingWorkflowDependencyPolicy}" is not supported yet. Only "fail" is currently supported.`,
			);
		}

		const writer = new TarPackageWriter();
		const workflowIds = request.workflowIds ?? [];
		const folderIds = request.folderIds ?? [];
		const projectIds = request.projectIds ?? [];

		const folderExportResult =
			folderIds.length > 0
				? await this.folderExporter.export({
						user: request.user,
						folderIds,
						writer,
					})
				: undefined;

		const workflowsForExport = this.filterWorkflowsAlreadyInFolders(
			folderExportResult?.workflowEntries,
			workflowIds,
		);

		const workflowExportResult =
			workflowsForExport.length > 0
				? await this.workflowExporter.export({
						user: request.user,
						workflowIds: workflowsForExport,
						writer,
					})
				: undefined;

		const projectExportResult =
			projectIds.length > 0
				? await this.projectExporter.export({
						user: request.user,
						projectIds,
						writer,
					})
				: undefined;

		const requirements = mergeRequirements(
			workflowExportResult?.requirements,
			folderExportResult?.requirements,
			projectExportResult?.requirements,
		);

		const allFolders = [
			...(folderExportResult?.entries ?? []),
			...(projectExportResult?.folderEntries ?? []),
		];

		const allWorkflowsInPackage = [
			...(workflowExportResult?.entries ?? []),
			...(folderExportResult?.workflowEntries ?? []),
			...(projectExportResult?.workflowEntries ?? []),
		];

		await this.workflowRequirementValidator.validateStaticSubWorkflowsIncluded(
			requirements.workflows,
			new Set(allWorkflowsInPackage.map(({ id }) => id)),
		);

		const credentialExportResult = await this.credentialExporter.export({
			user: request.user,
			requirements: requirements.credentials,
			writer,
			// Routes project-owned credentials into their project namespace; others stay top-level.
			projectTargetsById: projectExportResult?.projectTargetsById,
		});

		const dataTableExportResult = await this.dataTableExporter.export({
			user: request.user,
			requirements: requirements.dataTables,
			writer,
			// Routes project-owned data tables into their project namespace; others stay top-level.
			projectTargetsById: projectExportResult?.projectTargetsById,
		});

		const manifestRequirements = this.buildManifestRequirements(
			credentialExportResult.requirements,
			dataTableExportResult.requirements,
			requirements.workflows,
			allWorkflowsInPackage,
		);

		const manifest = packageManifestSchema.parse({
			packageFormatVersion: FORMAT_VERSION,
			exportedAt: new Date().toISOString(),
			sourceN8nVersion: N8N_VERSION,
			sourceId: this.instanceSettings.instanceId,
			...(credentialExportResult.entries.length > 0
				? { credentials: credentialExportResult.entries }
				: {}),
			...(manifestRequirements ? { requirements: manifestRequirements } : {}),
			...(allWorkflowsInPackage.length > 0 ? { workflows: allWorkflowsInPackage } : {}),
			...(allFolders.length > 0 ? { folders: allFolders } : {}),
			...(projectExportResult?.entries ? { projects: projectExportResult.entries } : {}),
		});

		writer.writeFile('manifest.json', JSON.stringify(manifest, null, '\t'));

		const stream = writer.finalize();

		this.eventService.emit('n8n-package-exported', {
			user: request.user,
			...(workflowExportResult?.entries.length
				? { workflowIds: workflowExportResult.entries.map(({ id }) => id) }
				: {}),
			...(folderExportResult?.entries.length
				? { folderIds: folderExportResult.entries.map(({ id }) => id) }
				: {}),
			...(projectExportResult?.entries.length
				? { projectIds: projectExportResult.entries.map(({ id }) => id) }
				: {}),
			counts: {
				workflows: allWorkflowsInPackage.length,
				folders: allFolders.length,
				credentials: credentialExportResult.entries.length,
				dataTables: dataTableExportResult.entries.length,
			},
		});

		return stream;
	}

	async importPackage(request: ImportPackageRequest): Promise<ImportResult> {
		const reader = new TarPackageReader(request.packageBuffer, this.packageImportConfig);
		const manifest = await this.packageParser.getManifest(reader);
		if (isProjectPackage(manifest)) {
			return await this.projectPackageImporter.import(request, reader, manifest);
		}
		return await this.workflowPackageImporter.import(request, reader, manifest);
	}

	filterWorkflowsAlreadyInFolders(workflowsInFolders: ManifestEntry[] = [], workflowIds: string[]) {
		const folderWorkflowIds = new Set(workflowsInFolders.map((entry) => entry.id) ?? []);
		return workflowIds.filter((id) => !folderWorkflowIds.has(id));
	}

	private buildManifestRequirements(
		credentials: PackageRequirements['credentials'],
		dataTables: PackageRequirements['dataTables'],
		workflows: WorkflowWorkflowRequirement[],
		allWorkflowsInPackage: ManifestEntry[],
	): PackageRequirements | undefined {
		const workflowRequirements = this.buildManifestWorkflowRequirements(
			workflows,
			allWorkflowsInPackage,
		);
		const requirements: PackageRequirements = {
			...(credentials?.length ? { credentials } : {}),
			...(dataTables?.length ? { dataTables } : {}),
			...(workflowRequirements.length ? { workflows: workflowRequirements } : {}),
		};
		return Object.keys(requirements).length > 0 ? requirements : undefined;
	}

	private buildManifestWorkflowRequirements(
		requirements: WorkflowWorkflowRequirement[],
		allWorkflowsInPackage: ManifestEntry[],
	): NonNullable<PackageRequirements['workflows']> {
		const workflowsById = new Map(allWorkflowsInPackage.map((workflow) => [workflow.id, workflow]));
		const usedByWorkflowsByReferencedId = new Map<string, string[]>();

		for (const requirement of requirements) {
			const usedByWorkflows =
				usedByWorkflowsByReferencedId.get(requirement.referencedWorkflowId) ?? [];

			if (!usedByWorkflows.includes(requirement.workflowId)) {
				usedByWorkflows.push(requirement.workflowId);
			}

			usedByWorkflowsByReferencedId.set(requirement.referencedWorkflowId, usedByWorkflows);
		}

		return [...usedByWorkflowsByReferencedId].map(([referencedWorkflowId, usedByWorkflows]) => ({
			id: referencedWorkflowId,
			name: workflowsById.get(referencedWorkflowId)?.name ?? '',
			usedByWorkflows,
		}));
	}
}

function isProjectPackage(manifest: PackageManifest): boolean {
	return (manifest.projects?.length ?? 0) > 0;
}

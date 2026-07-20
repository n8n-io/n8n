import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { Readable } from 'node:stream';

import { N8N_VERSION } from '@/constants';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
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
import { VariableExporter } from './entities/variable/variable.exporter';
import { assertStaticSubWorkflowsIncluded } from './entities/workflow/static-sub-workflow-requirements';
import { WorkflowDependencyResolver } from './entities/workflow/workflow-dependency-resolver';
import { WorkflowRequirementExporter } from './entities/workflow/workflow-requirement.exporter';
import { WorkflowExporter } from './entities/workflow/workflow.exporter';
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
	packageManifestSchema,
	type ManifestEntry,
	type PackageManifest,
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
		private readonly variableExporter: VariableExporter,
		private readonly instanceSettings: InstanceSettings,
		private readonly packageParser: N8nPackageParser,
		private readonly packageImportConfig: PackageImportConfig,
		private readonly projectPackageImporter: ProjectPackageImporter,
		private readonly workflowPackageImporter: WorkflowPackageImporter,
		private readonly eventService: EventService,
		private readonly workflowRequirementExporter: WorkflowRequirementExporter,
		private readonly workflowDependencyResolver: WorkflowDependencyResolver,
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

		const includeVariableValues = request.includeVariableValues ?? true;
		if (
			includeVariableValues &&
			requirements.variables.length > 0 &&
			request.canExportVariableValues === false
		) {
			throw new ForbiddenError(
				'The exported workflows reference variables, but the API key is missing the variable:list scope needed to bundle their values. Add the scope or set includeVariableValues to false.',
			);
		}

		const allFolders = [
			...(folderExportResult?.entries ?? []),
			...(projectExportResult?.folderEntries ?? []),
		];

		const allWorkflowsInPackage = [
			...(workflowExportResult?.entries ?? []),
			...(folderExportResult?.workflowEntries ?? []),
			...(projectExportResult?.workflowEntries ?? []),
		];

		const workflowRequirements = await this.workflowDependencyResolver.resolve({
			user: request.user,
			workflowIds: allWorkflowsInPackage.map(({ id }) => id),
		});

		assertStaticSubWorkflowsIncluded(
			workflowRequirements,
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

		const workflowRequirementExportResult = this.workflowRequirementExporter.export({
			requirements: workflowRequirements,
			workflows: allWorkflowsInPackage,
		});

		const variableExportResult = await this.variableExporter.export({
			user: request.user,
			requirements: requirements.variables,
			writer,
			includeVariableValues,
			projectTargetsById: projectExportResult?.projectTargetsById,
		});

		const manifestRequirements = this.buildManifestRequirements({
			credentials: credentialExportResult.requirements,
			dataTables: dataTableExportResult.requirements,
			workflows: workflowRequirementExportResult.requirements,
			variables: variableExportResult.requirements,
		});

		const manifest = packageManifestSchema.parse({
			packageFormatVersion: FORMAT_VERSION,
			exportedAt: new Date().toISOString(),
			sourceN8nVersion: N8N_VERSION,
			sourceId: this.instanceSettings.instanceId,
			...(credentialExportResult.entries.length > 0
				? { credentials: credentialExportResult.entries }
				: {}),
			...(dataTableExportResult.entries.length > 0
				? { dataTables: dataTableExportResult.entries }
				: {}),
			...(variableExportResult.entries.length > 0
				? { variables: variableExportResult.entries }
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
				variables: variableExportResult.entries.length,
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

	private buildManifestRequirements(input: {
		credentials: PackageRequirements['credentials'];
		dataTables: PackageRequirements['dataTables'];
		workflows: PackageRequirements['workflows'];
		variables: PackageRequirements['variables'];
	}): PackageRequirements | undefined {
		const { credentials, dataTables, workflows, variables } = input;

		const requirements: PackageRequirements = {
			...(credentials?.length ? { credentials } : {}),
			...(dataTables?.length ? { dataTables } : {}),
			...(workflows?.length ? { workflows } : {}),
			...(variables?.length ? { variables } : {}),
		};
		return Object.keys(requirements).length > 0 ? requirements : undefined;
	}
}

function isProjectPackage(manifest: PackageManifest): boolean {
	return (manifest.projects?.length ?? 0) > 0;
}

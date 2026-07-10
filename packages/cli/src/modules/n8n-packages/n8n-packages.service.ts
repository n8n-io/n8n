import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';
import type { Readable } from 'node:stream';

import { N8N_VERSION } from '@/constants';
import { EventService } from '@/events/event.service';

import { ImportPipeline } from './engine/import-pipeline';
import { CredentialExporter } from './entities/credential/credential.exporter';
import { FolderExporter } from './entities/folder/folder.exporter';
import { ProjectExporter } from './entities/project/project.exporter';
import { mergeRequirements } from './entities/requirements.types';
import { extractSubWorkflowRequirements } from './entities/workflow/sub-workflow-requirements';
import { WorkflowExporter } from './entities/workflow/workflow.exporter';
import { TarPackageWriter } from './io/tar/tar-package-writer';
import type {
	ExportPackageRequest,
	ImportPackageRequest,
	ImportResult,
} from './n8n-packages.types';
import { FORMAT_VERSION } from './spec/constants';
import { type ManifestEntry, packageManifestSchema } from './spec/manifest.schema';

@Service()
export class N8nPackagesService {
	constructor(
		private readonly projectExporter: ProjectExporter,
		private readonly workflowExporter: WorkflowExporter,
		private readonly folderExporter: FolderExporter,
		private readonly credentialExporter: CredentialExporter,
		private readonly instanceSettings: InstanceSettings,
		private readonly importPipeline: ImportPipeline,
		private readonly eventService: EventService,
	) {}

	async exportPackage(request: ExportPackageRequest): Promise<Readable> {
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

		const workflowEntitiesInPackage = [
			...(workflowExportResult?.workflowEntities ?? []),
			...(folderExportResult?.workflowEntities ?? []),
			...(projectExportResult?.workflowEntities ?? []),
		];

		this.assertStaticSubWorkflowsIncluded(
			workflowEntitiesInPackage,
			new Set(allWorkflowsInPackage.map(({ id }) => id)),
		);

		const credentialExportResult = await this.credentialExporter.export({
			user: request.user,
			requirements: requirements.credentials,
			writer,
			// Routes project-owned credentials into their project namespace; others stay top-level.
			projectTargetsById: projectExportResult?.projectTargetsById,
		});

		const manifest = packageManifestSchema.parse({
			packageFormatVersion: FORMAT_VERSION,
			exportedAt: new Date().toISOString(),
			sourceN8nVersion: N8N_VERSION,
			sourceId: this.instanceSettings.instanceId,
			...(credentialExportResult.entries.length > 0
				? { credentials: credentialExportResult.entries }
				: {}),
			...(credentialExportResult.requirements.length > 0
				? { requirements: { credentials: credentialExportResult.requirements } }
				: {}),
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
			},
		});

		return stream;
	}

	async importPackage(request: ImportPackageRequest): Promise<ImportResult> {
		return await this.importPipeline.run(request);
	}

	filterWorkflowsAlreadyInFolders(workflowsInFolders: ManifestEntry[] = [], workflowIds: string[]) {
		const folderWorkflowIds = new Set(workflowsInFolders.map((entry) => entry.id) ?? []);
		return workflowIds.filter((id) => !folderWorkflowIds.has(id));
	}

	private assertStaticSubWorkflowsIncluded(
		workflows: WorkflowEntity[],
		exportedWorkflowIds: Set<string>,
	) {
		const missingSubWorkflowIds = new Set<string>();

		for (const workflow of workflows) {
			for (const reference of extractSubWorkflowRequirements(workflow)) {
				if (!exportedWorkflowIds.has(reference.sourceWorkflowId)) {
					missingSubWorkflowIds.add(reference.sourceWorkflowId);
				}
			}
		}

		if (missingSubWorkflowIds.size === 0) return;

		const displayedWorkflowIds = [...missingSubWorkflowIds].slice(0, 20);
		const omittedCount = missingSubWorkflowIds.size - displayedWorkflowIds.length;
		const dependencyLabel = missingSubWorkflowIds.size === 1 ? 'dependency' : 'dependencies';

		throw new UserError(
			`${missingSubWorkflowIds.size} sub-workflow ${dependencyLabel} not included in the package. Export aborted.`,
			{
				description: `Sub-workflow IDs not included in the package: ${displayedWorkflowIds.join(', ')}${
					omittedCount > 0 ? `, and ${omittedCount} more` : ''
				}`,
			},
		);
	}
}

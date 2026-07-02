import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { Readable } from 'node:stream';

import { N8N_VERSION } from '@/constants';
import { EventService } from '@/events/event.service';

import { ImportPipeline } from './engine/import-pipeline';
import { CredentialExporter } from './entities/credential/credential.exporter';
import { FolderExporter } from './entities/folder/folder.exporter';
import { ProjectExporter } from './entities/project/project.exporter';
import { mergeRequirements } from './entities/requirements.types';
import { WorkflowExporter } from './entities/workflow/workflow.exporter';
import { TarPackageWriter } from './io/tar/tar-package-writer';
import type {
	ExportPackageRequest,
	ImportPackageRequest,
	ImportResult,
} from './n8n-packages.types';
import { FORMAT_VERSION } from './spec/constants';
import { packageManifestSchema } from './spec/manifest.schema';

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

		// Folders are exported before workflows so any workflow a folder already
		// placed can be dropped from the explicit top-level set below — otherwise it
		// would be written twice and duplicated in the manifest.
		const folderExportResult =
			folderIds.length > 0
				? await this.folderExporter.export({
						user: request.user,
						folderIds,
						writer,
					})
				: undefined;

		const folderWorkflowIds = new Set(
			folderExportResult?.workflowEntries.map((entry) => entry.id) ?? [],
		);
		const topLevelWorkflowIds = workflowIds.filter((id) => !folderWorkflowIds.has(id));

		const workflowExportResult =
			topLevelWorkflowIds.length > 0
				? await this.workflowExporter.export({
						user: request.user,
						workflowIds: topLevelWorkflowIds,
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

		// Merge every export result's requirements once, grouped by type; each
		// exporter is then handed its own slice (credentials today).
		const requirements = mergeRequirements(
			workflowExportResult?.requirements,
			folderExportResult?.requirements,
		);

		const credentialExportResult = await this.credentialExporter.export({
			user: request.user,
			requirements: requirements.credentials,
			writer,
		});

		// Top-level and folder-contained workflows are disjoint (the subtraction
		// above guarantees it), so concatenation needs no dedupe.
		const workflowEntries = [
			...(workflowExportResult?.entries ?? []),
			...(folderExportResult?.workflowEntries ?? []),
		];

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
			...(workflowEntries.length > 0 ? { workflows: workflowEntries } : {}),
			...(folderExportResult?.entries ? { folders: folderExportResult.entries } : {}),
			...(projectExportResult?.entries ? { projects: projectExportResult.entries } : {}),
		});

		writer.writeFile('manifest.json', JSON.stringify(manifest, null, '\t'));

		// Finalize before emitting so a failed finalization doesn't report a phantom export.
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
				workflows: workflowEntries.length,
				folders: folderExportResult?.entries.length ?? 0,
				credentials: credentialExportResult.entries.length,
			},
		});

		return stream;
	}

	async importPackage(request: ImportPackageRequest): Promise<ImportResult> {
		return await this.importPipeline.run(request);
	}
}

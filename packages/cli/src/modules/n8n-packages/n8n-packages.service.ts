import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { Readable } from 'node:stream';

import { N8N_VERSION } from '@/constants';

import { ImportPipeline } from './engine/import-pipeline';
import { CredentialExporter } from './entities/credential/credential.exporter';
import { ProjectExporter } from './entities/project/project.exporter';
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
		private readonly credentialExporter: CredentialExporter,
		private readonly instanceSettings: InstanceSettings,
		private readonly importPipeline: ImportPipeline,
	) {}

	async exportPackage(request: ExportPackageRequest): Promise<Readable> {
		const writer = new TarPackageWriter();
		const workflowIds = request.workflowIds ?? [];
		const projectIds = request.projectIds ?? [];

		const workflowExportResult =
			workflowIds.length > 0
				? await this.workflowExporter.export({
						user: request.user,
						workflowIds,
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

		const credentialExportResult = await this.credentialExporter.export({
			user: request.user,
			requirements: workflowExportResult?.requirements?.credentials ?? [],
			writer,
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
			...(workflowExportResult?.entries ? { workflows: workflowExportResult.entries } : {}),
			...(projectExportResult?.entries ? { projects: projectExportResult.entries } : {}),
		});

		writer.writeFile('manifest.json', JSON.stringify(manifest, null, '\t'));
		return writer.finalize();
	}

	async importPackage(request: ImportPackageRequest): Promise<ImportResult> {
		return await this.importPipeline.run(request);
	}
}

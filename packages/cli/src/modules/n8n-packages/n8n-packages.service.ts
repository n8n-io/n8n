import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { Readable } from 'node:stream';

import { N8N_VERSION } from '@/constants';

import { ImportPipeline } from './engine/import-pipeline';
import { CredentialExporter } from './entities/credential/credential.exporter';
import { WorkflowExporter } from './entities/workflow/workflow.exporter';
import { TarPackageWriter } from './io/tar/tar-package-writer';
import type {
	ExportWorkflowsRequest,
	ImportPackageRequest,
	ImportResult,
} from './n8n-packages.types';
import { FORMAT_VERSION } from './spec/constants';
import { packageManifestSchema } from './spec/manifest.schema';

@Service()
export class N8nPackagesService {
	constructor(
		private readonly workflowExporter: WorkflowExporter,
		private readonly credentialExporter: CredentialExporter,
		private readonly instanceSettings: InstanceSettings,
		private readonly importPipeline: ImportPipeline,
	) {}

	async exportWorkflows(request: ExportWorkflowsRequest): Promise<Readable> {
		const writer = new TarPackageWriter();

		const { entries: workflowEntries, requirements: workflowRequirements } =
			await this.workflowExporter.export({
				user: request.user,
				workflowIds: request.workflowIds,
				writer,
			});

		const { entries: credentialEntries, requirements: credentialRequirements } =
			await this.credentialExporter.export({
				user: request.user,
				requirements: workflowRequirements.credentials,
				writer,
			});

		const manifest = packageManifestSchema.parse({
			packageFormatVersion: FORMAT_VERSION,
			exportedAt: new Date().toISOString(),
			sourceN8nVersion: N8N_VERSION,
			sourceId: this.instanceSettings.instanceId,
			workflows: workflowEntries,
			...(credentialEntries.length > 0 ? { credentials: credentialEntries } : {}),
			...(credentialRequirements.length > 0
				? { requirements: { credentials: credentialRequirements } }
				: {}),
		});

		writer.writeFile('manifest.json', JSON.stringify(manifest, null, '\t'));
		return writer.finalize();
	}

	async importPackage(request: ImportPackageRequest): Promise<ImportResult> {
		return await this.importPipeline.run(request);
	}
}

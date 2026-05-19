import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { Readable } from 'node:stream';

import { N8N_VERSION } from '@/constants';

import { WorkflowExporter } from './entities/workflow/workflow.exporter';
import { TarPackageWriter } from './io/tar/tar-package-writer';
import type { ExportWorkflowsRequest } from './packages.types';
import { FORMAT_VERSION } from './spec/constants';
import { packageManifestSchema } from './spec/manifest.schema';

@Service()
export class PackagesService {
	constructor(
		private readonly workflowExporter: WorkflowExporter,
		private readonly instanceSettings: InstanceSettings,
	) {}

	async exportWorkflows(request: ExportWorkflowsRequest): Promise<Readable> {
		const writer = new TarPackageWriter();

		const workflowEntries = await this.workflowExporter.export({
			user: request.user,
			workflowIds: request.workflowIds,
			writer,
		});

		const manifest = packageManifestSchema.parse({
			packageFormatVersion: FORMAT_VERSION,
			exportedAt: new Date().toISOString(),
			sourceN8nVersion: N8N_VERSION,
			sourceId: this.instanceSettings.instanceId,
			workflows: workflowEntries,
		});

		writer.writeFile('manifest.json', JSON.stringify(manifest, null, '\t'));
		return writer.finalize();
	}
}

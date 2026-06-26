import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { Readable } from 'node:stream';

import { N8N_VERSION } from '@/constants';

import { CredentialExporter } from './entities/credential/credential.exporter';
import { WorkflowExporter } from './entities/workflow/workflow.exporter';
import { ImportPipeline } from './engine/import-pipeline';
import type { PackageWriter } from './io/package-writer';
import { TarPackageReader } from './io/tar/tar-package-reader';
import { TarPackageWriter } from './io/tar/tar-package-writer';
import { PackageImportConfig } from './n8n-packages.config';
import type {
	BlockingIssue,
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
		private readonly packageImportConfig: PackageImportConfig,
	) {}

	async exportWorkflows(request: ExportWorkflowsRequest): Promise<Readable> {
		const writer = new TarPackageWriter();
		await this.exportToWriter(request, writer);
		return writer.finalize();
	}

	/**
	 * Export into an explicit {@link PackageWriter}. `exportWorkflows` uses a
	 * TarPackageWriter; the instance-pull "raise review" flow passes a
	 * FilesystemPackageWriter to write the exploded tree into a git working dir.
	 */
	async exportToWriter(request: ExportWorkflowsRequest, writer: PackageWriter): Promise<void> {
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
	}

	async importPackage(request: ImportPackageRequest): Promise<ImportResult> {
		return await this.importPipeline.run(request);
	}

	/**
	 * Side-effect-free dry run of an import: returns the blocking issues without
	 * writing anything. Powers the `n8n deploy --dry-run` gate.
	 */
	async validatePackage(request: ImportPackageRequest): Promise<BlockingIssue[]> {
		const context = await this.importPipeline.resolveContext(
			request.user,
			request.projectId,
			request.folderId,
		);
		const reader = new TarPackageReader(request.packageBuffer, this.packageImportConfig);
		return await this.importPipeline.validate(reader, context, request);
	}
}

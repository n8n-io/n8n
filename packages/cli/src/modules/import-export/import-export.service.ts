import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { Readable } from 'node:stream';

import { N8N_VERSION } from '@/constants';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProjectService } from '@/services/project.service.ee';

import { ProjectExporter } from './project/project.exporter';
import { FORMAT_VERSION } from './import-export.constants';
import type { ExportContext, PackageManifest } from './import-export.types';
import { TarPackageWriter } from './tar-package-writer';

@Service()
export class ImportExportService {
	constructor(
		private readonly projectService: ProjectService,
		private readonly projectExporter: ProjectExporter,
		private readonly instanceSettings: InstanceSettings,
	) {}

	async exportPackage(context: ExportContext): Promise<Readable> {
		// Validate permissions — all-or-nothing
		for (const projectId of context.projectIds) {
			const project = await this.projectService.getProjectWithScope(context.user, projectId, [
				'project:read',
			]);

			if (!project) {
				throw new NotFoundError(`Project "${projectId}" not found or you do not have access`);
			}
		}

		const writer = new TarPackageWriter();

		// Run project exporter
		const projectEntries = await this.projectExporter.export(context, writer);

		// Assemble manifest
		const manifest: PackageManifest = {
			formatVersion: FORMAT_VERSION,
			exportedAt: new Date().toISOString(),
			n8nVersion: N8N_VERSION,
			source: this.instanceSettings.instanceId,
			projects: projectEntries,
		};

		writer.writeFile('manifest.json', JSON.stringify(manifest, null, '\t'));

		return writer.finalize();
	}
}

import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { Readable } from 'node:stream';

import { N8N_VERSION } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProjectService } from '@/services/project.service.ee';

import { FORMAT_VERSION } from './import-export.constants';
import type { ExportContext, ImportResult, PackageManifest } from './import-export.types';
import { ProjectExporter } from './project/project.exporter';
import { ProjectImporter } from './project/project.importer';
import { TarPackageReader } from './tar-package-reader';
import { TarPackageWriter } from './tar-package-writer';

@Service()
export class ImportExportService {
	constructor(
		private readonly projectService: ProjectService,
		private readonly projectExporter: ProjectExporter,
		private readonly projectImporter: ProjectImporter,
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

	async importPackage(buffer: Buffer, user: User): Promise<ImportResult> {
		const reader = await TarPackageReader.fromBuffer(buffer);

		const manifestJson = reader.readFile('manifest.json');
		const manifest = JSON.parse(manifestJson) as PackageManifest;

		if (manifest.formatVersion !== FORMAT_VERSION) {
			throw new BadRequestError(
				`Unsupported package format version "${manifest.formatVersion}" (expected "${FORMAT_VERSION}")`,
			);
		}

		return await this.projectImporter.import(manifest.projects, reader, user);
	}
}

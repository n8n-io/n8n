import { Service } from '@n8n/di';

import { ProjectPackageImporter } from './project-package-importer';
import { WorkflowPackageImporter } from './workflow-package-importer';
import { N8nPackageParser } from './n8n-package-parser';
import { TarPackageReader } from '../io/tar/tar-package-reader';
import { PackageImportConfig } from '../n8n-packages.config';
import type { ImportPackageRequest, ImportResult } from '../n8n-packages.types';
import type { PackageManifest } from '../spec/manifest.schema';

/**
 * Entry point for package import. Reads the manifest, decides the package shape, and delegates
 * to the matching importer — a **project package** (projects defined by the package) or a
 * **workflow package** (loose workflows + folders + credentials imported into a target project).
 */
@Service()
export class ImportPipeline {
	constructor(
		private readonly packageParser: N8nPackageParser,
		private readonly packageImportConfig: PackageImportConfig,
		private readonly projectPackageImporter: ProjectPackageImporter,
		private readonly workflowPackageImporter: WorkflowPackageImporter,
	) {}

	async run(request: ImportPackageRequest): Promise<ImportResult> {
		// A project package defines its own projects, so the request's target projectId/folderId
		// do not apply — that distinction is what selects the importer.
		const reader = new TarPackageReader(request.packageBuffer, this.packageImportConfig);
		const manifest = await this.packageParser.getManifest(reader);

		const importer = isProjectPackage(manifest)
			? this.projectPackageImporter
			: this.workflowPackageImporter;

		return await importer.import(request, reader, manifest);
	}
}

function isProjectPackage(manifest: PackageManifest): boolean {
	return (manifest.projects?.length ?? 0) > 0;
}

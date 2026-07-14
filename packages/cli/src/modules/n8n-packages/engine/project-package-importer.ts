import { Service } from '@n8n/di';

import { ProjectImporter } from '../entities/project/project-importer.js';
import type { PackageReader } from '../io/package-reader.js';
import { createBindings } from '../n8n-packages.types.js';
import type { ImportPackageRequest, ImportResult } from '../n8n-packages.types.js';
import {
	assertPackageImportApiKeyScopes,
	buildImportResult,
	toPackageSummary,
} from './import-result.js';
import { N8nPackageParser } from './n8n-package-parser.js';
import type { PackageManifest } from '../spec/manifest.schema.js';

/**
 * Imports a package containing projects into the target instance.
 **/
@Service()
export class ProjectPackageImporter {
	constructor(
		private readonly packageParser: N8nPackageParser,
		private readonly projectImporter: ProjectImporter,
	) {}

	async import(
		request: ImportPackageRequest,
		reader: PackageReader,
		manifest: PackageManifest,
	): Promise<ImportResult> {
		assertPackageImportApiKeyScopes(request.apiKeyScopes, ['project:create', 'project:update']);

		const projects = await this.packageParser.getProjects(reader);
		const plan = await this.projectImporter.plan(request.user, projects);
		const projectSummaries = await this.projectImporter.apply(request.user, plan);

		return buildImportResult({
			package: toPackageSummary(manifest),
			projectId: null,
			workflows: [],
			folders: [],
			projects: projectSummaries,
			bindings: createBindings(),
		});
	}
}

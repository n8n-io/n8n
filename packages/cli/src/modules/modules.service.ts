import { Service } from '@n8n/di';
import type { ModuleManifest } from '@n8n/sdk';
import { readFile } from 'fs/promises';
import { jsonParse } from 'n8n-workflow';

@Service()
export class ModulesService {
	private modules: string[] = ['cloud'];

	private loadedModuleManifests: ModuleManifest[] = [];

	async getModuleManifests(): Promise<ModuleManifest[]> {
		if (this.loadedModuleManifests.length > 0) {
			return this.loadedModuleManifests;
		}

		const moduleManifestPromises = await Promise.all(
			this.modules.map(async (m) => await readFile(require.resolve(m), 'utf-8')),
		);

		this.loadedModuleManifests = moduleManifestPromises.map((moduleManifestJson) =>
			jsonParse<ModuleManifest>(moduleManifestJson),
		);

		return this.loadedModuleManifests;
	}

	getModuleFrontendFile(name: string): string | undefined {
		const extension = this.loadedModuleManifests.find((m) => m.name === name);

		return extension ? require.resolve(`${name}/frontend`) : undefined;
	}
}

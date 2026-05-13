import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { PackageDirectoryLoader } from 'n8n-core';
import path from 'node:path';

@BackendModule({ name: 'harness', instanceTypes: ['main'] })
export class HarnessModule implements ModuleInterface {
	async nodeLoaders() {
		const packageJsonPath = require.resolve('@n8n/n8n-nodes-harness/package.json');
		const packageDir = path.dirname(packageJsonPath);

		return [new PackageDirectoryLoader(packageDir)];
	}
}

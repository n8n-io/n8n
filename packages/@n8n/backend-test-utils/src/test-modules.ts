import { ModuleRegistry } from '@n8n/backend-common';
import type { ModuleName } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import path from 'node:path';

export async function loadModules(moduleNames: ModuleName[]) {
	// In the monorepo source/test context there is no `node_modules/n8n`
	// self-symlink, so `ModuleRegistry.loadModules` cannot resolve the module
	// sources via `require.resolve('n8n/package.json')`. Import each `.module`
	// file directly from the package under test (`cwd`), which triggers the
	// `@BackendModule` decorator registration, then delegate to the registry
	// (with an empty list, so it skips its own import step) to perform the
	// entity/loader registration for the now-registered module classes.
	const modulesDir = path.join(process.cwd(), 'src', 'modules');
	for (const name of moduleNames) {
		try {
			await import(`${modulesDir}/${name}/${name}.module`);
		} catch {
			await import(`${modulesDir}/${name}.ee/${name}.module`);
		}
	}

	await Container.get(ModuleRegistry).loadModules([]);
}

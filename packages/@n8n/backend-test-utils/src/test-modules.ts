import { ModuleRegistry } from '@n8n/backend-common';
import type { ModuleName, PackagedModules } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import path from 'node:path';

const importCliModule = async (modulesDir: string, name: ModuleName) => {
	try {
		await import(`${modulesDir}/${name}/${name}.module`);
	} catch {
		await import(`${modulesDir}/${name}.ee/${name}.module`);
	}
};

export async function loadModules(
	moduleNames: ModuleName[],
	packagedModules: PackagedModules = {},
) {
	// In the monorepo source/test context there is no `node_modules/n8n`
	// self-symlink, so `ModuleRegistry.loadModules` cannot resolve the module
	// sources via `require.resolve('n8n/package.json')`. Register source import
	// thunks for CLI modules and use the supplied thunks for packaged modules.
	const modulesDir = path.join(process.cwd(), 'src', 'modules');
	const moduleImports: PackagedModules = { ...packagedModules };
	for (const name of moduleNames) {
		if (moduleImports[name] === undefined) {
			moduleImports[name] = async () => await importCliModule(modulesDir, name);
		}
	}

	const registry = Container.get(ModuleRegistry);
	registry.registerPackagedModules(moduleImports);
	await registry.loadModules(moduleNames);

	// Production marks modules active during `initModules`, which tests don't
	// run. Mark them active here so `isActive()` guards behave like production.
	const activeModules = registry.getActiveModules();
	for (const name of moduleNames) {
		if (!activeModules.includes(name)) activeModules.push(name);
	}
}

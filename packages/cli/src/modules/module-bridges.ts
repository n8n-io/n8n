import type { ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';

/**
 * Binds cli-provided implementations for the abstract DI tokens that
 * package-hosted modules declare but cannot implement themselves (they must not
 * import cli). Registered as pre-init hooks so each binding runs at the top of
 * `ModuleRegistry.initModules`, before any module's `init`.
 */
export function registerModuleBridges(moduleRegistry: ModuleRegistry) {
	moduleRegistry.registerPreInitHook(async () => {
		if (!moduleRegistry.eligibleModules.includes('data-table')) return;

		const { DataTableCliBridge } = await import('@n8n/data-table');
		const { DataTableCliBridgeImpl } = await import('./data-table/data-table-cli-bridge.impl');

		Container.set(DataTableCliBridge, Container.get(DataTableCliBridgeImpl));
	});
}

import { mockInstance, testModules } from '@n8n/backend-test-utils';
import { ModuleRegistry, type ModuleName, type PackagedModules } from '@n8n/backend-common';

describe('testModules.loadModules', () => {
	it('loads packaged and CLI modules in the requested order', async () => {
		const moduleImports: PackagedModules = {};
		const loadOrder: ModuleName[] = [];
		const activeModules: string[] = [];
		mockInstance(ModuleRegistry, {
			registerPackagedModules: (modules) => Object.assign(moduleImports, modules),
			loadModules: async (moduleNames = []) => {
				for (const name of moduleNames) {
					await moduleImports[name]?.();
					loadOrder.push(name);
				}
			},
			getActiveModules: () => activeModules,
		});
		const importPackagedModule = vi.fn().mockResolvedValue({});

		await testModules.loadModules(['insights', 'otel'], { insights: importPackagedModule });

		expect(importPackagedModule).toHaveBeenCalledTimes(1);
		expect(loadOrder).toEqual(['insights', 'otel']);
		expect(activeModules).toEqual(['insights', 'otel']);
	});
});

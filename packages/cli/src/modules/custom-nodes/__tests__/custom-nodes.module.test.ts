import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { CustomNodesNodeLoader } from '../custom-nodes-node-loader';
import { CustomNodesModule } from '../custom-nodes.module';
import { CustomNodesRegistry } from '../custom-nodes.registry';

vi.mock('../custom-nodes.controller', () => ({}));

describe('CustomNodesModule', () => {
	it('is not a default module', () => {
		expect(Container.get(ModuleRegistry).eligibleModules).not.toContain('custom-nodes');
	});

	it('runs on main, worker and webhook instances', () => {
		const entry = Container.get(ModuleMetadata)
			.getEntries()
			.find(([name]) => name === 'custom-nodes');

		expect(entry?.[1].instanceTypes).toEqual(['main', 'worker', 'webhook']);
	});

	it('init() loads the stored definitions without notifying editors or instances', async () => {
		const registry = mockInstance(CustomNodesRegistry);
		registry.refresh.mockResolvedValue(undefined);

		await new CustomNodesModule().init();

		expect(registry.refresh).toHaveBeenCalledTimes(1);
		expect(registry.refresh).toHaveBeenCalledWith({ notifyEditors: false, notifyInstances: false });
	});

	it('nodeLoaders() returns the custom nodes loader', async () => {
		mockInstance(Logger);

		const loaders = await new CustomNodesModule().nodeLoaders();

		expect(loaders).toHaveLength(1);
		expect(loaders[0]).toBeInstanceOf(CustomNodesNodeLoader);
		expect(loaders[0].packageName).toBe('n8n-custom');
	});
});

import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';

import { CustomNodesNodeLoader } from '../custom-nodes-node-loader';
import { CustomNodesModule } from '../custom-nodes.module';
import { CustomNodesRegistry } from '../custom-nodes.registry';
import { ParentActionsProvider } from '../parent-actions.provider';

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
		mockInstance(NodeTypes);
		mockInstance(LoadNodesAndCredentials);
		mockInstance(ParentActionsProvider);
		const registry = mockInstance(CustomNodesRegistry);
		registry.refresh.mockResolvedValue(undefined);

		await new CustomNodesModule().init();

		expect(registry.refresh).toHaveBeenCalledTimes(1);
		expect(registry.refresh).toHaveBeenCalledWith({ notifyEditors: false, notifyInstances: false });
	});

	it('init() sets the provider and registers one transform post-processor before the first refresh', async () => {
		const calls: string[] = [];
		const nodeTypes = mockInstance(NodeTypes);
		nodeTypes.setExtensionProvider.mockImplementation(() => {
			calls.push('setExtensionProvider');
		});
		const loadNodesAndCredentials = mockInstance(LoadNodesAndCredentials);
		loadNodesAndCredentials.addPostProcessor.mockImplementation(() => {
			calls.push('addPostProcessor');
		});
		const provider = mockInstance(ParentActionsProvider);
		const registry = mockInstance(CustomNodesRegistry);
		registry.refresh.mockImplementation(async () => {
			calls.push('refresh');
		});

		await new CustomNodesModule().init();

		expect(calls).toEqual(['setExtensionProvider', 'addPostProcessor', 'refresh']);
		expect(nodeTypes.setExtensionProvider).toHaveBeenCalledWith(provider);
		expect(loadNodesAndCredentials.addPostProcessor).toHaveBeenCalledTimes(1);
		const [postProcessor, options] = loadNodesAndCredentials.addPostProcessor.mock.calls[0];
		expect(options).toEqual({ phase: 'transform' });

		await postProcessor();
		expect(provider.transformTypes).toHaveBeenCalledTimes(1);
	});

	it('nodeLoaders() returns the custom nodes loader', async () => {
		mockInstance(Logger);

		const loaders = await new CustomNodesModule().nodeLoaders();

		expect(loaders).toHaveLength(1);
		expect(loaders[0]).toBeInstanceOf(CustomNodesNodeLoader);
		expect(loaders[0].packageName).toBe('n8n-custom');
	});
});

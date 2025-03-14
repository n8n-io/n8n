import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { ExecutionLifecycleHooks } from 'n8n-core';

import type { BaseN8nModule } from '../module';
import { ModuleRegistry, N8nModule } from '../module';

let moduleRegistry: ModuleRegistry;

beforeEach(() => {
	moduleRegistry = new ModuleRegistry();
});

describe('registerLifecycleHooks', () => {
	@N8nModule()
	class TestModule implements BaseN8nModule {
		registerLifecycleHooks() {}
	}

	test('is called when ModuleRegistry.registerLifecycleHooks is called', () => {
		// ARRANGE
		const hooks = mock<ExecutionLifecycleHooks>();
		const instance = Container.get(TestModule);
		jest.spyOn(instance, 'registerLifecycleHooks');

		// ACT
		moduleRegistry.registerLifecycleHooks(hooks);

		// ASSERT
		expect(instance.registerLifecycleHooks).toHaveBeenCalledTimes(1);
		expect(instance.registerLifecycleHooks).toHaveBeenCalledWith(hooks);
	});
});

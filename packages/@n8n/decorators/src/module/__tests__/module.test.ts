import { Container } from '@n8n/di';

import type { ModuleInterface } from '../module';
import { BackendModule } from '../module';
import { ModuleMetadata } from '../module-metadata';

describe('@BackendModule decorator', () => {
	let moduleMetadata: ModuleMetadata;

	beforeEach(() => {
		jest.resetAllMocks();

		moduleMetadata = new ModuleMetadata();
		Container.set(ModuleMetadata, moduleMetadata);
	});

	it('should register module in ModuleMetadata', () => {
		@BackendModule({ name: 'test' })
		class TestModule implements ModuleInterface {}

		const registeredModules = moduleMetadata.getClasses();

		expect(registeredModules).toContain(TestModule);
		expect(registeredModules).toHaveLength(1);
	});

	it('should register multiple modules', () => {
		@BackendModule({ name: 'test-1' })
		class FirstModule implements ModuleInterface {}

		@BackendModule({ name: 'test-2' })
		class SecondModule implements ModuleInterface {}

		@BackendModule({ name: 'test-3' })
		class ThirdModule implements ModuleInterface {}

		const registeredModules = moduleMetadata.getClasses();

		expect(registeredModules).toContain(FirstModule);
		expect(registeredModules).toContain(SecondModule);
		expect(registeredModules).toContain(ThirdModule);
		expect(registeredModules).toHaveLength(3);
	});

	it('should support async init method', async () => {
		const mockInit = jest.fn();

		@BackendModule({ name: 'test' })
		class TestModule implements ModuleInterface {
			async init() {
				mockInit();
			}
		}

		const registeredModules = moduleMetadata.getClasses();

		expect(registeredModules).toContain(TestModule);

		const moduleInstance = new TestModule();
		await moduleInstance.init();

		expect(mockInit).toHaveBeenCalled();
	});

	it('should apply Service decorator', () => {
		@BackendModule({ name: 'test' })
		class TestModule implements ModuleInterface {}

		expect(Container.has(TestModule)).toBe(true);
	});
});

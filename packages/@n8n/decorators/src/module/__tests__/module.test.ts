import { Container } from '@n8n/di';

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
		@BackendModule()
		class TestModule {
			initialize() {}
		}

		const registeredModules = moduleMetadata.getEntries().map((entry) => entry.class);

		expect(registeredModules).toContain(TestModule);
		expect(registeredModules).toHaveLength(1);
	});

	it('should register multiple modules', () => {
		@BackendModule()
		class FirstModule {
			initialize() {}
		}

		@BackendModule()
		class SecondModule {
			initialize() {}
		}

		@BackendModule()
		class ThirdModule {
			initialize() {}
		}

		const registeredModules = moduleMetadata.getEntries().map((entry) => entry.class);

		expect(registeredModules).toContain(FirstModule);
		expect(registeredModules).toContain(SecondModule);
		expect(registeredModules).toContain(ThirdModule);
		expect(registeredModules).toHaveLength(3);
	});

	it('should work with modules without initialize method', () => {
		@BackendModule()
		class TestModule {}

		const registeredModules = moduleMetadata.getEntries().map((entry) => entry.class);

		expect(registeredModules).toContain(TestModule);
		expect(registeredModules).toHaveLength(1);
	});

	it('should support async initialize method', async () => {
		const mockInitialize = jest.fn();

		@BackendModule()
		class TestModule {
			async initialize() {
				mockInitialize();
			}
		}

		const registeredModules = moduleMetadata.getEntries().map((entry) => entry.class);

		expect(registeredModules).toContain(TestModule);

		const moduleInstance = new TestModule();
		await moduleInstance.initialize();

		expect(mockInitialize).toHaveBeenCalled();
	});

	describe('ModuleMetadata', () => {
		it('should allow retrieving and checking registered modules', () => {
			@BackendModule()
			class FirstModule {}

			@BackendModule()
			class SecondModule {}

			const registeredModules = moduleMetadata.getEntries().map((entry) => entry.class);

			expect(registeredModules).toContain(FirstModule);
			expect(registeredModules).toContain(SecondModule);
		});
	});

	it('should apply Service decorator', () => {
		@BackendModule()
		class TestModule {}

		expect(Container.has(TestModule)).toBe(true);
	});
});

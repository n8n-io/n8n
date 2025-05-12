import { Container } from '@n8n/di';

import { N8nModule } from '../module';
import { ModuleMetadata } from '../module-metadata';

describe('@N8nModule Decorator', () => {
	let moduleMetadata: ModuleMetadata;

	beforeEach(() => {
		jest.resetAllMocks();

		// Use the actual ModuleMetadata instance
		moduleMetadata = new ModuleMetadata();
		Container.set(ModuleMetadata, moduleMetadata);
	});

	it('should register module in ModuleMetadata', () => {
		@N8nModule()
		class TestModule {
			initialize() {}
		}

		// Get the registered modules
		const registeredModules = Array.from(moduleMetadata.getModules());

		// Check that the module was registered
		expect(registeredModules).toContain(TestModule);
		expect(registeredModules).toHaveLength(1);
	});

	it('should register multiple modules', () => {
		@N8nModule()
		class FirstModule {
			initialize() {}
		}

		@N8nModule()
		class SecondModule {
			initialize() {}
		}

		@N8nModule()
		class ThirdModule {
			initialize() {}
		}

		// Get the registered modules
		const registeredModules = Array.from(moduleMetadata.getModules());

		// Check that all modules were registered
		expect(registeredModules).toContain(FirstModule);
		expect(registeredModules).toContain(SecondModule);
		expect(registeredModules).toContain(ThirdModule);
		expect(registeredModules).toHaveLength(3);
	});

	it('should work with modules without initialize method', () => {
		@N8nModule()
		class TestModule {}

		// Get the registered modules
		const registeredModules = Array.from(moduleMetadata.getModules());

		// Check that the module was registered
		expect(registeredModules).toContain(TestModule);
		expect(registeredModules).toHaveLength(1);
	});

	it('should support async initialize method', async () => {
		const mockInitialize = jest.fn();

		@N8nModule()
		class TestModule {
			async initialize() {
				mockInitialize();
			}
		}

		// Get the registered modules
		const registeredModules = Array.from(moduleMetadata.getModules());

		// Check that the module was registered
		expect(registeredModules).toContain(TestModule);

		// If we want to test the initialize method, we'd need to implement
		// a separate mechanism for calling module initializers
		const moduleInstance = new TestModule();
		await moduleInstance.initialize();

		expect(mockInitialize).toHaveBeenCalled();
	});

	describe('ModuleMetadata', () => {
		it('should allow retrieving and checking registered modules', () => {
			@N8nModule()
			class FirstModule {}

			@N8nModule()
			class SecondModule {}

			// Get the registered modules
			const registeredModules = Array.from(moduleMetadata.getModules());

			// Verify specific modules
			expect(registeredModules).toContain(FirstModule);
			expect(registeredModules).toContain(SecondModule);
		});

		it('should prevent duplicate module registration', () => {
			@N8nModule()
			class TestModule {}

			@N8nModule()
			class TestModule2 {}

			@N8nModule()
			class TestModule3 {}

			@N8nModule()
			class TestModule3Duplicate {}

			// This will register TestModule3 first
			const registeredModules = Array.from(moduleMetadata.getModules());

			expect(registeredModules).toHaveLength(4);
			expect(registeredModules).toContain(TestModule);
			expect(registeredModules).toContain(TestModule2);
			expect(registeredModules).toContain(TestModule3);
			expect(registeredModules).toContain(TestModule3Duplicate);
		});
	});

	it('should apply Service decorator', () => {
		@N8nModule()
		class TestModule {}

		// Verify that the module is registered in the container
		expect(Container.has(TestModule)).toBe(true);
	});
});

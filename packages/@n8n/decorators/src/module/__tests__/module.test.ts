import { Container } from '@n8n/di';

import { N8nModule } from '../module';
import { ModuleMetadata } from '../module-metadata';

describe('@N8nModule Decorator', () => {
	let moduleMetadata: ModuleMetadata;

	beforeEach(() => {
		jest.resetAllMocks();

		moduleMetadata = new ModuleMetadata();
		Container.set(ModuleMetadata, moduleMetadata);
	});

	it('should register module in ModuleMetadata', () => {
		@N8nModule()
		class TestModule {
			initialize() {}
		}

		const registeredModules = Array.from(moduleMetadata.getModules());

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

		const registeredModules = Array.from(moduleMetadata.getModules());

		expect(registeredModules).toContain(FirstModule);
		expect(registeredModules).toContain(SecondModule);
		expect(registeredModules).toContain(ThirdModule);
		expect(registeredModules).toHaveLength(3);
	});

	it('should work with modules without initialize method', () => {
		@N8nModule()
		class TestModule {}

		const registeredModules = Array.from(moduleMetadata.getModules());

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

		const registeredModules = Array.from(moduleMetadata.getModules());

		expect(registeredModules).toContain(TestModule);

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

			const registeredModules = Array.from(moduleMetadata.getModules());

			expect(registeredModules).toContain(FirstModule);
			expect(registeredModules).toContain(SecondModule);
		});
	});

	it('should apply Service decorator', () => {
		@N8nModule()
		class TestModule {}

		expect(Container.has(TestModule)).toBe(true);
	});
});

import { Container } from '@n8n/di';

import { Module } from '../module';
import { ModuleMetadata } from '../module-metadata';

describe('@Module decorator', () => {
	let moduleMetadata: ModuleMetadata;

	beforeEach(() => {
		jest.resetAllMocks();

		moduleMetadata = new ModuleMetadata();
		Container.set(ModuleMetadata, moduleMetadata);
	});

	it('should register module in ModuleMetadata', () => {
		@Module()
		class TestModule {
			initialize() {}
		}

		const registeredModules = Array.from(moduleMetadata.getModules());

		expect(registeredModules).toContain(TestModule);
		expect(registeredModules).toHaveLength(1);
	});

	it('should register multiple modules', () => {
		@Module()
		class FirstModule {
			initialize() {}
		}

		@Module()
		class SecondModule {
			initialize() {}
		}

		@Module()
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
		@Module()
		class TestModule {}

		const registeredModules = Array.from(moduleMetadata.getModules());

		expect(registeredModules).toContain(TestModule);
		expect(registeredModules).toHaveLength(1);
	});

	it('should support async initialize method', async () => {
		const mockInitialize = jest.fn();

		@Module()
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
			@Module()
			class FirstModule {}

			@Module()
			class SecondModule {}

			const registeredModules = Array.from(moduleMetadata.getModules());

			expect(registeredModules).toContain(FirstModule);
			expect(registeredModules).toContain(SecondModule);
		});
	});

	it('should apply Service decorator', () => {
		@Module()
		class TestModule {}

		expect(Container.has(TestModule)).toBe(true);
	});
});

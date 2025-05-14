import { Container } from '@n8n/di';

import { Module } from '../module';
import { ModuleAlreadyRegisteredError } from '../module-already-registered.error';
import { ModuleMetadata } from '../module-metadata';

describe('@Module Decorator', () => {
	let moduleMetadata: ModuleMetadata;

	beforeEach(() => {
		jest.resetAllMocks();

		moduleMetadata = new ModuleMetadata();
		Container.set(ModuleMetadata, moduleMetadata);
	});

	it('should register module in ModuleMetadata', () => {
		@Module('test')
		class TestModule {
			initialize() {}
		}

		const registeredModules = Array.from(moduleMetadata.getModules()).map(([_, cls]) => cls);

		expect(registeredModules).toContain(TestModule);
		expect(registeredModules).toHaveLength(1);
	});

	it('should register multiple modules', () => {
		@Module('first')
		class FirstModule {
			initialize() {}
		}

		@Module('second')
		class SecondModule {
			initialize() {}
		}

		@Module('third')
		class ThirdModule {
			initialize() {}
		}

		const registeredModules = Array.from(moduleMetadata.getModules()).map(([_, cls]) => cls);

		expect(registeredModules).toContain(FirstModule);
		expect(registeredModules).toContain(SecondModule);
		expect(registeredModules).toContain(ThirdModule);
		expect(registeredModules).toHaveLength(3);
	});

	it('should work with modules without initialize method', () => {
		@Module('test')
		class TestModule {}

		const registeredModules = Array.from(moduleMetadata.getModules()).map(([_, cls]) => cls);

		expect(registeredModules).toContain(TestModule);
		expect(registeredModules).toHaveLength(1);
	});

	it('should support async initialize method', async () => {
		const mockInitialize = jest.fn();

		@Module('test')
		class TestModule {
			async initialize() {
				mockInitialize();
			}
		}

		const registeredModules = Array.from(moduleMetadata.getModules()).map(([_, cls]) => cls);

		expect(registeredModules).toContain(TestModule);

		const moduleInstance = new TestModule();
		await moduleInstance.initialize();

		expect(mockInitialize).toHaveBeenCalled();
	});

	it('should allow retrieving and checking registered modules', () => {
		@Module('first')
		class FirstModule {}

		@Module('second')
		class SecondModule {}

		const registeredModules = Array.from(moduleMetadata.getModules()).map(([_, cls]) => cls);

		expect(registeredModules).toContain(FirstModule);
		expect(registeredModules).toContain(SecondModule);
	});

	it('should apply Service decorator', () => {
		@Module('test')
		class TestModule {}

		expect(Container.has(TestModule)).toBe(true);
	});

	it('should refuse to register a module if the name is already taken', () => {
		@Module('duplicate')
		class FirstModule {}

		expect(() => {
			@Module('duplicate')
			// @ts-expect-error Test
			class SecondModule {}
		}).toThrow(ModuleAlreadyRegisteredError);

		const registeredModules = Array.from(moduleMetadata.getModules()).map(([_, cls]) => cls);

		expect(registeredModules).toContain(FirstModule);
		expect(registeredModules).toHaveLength(1);
	});
});

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
		@BackendModule({ name: 'test' })
		class TestModule {
			init() {}
		}

		const registeredModules = moduleMetadata.getClasses();

		expect(registeredModules).toContain(TestModule);
		expect(registeredModules).toHaveLength(1);
	});

	it('should register multiple modules', () => {
		@BackendModule({ name: 'test' })
		class FirstModule {
			init() {}
		}

		@BackendModule({ name: 'test' })
		class SecondModule {
			init() {}
		}

		@BackendModule({ name: 'test' })
		class ThirdModule {
			init() {}
		}

		const registeredModules = moduleMetadata.getClasses();

		expect(registeredModules).toContain(FirstModule);
		expect(registeredModules).toContain(SecondModule);
		expect(registeredModules).toContain(ThirdModule);
		expect(registeredModules).toHaveLength(3);
	});

	it('should work with modules without init method', () => {
		@BackendModule({ name: 'test' })
		class TestModule {}

		const registeredModules = moduleMetadata.getClasses();

		expect(registeredModules).toContain(TestModule);
		expect(registeredModules).toHaveLength(1);
	});

	it('should support async init method', async () => {
		const mockinit = jest.fn();

		@BackendModule({ name: 'test' })
		class TestModule {
			async init() {
				mockinit();
			}
		}

		const registeredModules = moduleMetadata.getClasses();

		expect(registeredModules).toContain(TestModule);

		const moduleInstance = new TestModule();
		await moduleInstance.init();

		expect(mockinit).toHaveBeenCalled();
	});

	describe('ModuleMetadata', () => {
		it('should allow retrieving and checking registered modules', () => {
			@BackendModule({ name: 'test' })
			class FirstModule {}

			@BackendModule({ name: 'test' })
			class SecondModule {}

			const registeredModules = moduleMetadata.getClasses();

			expect(registeredModules).toContain(FirstModule);
			expect(registeredModules).toContain(SecondModule);
		});
	});

	it('should apply Service decorator', () => {
		@BackendModule({ name: 'test' })
		class TestModule {}

		expect(Container.has(TestModule)).toBe(true);
	});
});

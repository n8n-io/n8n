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

	it('should apply Service decorator', () => {
		@BackendModule({ name: 'test' })
		class TestModule implements ModuleInterface {}

		expect(Container.has(TestModule)).toBe(true);
	});

	it('stores the test name and licenseFlag flag in the metadata', () => {
		const name = 'test';
		const licenseFlag = 'feat:ldap';

		@BackendModule({ name, licenseFlag })
		class TestModule implements ModuleInterface {}

		const registeredModules = moduleMetadata.getEntries();

		expect(registeredModules).toHaveLength(1);
		const [moduleName, options] = registeredModules[0];
		expect(moduleName).toBe(name);
		expect(options.licenseFlag).toBe(licenseFlag);
		expect(options.class).toBe(TestModule);
	});
});

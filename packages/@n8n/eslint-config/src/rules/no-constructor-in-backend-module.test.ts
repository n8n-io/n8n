import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoConstructorInBackendModuleRule } from './no-constructor-in-backend-module.js';

const ruleTester = new RuleTester();

ruleTester.run('no-constructor-in-backend-module', NoConstructorInBackendModuleRule, {
	valid: [
		{
			code: `
@BackendModule({ name: 'test' })
export class TestModule {
	async init() {
		// initialization code
	}
}`,
		},
		{
			code: `
export class RegularClass {
	constructor() {
		// this is fine in regular classes
	}
}`,
		},
		{
			code: `
@SomeOtherDecorator()
export class OtherModule {
	constructor() {
		// this is fine with other decorators
	}
}`,
		},
	],
	invalid: [
		{
			code: `
@BackendModule({ name: 'test' })
export class TestModule {
	constructor() {
		// this should be removed
	}
}`,
			errors: [{ messageId: 'noConstructorInBackendModule' }],
			output: `
@BackendModule({ name: 'test' })
export class TestModule {
	
}`,
		},
		{
			code: `
@BackendModule({ name: 'insights' })
export class InsightsModule {
	constructor(private service: SomeService) {
		this.service = service;
	}
	
	async init() {
		// other code
	}
}`,
			errors: [{ messageId: 'noConstructorInBackendModule' }],
			output: `
@BackendModule({ name: 'insights' })
export class InsightsModule {
	
	
	async init() {
		// other code
	}
}`,
		},
	],
});

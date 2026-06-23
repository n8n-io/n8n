import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoRuntimeDependenciesRule } from './no-runtime-dependencies.js';

const ruleTester = new RuleTester();

ruleTester.run('no-runtime-dependencies', NoRuntimeDependenciesRule, {
	valid: [
		{
			name: 'no dependencies field',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0" }',
		},
		{
			name: 'empty dependencies object is allowed',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "dependencies": {} }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "dependencies": { "axios": "1.0.0" } }',
		},
		{
			name: 'nested "dependencies" key inside another field is allowed',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "config": { "dependencies": { "axios": "1.0.0" } } }',
		},
	],
	invalid: [
		{
			name: 'single runtime dependency is forbidden',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "dependencies": { "axios": "1.0.0" } }',
			errors: [{ messageId: 'runtimeDependenciesForbidden' }],
		},
		{
			name: 'multiple runtime dependencies are forbidden',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "dependencies": { "axios": "1.0.0", "lodash": "^4.0.0" } }',
			errors: [{ messageId: 'runtimeDependenciesForbidden' }],
		},
		{
			name: 'real-world package with bundled deps is forbidden',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-sinch", "dependencies": { "axios": "1.7.0", "fast-xml-parser": "4.4.0", "minimatch": "9.0.5" } }',
			errors: [{ messageId: 'runtimeDependenciesForbidden' }],
		},
	],
});

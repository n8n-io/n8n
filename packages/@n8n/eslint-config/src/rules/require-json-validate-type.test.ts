import { RuleTester } from '@typescript-eslint/rule-tester';

import { RequireJsonValidateTypeRule } from './require-json-validate-type.js';

const ruleTester = new RuleTester();

ruleTester.run('require-json-validate-type', RequireJsonValidateTypeRule, {
	valid: [
		{
			code: "const p = { displayName: 'Filter', name: 'filterJson', type: 'json', validateType: 'object', default: '' };",
		},
		{
			code: "const p = { displayName: 'Items', name: 'items', type: 'json', validateType: 'array', default: '[]' };",
		},
		{ code: "const p = { displayName: 'Name', name: 'name', type: 'string', default: '' };" },
		{ code: "const p = { type: 'json', 'validateType': 'object' };" },
		{ code: 'const p = { type: json };' },
	],
	invalid: [
		{
			code: "const p = { displayName: 'Filter', name: 'filterJson', type: 'json', default: '' };",
			errors: [{ messageId: 'missingValidateType', line: 1, column: 56 }],
		},
		{
			code: `const p = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	default: {},
	options: [{ displayName: 'Query', name: 'query', type: 'json', default: '{}' }],
};`,
			errors: [{ messageId: 'missingValidateType', line: 6 }],
		},
		{
			code: "const p = { 'type': 'json', [validateType]: 'object' };",
			errors: [{ messageId: 'missingValidateType' }],
		},
	],
});

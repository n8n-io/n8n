import { RuleTester } from '@typescript-eslint/rule-tester';

import { NodeParamConventionsRule } from './node-param-conventions.js';

const ruleTester = new RuleTester();

const validNodeFilePath = 'nodes/Github/Github.node.ts';
const nonNodeFilePath = 'nodes/Github/Github.ts';

ruleTester.run('node-param-conventions', NodeParamConventionsRule, {
	valid: [
		{
			name: 'valid options param with default and unique options',
			filename: validNodeFilePath,
			code: `
const param = {
    displayName: 'Resource',
    name: 'resource',
    type: 'options',
    default: 'issue',
    options: [
        { name: 'Issue', value: 'issue' },
        { name: 'Pull Request', value: 'pullRequest' },
    ],
};
`,
		},
		{
			name: 'non-.node.ts file is ignored even with violations',
			filename: nonNodeFilePath,
			code: `
const param = {
    name: 'resource',
    type: 'options',
    required: false,
    options: [
        { name: 'Issue', value: 'issue' },
        { name: 'Issue', value: 'issue' },
    ],
};
`,
		},
	],
	invalid: [
		{
			name: 'missing default',
			filename: validNodeFilePath,
			code: `
const param = {
    displayName: 'Resource',
    name: 'resource',
    type: 'options',
    options: [
        { name: 'Issue', value: 'issue' },
    ],
};
`,
			errors: [{ messageId: 'defaultMissing' }],
		},
		{
			name: 'required: false is redundant',
			filename: validNodeFilePath,
			code: `
const param = {
    displayName: 'Resource',
    name: 'resource',
    type: 'string',
    default: '',
    required: false,
};
`,
			errors: [{ messageId: 'requiredFalse' }],
		},
		{
			name: 'duplicate option name',
			filename: validNodeFilePath,
			code: `
const param = {
    displayName: 'Resource',
    name: 'resource',
    type: 'options',
    default: 'issue',
    options: [
        { name: 'Issue', value: 'issue' },
        { name: 'Issue', value: 'pullRequest' },
    ],
};
`,
			errors: [{ messageId: 'duplicateOptionName', data: { name: 'Issue' } }],
		},
		{
			name: 'duplicate option value',
			filename: validNodeFilePath,
			code: `
const param = {
    displayName: 'Resource',
    name: 'resource',
    type: 'options',
    default: 'issue',
    options: [
        { name: 'Issue', value: 'issue' },
        { name: 'Duplicate Issue', value: 'issue' },
    ],
};
`,
			errors: [{ messageId: 'duplicateOptionValue', data: { value: 'issue' } }],
		},
	],
});

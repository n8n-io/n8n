import { RuleTester } from '@typescript-eslint/rule-tester';

import { NodeExecuteBlockRule } from './node-execute-block.js';

const ruleTester = new RuleTester();

const nodeFilePath = 'nodes/Github/Github.node.ts';

ruleTester.run('node-execute-block', NodeExecuteBlockRule, {
	valid: [
		{
			name: 'NodeOperationError with itemIndex shorthand',
			filename: nodeFilePath,
			code: `throw new NodeOperationError(this.getNode(), 'Error message', { itemIndex });`,
		},
		{
			name: 'NodeOperationError with explicit itemIndex value',
			filename: nodeFilePath,
			code: `throw new NodeOperationError(this.getNode(), 'Error', { itemIndex: i });`,
		},
		{
			name: 'NodeApiError is not checked by this rule',
			filename: nodeFilePath,
			code: `throw new NodeApiError(this.getNode(), error);`,
		},
		{
			name: 'NodeOperationError in non-.node.ts file is ignored',
			filename: 'utils/helpers.ts',
			code: `throw new NodeOperationError(this.getNode(), 'Error message');`,
		},
	],
	invalid: [
		{
			name: 'NodeOperationError with no options at all',
			filename: nodeFilePath,
			code: `throw new NodeOperationError(this.getNode(), 'Error message');`,
			errors: [{ messageId: 'missingItemIndex' }],
		},
		{
			name: 'NodeOperationError with options object missing itemIndex',
			filename: nodeFilePath,
			code: `throw new NodeOperationError(this.getNode(), 'Error', { description: 'foo' });`,
			errors: [{ messageId: 'missingItemIndex' }],
		},
	],
});

import { RuleTester } from '@typescript-eslint/rule-tester';

import { N8nObjectValidationRule } from './n8n-object-validation.js';

const ruleTester = new RuleTester();

ruleTester.run('n8n-object-validation', N8nObjectValidationRule, {
	valid: [
		{
			name: 'minimal valid n8n object with one node path',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/nodes/Foo/Foo.node.js"] } }',
		},
		{
			name: 'valid n8n object with credentials',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/nodes/Foo/Foo.node.js"], "credentials": ["dist/credentials/Foo.credentials.js"] } }',
		},
		{
			name: 'empty credentials array is allowed',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/x.js"], "credentials": [] } }',
		},
		{
			name: 'higher integer api version is allowed',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 2, "nodes": ["dist/x.js"] } }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "n8n": null }',
		},
		{
			name: 'nested "n8n" key inside another field is allowed (only root is validated)',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/x.js"] }, "config": { "n8n": "ignored" } }',
		},
		{
			name: 'objects nested inside arrays are not treated as the package root',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/x.js"] }, "contributors": [{ "name": "Jane" }, { "name": "John" }] }',
		},
		{
			name: 'strict is true',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/x.js"], "strict": true } }',
		},
		{
			name: 'strict is false',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/x.js"], "strict": false } }',
		},
		{
			name: 'strict is omitted (optional field)',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/x.js"] } }',
		},
	],
	invalid: [
		{
			name: 'missing n8n object entirely',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0" }',
			errors: [{ messageId: 'missingN8nObject' }],
		},
		{
			name: 'n8n value is not an object',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": "not-an-object" }',
			errors: [{ messageId: 'missingN8nObject' }],
		},
		{
			name: 'missing n8nNodesApiVersion',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "nodes": ["dist/x.js"] } }',
			errors: [{ messageId: 'missingNodesApiVersion' }],
		},
		{
			name: 'n8nNodesApiVersion is a string',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": "1", "nodes": ["dist/x.js"] } }',
			errors: [{ messageId: 'invalidNodesApiVersion', data: { value: '1' } }],
		},
		{
			name: 'n8nNodesApiVersion is zero',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 0, "nodes": ["dist/x.js"] } }',
			errors: [{ messageId: 'invalidNodesApiVersion', data: { value: '0' } }],
		},
		{
			name: 'n8nNodesApiVersion is a float',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1.5, "nodes": ["dist/x.js"] } }',
			errors: [{ messageId: 'invalidNodesApiVersion', data: { value: '1.5' } }],
		},
		{
			name: 'n8nNodesApiVersion is negative',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": -1, "nodes": ["dist/x.js"] } }',
			errors: [{ messageId: 'invalidNodesApiVersion' }],
		},
		{
			name: 'n8nNodesApiVersion at root level instead of inside n8n',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8nNodesApiVersion": 1, "n8n": { "nodes": ["dist/x.js"] } }',
			errors: [{ messageId: 'wrongLocationApiVersion' }, { messageId: 'missingNodesApiVersion' }],
		},
		{
			name: 'missing nodes array',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1 } }',
			errors: [{ messageId: 'missingN8nNodes' }],
		},
		{
			name: 'nodes is not an array',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": "dist/x.js" } }',
			errors: [{ messageId: 'n8nNodesNotArray' }],
		},
		{
			name: 'nodes is empty array',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": [] } }',
			errors: [{ messageId: 'emptyN8nNodes' }],
		},
		{
			name: 'node path does not start with dist/',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["nodes/Foo/Foo.node.js"] } }',
			errors: [{ messageId: 'nodePathNotInDist', data: { path: 'nodes/Foo/Foo.node.js' } }],
		},
		{
			name: 'node path uses ./dist/ prefix instead of dist/',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["./dist/x.js"] } }',
			errors: [{ messageId: 'nodePathNotInDist', data: { path: './dist/x.js' } }],
		},
		{
			name: 'node path with wrong casing',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["DIST/x.js"] } }',
			errors: [{ messageId: 'nodePathNotInDist', data: { path: 'DIST/x.js' } }],
		},
		{
			name: 'node path is not a string',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": [123] } }',
			errors: [{ messageId: 'nodePathNotString' }],
		},
		{
			name: 'multiple bad node paths each report',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/ok.js", "bad/one.js", "./dist/two.js"] } }',
			errors: [
				{ messageId: 'nodePathNotInDist', data: { path: 'bad/one.js' } },
				{ messageId: 'nodePathNotInDist', data: { path: './dist/two.js' } },
			],
		},
		{
			name: 'credentials is not an array',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/x.js"], "credentials": "dist/c.js" } }',
			errors: [{ messageId: 'n8nCredentialsNotArray' }],
		},
		{
			name: 'credential path does not start with dist/',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/x.js"], "credentials": ["credentials/Foo.credentials.js"] } }',
			errors: [
				{
					messageId: 'credentialPathNotInDist',
					data: { path: 'credentials/Foo.credentials.js' },
				},
			],
		},
		{
			name: 'credential path is not a string',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/x.js"], "credentials": [true] } }',
			errors: [{ messageId: 'credentialPathNotString' }],
		},
		{
			name: 'strict is a string',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/x.js"], "strict": "true" } }',
			errors: [{ messageId: 'invalidStrict', data: { value: 'true' } }],
		},
		{
			name: 'strict is a number',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/x.js"], "strict": 1 } }',
			errors: [{ messageId: 'invalidStrict', data: { value: '1' } }],
		},
		{
			name: 'strict is null',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "n8nNodesApiVersion": 1, "nodes": ["dist/x.js"], "strict": null } }',
			errors: [{ messageId: 'invalidStrict', data: { value: 'null' } }],
		},
	],
});

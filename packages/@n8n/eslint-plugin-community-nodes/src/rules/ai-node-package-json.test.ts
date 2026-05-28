import { RuleTester } from '@typescript-eslint/rule-tester';

import { AiNodePackageJsonRule } from './ai-node-package-json.js';

const ruleTester = new RuleTester();

ruleTester.run('ai-node-package-json', AiNodePackageJsonRule, {
	valid: [
		{
			name: 'both n8n.aiNodeSdkVersion and ai-node-sdk peer dependency present',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "aiNodeSdkVersion": 1 }, "peerDependencies": { "n8n-workflow": "*", "ai-node-sdk": "*" } }',
		},
		{
			name: 'neither n8n.aiNodeSdkVersion nor ai-node-sdk present (non-AI package)',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0" }',
		},
		{
			name: 'n8n section without aiNodeSdkVersion and no ai-node-sdk peer dep',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "nodes": [] } }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "n8n": { "aiNodeSdkVersion": 1 } }',
		},
		{
			name: 'peerDependencies without ai-node-sdk and no aiNodeSdkVersion',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "nodes": [] }, "peerDependencies": { "n8n-workflow": "*" } }',
		},
		{
			name: 'aiNodeSdkVersion as a larger positive integer with multiple peer deps',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "aiNodeSdkVersion": 42 }, "peerDependencies": { "n8n-workflow": "^1.0.0", "ai-node-sdk": "^1.0.0" } }',
		},
	],
	invalid: [
		{
			name: 'n8n.aiNodeSdkVersion present but ai-node-sdk missing from peerDependencies',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "aiNodeSdkVersion": 1 } }',
			errors: [{ messageId: 'missingPeerDep' }],
		},
		{
			name: 'n8n.aiNodeSdkVersion present but peerDependencies has other deps only',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "aiNodeSdkVersion": 1 }, "peerDependencies": { "n8n-workflow": "*" } }',
			errors: [{ messageId: 'missingPeerDep' }],
		},
		{
			name: 'ai-node-sdk in peerDependencies but n8n.aiNodeSdkVersion missing',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "nodes": [] }, "peerDependencies": { "n8n-workflow": "*", "ai-node-sdk": "*" } }',
			errors: [{ messageId: 'missingSdkVersion' }],
		},
		{
			name: 'ai-node-sdk in peerDependencies but no n8n section at all',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": "*", "ai-node-sdk": "*" } }',
			errors: [{ messageId: 'missingSdkVersion' }],
		},
		{
			name: 'n8n.aiNodeSdkVersion is a string instead of integer',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "aiNodeSdkVersion": "1" }, "peerDependencies": { "ai-node-sdk": "*" } }',
			errors: [{ messageId: 'invalidSdkVersion', data: { value: '1' } }],
		},
		{
			name: 'n8n.aiNodeSdkVersion is zero',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "aiNodeSdkVersion": 0 }, "peerDependencies": { "ai-node-sdk": "*" } }',
			errors: [{ messageId: 'invalidSdkVersion', data: { value: '0' } }],
		},
		{
			name: 'n8n.aiNodeSdkVersion is negative (parsed as UnaryExpression, not Literal)',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "aiNodeSdkVersion": -1 }, "peerDependencies": { "ai-node-sdk": "*" } }',
			errors: [{ messageId: 'invalidSdkVersion', data: { value: 'non-literal' } }],
		},
		{
			name: 'n8n.aiNodeSdkVersion is a float',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "aiNodeSdkVersion": 1.5 }, "peerDependencies": { "ai-node-sdk": "*" } }',
			errors: [{ messageId: 'invalidSdkVersion', data: { value: '1.5' } }],
		},
		{
			name: 'n8n.aiNodeSdkVersion is invalid and ai-node-sdk peer dep is missing (two errors)',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "n8n": { "aiNodeSdkVersion": "bad" } }',
			errors: [
				{ messageId: 'invalidSdkVersion', data: { value: 'bad' } },
				{ messageId: 'missingPeerDep' },
			],
		},
		{
			name: 'aiNodeSdkVersion at root level instead of inside n8n section',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "aiNodeSdkVersion": 1, "peerDependencies": { "ai-node-sdk": "*" } }',
			errors: [{ messageId: 'wrongLocation' }, { messageId: 'missingSdkVersion' }],
		},
		{
			name: 'aiNodeSdkVersion at root level without peer dep',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "aiNodeSdkVersion": 1 }',
			errors: [{ messageId: 'wrongLocation' }],
		},
	],
});

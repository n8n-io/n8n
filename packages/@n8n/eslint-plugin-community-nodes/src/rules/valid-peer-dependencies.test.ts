import { RuleTester } from '@typescript-eslint/rule-tester';

import { ValidPeerDependenciesRule } from './valid-peer-dependencies.js';

const ruleTester = new RuleTester();

ruleTester.run('valid-peer-dependencies', ValidPeerDependenciesRule, {
	valid: [
		{
			name: 'only n8n-workflow with "*"',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": "*" } }',
		},
		{
			name: 'n8n-workflow and ai-node-sdk',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": "*", "ai-node-sdk": "*" } }',
		},
		{
			name: 'n8n-workflow and ai-node-sdk with a version range (ai-node-sdk shape is checked by ai-node-package-json rule)',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": "*", "ai-node-sdk": "^1.0.0" } }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "peerDependencies": { "n8n-core": "*" } }',
		},
		{
			name: 'nested objects are not checked',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": "*" }, "config": { "peerDependencies": { "n8n-core": "*" } } }',
		},
	],
	invalid: [
		{
			name: 'missing peerDependencies section entirely',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0" }',
			output:
				'{ "name": "n8n-nodes-example", "version": "1.0.0", "peerDependencies": { "n8n-workflow": "*" } }',
			errors: [{ messageId: 'missingPeerDependencies' }],
		},
		{
			name: 'empty peerDependencies section',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": {} }',
			output: '{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": "*" } }',
			errors: [{ messageId: 'missingN8nWorkflow' }],
		},
		{
			name: 'peerDependencies missing n8n-workflow but has ai-node-sdk',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": { "ai-node-sdk": "*" } }',
			output:
				'{ "name": "n8n-nodes-example", "peerDependencies": { "ai-node-sdk": "*", "n8n-workflow": "*" } }',
			errors: [{ messageId: 'missingN8nWorkflow' }],
		},
		{
			name: 'n8n-workflow pinned to a specific version',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": "^1.0.0" } }',
			output: '{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": "*" } }',
			errors: [{ messageId: 'pinnedN8nWorkflow', data: { value: '"^1.0.0"' } }],
		},
		{
			name: 'forbidden n8n-core peer dependency (CNOC-404 Sinch)',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": "*", "n8n-core": "*" } }',
			errors: [{ messageId: 'forbiddenPeerDependency', data: { name: 'n8n-core' } }],
		},
		{
			name: 'forbidden arbitrary peer dependency',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": "*", "lodash": "^4.0.0" } }',
			errors: [{ messageId: 'forbiddenPeerDependency', data: { name: 'lodash' } }],
		},
		{
			name: 'multiple forbidden peer dependencies reported separately',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": "*", "n8n-core": "*", "axios": "^1.0.0" } }',
			errors: [
				{ messageId: 'forbiddenPeerDependency', data: { name: 'n8n-core' } },
				{ messageId: 'forbiddenPeerDependency', data: { name: 'axios' } },
			],
		},
		{
			name: 'completely empty package.json gets peerDependencies inserted',
			filename: 'package.json',
			code: '{}',
			output: '{ "peerDependencies": { "n8n-workflow": "*" } }',
			errors: [{ messageId: 'missingPeerDependencies' }],
		},
		{
			name: 'n8n-workflow value is a non-literal (object) — not auto-fixable',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": { "version": "*" } } }',
			errors: [{ messageId: 'pinnedN8nWorkflow', data: { value: 'non-literal' } }],
		},
		{
			name: 'peerDependencies is a string instead of an object',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": "n8n-workflow" }',
			errors: [{ messageId: 'invalidPeerDependenciesType' }],
		},
		{
			name: 'peerDependencies is an array instead of an object',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": ["n8n-workflow"] }',
			errors: [{ messageId: 'invalidPeerDependenciesType' }],
		},
		{
			name: 'peerDependencies is null',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": null }',
			errors: [{ messageId: 'invalidPeerDependenciesType' }],
		},
		{
			name: 'pinned n8n-workflow combined with forbidden entry',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": "1.0.0", "n8n-core": "*" } }',
			output:
				'{ "name": "n8n-nodes-example", "peerDependencies": { "n8n-workflow": "*", "n8n-core": "*" } }',
			errors: [
				{ messageId: 'pinnedN8nWorkflow', data: { value: '"1.0.0"' } },
				{ messageId: 'forbiddenPeerDependency', data: { name: 'n8n-core' } },
			],
		},
	],
});

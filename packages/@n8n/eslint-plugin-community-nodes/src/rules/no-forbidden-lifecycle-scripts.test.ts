import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoForbiddenLifecycleScriptsRule } from './no-forbidden-lifecycle-scripts.js';

const ruleTester = new RuleTester();

ruleTester.run('no-forbidden-lifecycle-scripts', NoForbiddenLifecycleScriptsRule, {
	valid: [
		{
			name: 'no scripts field',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "version": "1.0.0" }',
		},
		{
			name: 'only safe scripts',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "scripts": { "build": "tsc", "test": "jest", "dev": "nodemon" } }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "scripts": { "prepare": "npm run build" } }',
		},
		{
			name: 'empty scripts object',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "scripts": {} }',
		},
	],
	invalid: [
		{
			name: 'prepare script is forbidden',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "scripts": { "prepare": "npm run build" } }',
			errors: [{ messageId: 'forbiddenScript', data: { scriptName: 'prepare' } }],
		},
		{
			name: 'preinstall script is forbidden',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "scripts": { "preinstall": "node setup.js" } }',
			errors: [{ messageId: 'forbiddenScript', data: { scriptName: 'preinstall' } }],
		},
		{
			name: 'install script is forbidden',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "scripts": { "install": "node install.js" } }',
			errors: [{ messageId: 'forbiddenScript', data: { scriptName: 'install' } }],
		},
		{
			name: 'postinstall script is forbidden',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "scripts": { "postinstall": "node setup.js" } }',
			errors: [{ messageId: 'forbiddenScript', data: { scriptName: 'postinstall' } }],
		},
		{
			name: 'prepublish script is forbidden',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "scripts": { "prepublish": "npm run build" } }',
			errors: [{ messageId: 'forbiddenScript', data: { scriptName: 'prepublish' } }],
		},
		{
			name: 'preprepare script is forbidden',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "scripts": { "preprepare": "echo prep" } }',
			errors: [{ messageId: 'forbiddenScript', data: { scriptName: 'preprepare' } }],
		},
		{
			name: 'postprepare script is forbidden',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "scripts": { "postprepare": "echo done" } }',
			errors: [{ messageId: 'forbiddenScript', data: { scriptName: 'postprepare' } }],
		},
		{
			name: 'multiple forbidden scripts report separate errors',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "scripts": { "prepare": "npm run build", "postinstall": "node setup.js" } }',
			errors: [
				{ messageId: 'forbiddenScript', data: { scriptName: 'prepare' } },
				{ messageId: 'forbiddenScript', data: { scriptName: 'postinstall' } },
			],
		},
		{
			name: 'mix of allowed and forbidden scripts — only forbidden reported',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "scripts": { "build": "tsc", "prepare": "npm run build", "test": "jest" } }',
			errors: [{ messageId: 'forbiddenScript', data: { scriptName: 'prepare' } }],
		},
		{
			name: 'all seven forbidden scripts present',
			filename: 'package.json',
			code: '{ "name": "n8n-nodes-example", "scripts": { "prepare": "a", "preinstall": "b", "install": "c", "postinstall": "d", "prepublish": "e", "preprepare": "f", "postprepare": "g" } }',
			errors: [
				{ messageId: 'forbiddenScript', data: { scriptName: 'prepare' } },
				{ messageId: 'forbiddenScript', data: { scriptName: 'preinstall' } },
				{ messageId: 'forbiddenScript', data: { scriptName: 'install' } },
				{ messageId: 'forbiddenScript', data: { scriptName: 'postinstall' } },
				{ messageId: 'forbiddenScript', data: { scriptName: 'prepublish' } },
				{ messageId: 'forbiddenScript', data: { scriptName: 'preprepare' } },
				{ messageId: 'forbiddenScript', data: { scriptName: 'postprepare' } },
			],
		},
	],
});

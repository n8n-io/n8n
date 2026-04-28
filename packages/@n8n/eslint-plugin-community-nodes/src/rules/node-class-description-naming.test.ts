import { RuleTester } from '@typescript-eslint/rule-tester';

import { NodeClassDescriptionNamingRule } from './node-class-description-naming.js';

const ruleTester = new RuleTester();

const nodeFilePath = 'nodes/Github/Github.node.ts';

function nodeClass(fields: string): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class Github implements INodeType {
	description: INodeTypeDescription = {
		${fields}
	};
}`;
}

ruleTester.run('node-class-description-naming', NodeClassDescriptionNamingRule, {
	valid: [
		{
			name: 'valid node class description',
			filename: nodeFilePath,
			code: nodeClass(`
				name: 'github',
				displayName: 'GitHub',
				description: 'Interact with GitHub API',
				credentials: [{ name: 'githubApi' }],
				color: '#fff',
			`),
		},
		{
			name: 'non-.node.ts file is ignored',
			filename: 'nodes/Github/Github.ts',
			code: nodeClass(`
				name: 'GitHub',
				description: '',
				credentials: [{ name: 'github' }],
				color: '#FF6D5A',
			`),
		},
		{
			name: 'no credentials property is valid',
			filename: nodeFilePath,
			code: nodeClass(`
				name: 'github',
				displayName: 'GitHub',
				description: 'Interact with GitHub API',
			`),
		},
		{
			name: 'multiple valid credentials',
			filename: nodeFilePath,
			code: nodeClass(`
				name: 'github',
				description: 'Interact with GitHub API',
				credentials: [{ name: 'githubApi' }, { name: 'githubOAuth2Api' }],
			`),
		},
	],
	invalid: [
		{
			name: 'name is not camelCase',
			filename: nodeFilePath,
			code: nodeClass(`
				name: 'GitHub',
				description: 'Interact with GitHub API',
			`),
			errors: [{ messageId: 'nameMustBeCamelCase', data: { name: 'GitHub' } }],
		},
		{
			name: 'description is empty string',
			filename: nodeFilePath,
			code: nodeClass(`
				name: 'github',
				description: '',
			`),
			errors: [{ messageId: 'descriptionEmpty' }],
		},
		{
			name: 'credential name not suffixed with Api',
			filename: nodeFilePath,
			code: nodeClass(`
				name: 'github',
				description: 'Interact with GitHub API',
				credentials: [{ name: 'github' }],
			`),
			errors: [{ messageId: 'credentialNameUnsuffixed', data: { name: 'github' } }],
		},
		{
			name: 'color is n8n core color',
			filename: nodeFilePath,
			code: nodeClass(`
				name: 'github',
				description: 'Interact with GitHub API',
				color: '#FF6D5A',
			`),
			errors: [{ messageId: 'coreColorPresent', data: { color: '#FF6D5A' } }],
		},
		{
			name: 'color is n8n core color lowercase',
			filename: nodeFilePath,
			code: nodeClass(`
				name: 'github',
				description: 'Interact with GitHub API',
				color: '#ff6d5a',
			`),
			errors: [{ messageId: 'coreColorPresent', data: { color: '#ff6d5a' } }],
		},
		{
			name: 'multiple violations',
			filename: nodeFilePath,
			code: nodeClass(`
				name: 'GitHub',
				description: '',
				credentials: [{ name: 'github' }],
				color: '#FF6D5A',
			`),
			errors: [
				{ messageId: 'nameMustBeCamelCase' },
				{ messageId: 'descriptionEmpty' },
				{ messageId: 'credentialNameUnsuffixed' },
				{ messageId: 'coreColorPresent' },
			],
		},
	],
});

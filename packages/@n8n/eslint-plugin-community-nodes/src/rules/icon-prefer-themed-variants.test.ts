import { RuleTester } from '@typescript-eslint/rule-tester';

import { IconPreferThemedVariantsRule } from './icon-prefer-themed-variants.js';

const ruleTester = new RuleTester();

const nodeFilePath = '/tmp/TestNode.node.ts';
const credentialFilePath = '/tmp/TestCredential.credentials.ts';

function createNodeCode(icon?: string | { light: string; dark: string }): string {
	let iconProperty = '';
	if (icon) {
		if (typeof icon === 'string') {
			iconProperty = `icon: '${icon}',`;
		} else {
			iconProperty = `icon: {
			light: '${icon.light}',
			dark: '${icon.dark}'
		},`;
		}
	}

	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		${iconProperty}
		group: ['input'],
		version: 1,
		description: 'A test node',
		defaults: {
			name: 'Test Node',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};
}`;
}

function createCredentialCode(icon?: string | { light: string; dark: string }): string {
	let iconProperty = '';
	if (icon) {
		if (typeof icon === 'string') {
			iconProperty = `icon = '${icon}';`;
		} else {
			iconProperty = `icon = {
		light: '${icon.light}',
		dark: '${icon.dark}'
	};`;
		}
	}

	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TestCredential implements ICredentialType {
	name = 'testApi';
	displayName = 'Test API';
	${iconProperty}
	properties: INodeProperties[] = [];
}`;
}

function createNonNodeClass(icon: string): string {
	return `
export class NotANode {
	icon = '${icon}';
}`;
}

ruleTester.run('icon-prefer-themed-variants', IconPreferThemedVariantsRule, {
	valid: [
		{
			name: 'non-node class ignored',
			filename: nodeFilePath,
			code: createNonNodeClass('file:icon.svg'),
		},
		{
			name: 'non-node file ignored',
			filename: '/tmp/regular-file.ts',
			code: createNodeCode('file:icon.svg'),
		},
		{
			name: 'node with no icon property ignored',
			filename: nodeFilePath,
			code: createNodeCode(),
		},
		{
			name: 'node with themed light/dark icons',
			filename: nodeFilePath,
			code: createNodeCode({
				light: 'file:icons/icon.light.svg',
				dark: 'file:icons/icon.dark.svg',
			}),
		},
		{
			name: 'credential with no icon property ignored',
			filename: credentialFilePath,
			code: createCredentialCode(),
		},
		{
			name: 'credential with themed light/dark icons',
			filename: credentialFilePath,
			code: createCredentialCode({
				light: 'file:icons/icon.light.svg',
				dark: 'file:icons/icon.dark.svg',
			}),
		},
	],
	invalid: [
		{
			name: 'node with single string icon',
			filename: nodeFilePath,
			code: createNodeCode('file:icons/icon.svg'),
			errors: [{ messageId: 'missingThemedVariants' }],
		},
		{
			name: 'credential with single string icon',
			filename: credentialFilePath,
			code: createCredentialCode('file:icons/icon.svg'),
			errors: [{ messageId: 'missingThemedVariants' }],
		},
	],
});

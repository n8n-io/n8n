import { RuleTester } from '@typescript-eslint/rule-tester';
import * as fs from 'node:fs';
import { vi } from 'vitest';

import { IconContrastRule } from './icon-contrast.js';

const ruleTester = new RuleTester();

vi.mock('node:fs', () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
}));

const svgFiles: Record<string, string> = {
	'black.svg': '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>',
	'white.svg': '<svg viewBox="0 0 24 24"><path fill="#fff" d="M0 0h24v24H0z"/></svg>',
	'badge.svg': '<svg viewBox="0 0 24 24"><rect fill="#1a73e8"/><path fill="#fff"/></svg>',
	'current.svg': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0z"/></svg>',
	'teal.svg': '<svg viewBox="0 0 24 24"><circle fill="#18d4b2" r="12"/></svg>',
};

vi.mocked(fs.existsSync).mockImplementation((path) => {
	const name = path.toString().split('/').pop() ?? '';
	return name in svgFiles;
});
vi.mocked(fs.readFileSync).mockImplementation((path) => {
	const name = path.toString().split('/').pop() ?? '';
	return svgFiles[name] ?? '';
});

const nodeFilePath = '/tmp/TestNode.node.ts';
const credentialFilePath = '/tmp/TestCredential.credentials.ts';

function createNodeCode(icon?: string | { light: string; dark: string }): string {
	let iconProperty = '';
	if (typeof icon === 'string') {
		iconProperty = `icon: '${icon}',`;
	} else if (icon) {
		iconProperty = `icon: { light: '${icon.light}', dark: '${icon.dark}' },`;
	}

	return `
import type { INodeType } from 'n8n-workflow';

export class TestNode implements INodeType {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		${iconProperty}
		group: ['input'],
		version: 1,
		description: 'A test node',
		defaults: { name: 'Test Node' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};
}`;
}

function createCredentialCode(icon: string): string {
	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TestCredential implements ICredentialType {
	name = 'testApi';
	displayName = 'Test API';
	icon = '${icon}';
	properties: INodeProperties[] = [];
}`;
}

ruleTester.run('icon-contrast', IconContrastRule, {
	valid: [
		{
			name: 'class that does not implement INodeType',
			code: "export class NotANode { description = { icon: 'file:icons/black.svg' }; }",
			filename: nodeFilePath,
		},
		{
			name: 'node file outside .node.ts is skipped',
			code: createNodeCode('file:icons/black.svg'),
			filename: '/tmp/helper.ts',
		},
		{
			name: 'node without an icon',
			code: createNodeCode(),
			filename: nodeFilePath,
		},
		{
			name: 'single icon that works on both themes',
			code: createNodeCode('file:icons/badge.svg'),
			filename: nodeFilePath,
		},
		{
			name: 'themed variants that each suit their theme',
			code: createNodeCode({ light: 'file:icons/black.svg', dark: 'file:icons/white.svg' }),
			filename: nodeFilePath,
		},
		{
			name: 'icon using currentColor cannot be judged',
			code: createNodeCode('file:icons/current.svg'),
			filename: nodeFilePath,
		},
		{
			name: 'missing icon file is left to icon-validation',
			code: createNodeCode('file:icons/missing.svg'),
			filename: nodeFilePath,
		},
		{
			name: 'png icon is not analysed',
			code: createNodeCode('file:icons/black.png'),
			filename: nodeFilePath,
		},
		{
			name: 'icon without file: protocol is left to icon-validation',
			code: createNodeCode('icons/black.svg'),
			filename: nodeFilePath,
		},
		{
			name: 'light brand color passes the default minimum',
			code: createNodeCode('file:icons/teal.svg'),
			filename: nodeFilePath,
		},
		{
			name: 'credential icon that works on both themes',
			code: createCredentialCode('file:icons/badge.svg'),
			filename: credentialFilePath,
		},
	],
	invalid: [
		{
			name: 'single black icon fails on the dark theme',
			code: createNodeCode('file:icons/black.svg'),
			filename: nodeFilePath,
			errors: [
				{
					messageId: 'lowContrast',
					data: { iconPath: 'icons/black.svg', ratio: '1.4', theme: 'dark', minimum: 1.5 },
				},
			],
		},
		{
			name: 'single white icon fails on the light theme',
			code: createNodeCode('file:icons/white.svg'),
			filename: nodeFilePath,
			errors: [
				{
					messageId: 'lowContrast',
					data: { iconPath: 'icons/white.svg', ratio: '1.0', theme: 'light', minimum: 1.5 },
				},
			],
		},
		{
			name: 'themed variants that are swapped fail on both themes',
			code: createNodeCode({ light: 'file:icons/white.svg', dark: 'file:icons/black.svg' }),
			filename: nodeFilePath,
			errors: [
				{
					messageId: 'lowContrast',
					data: { iconPath: 'icons/white.svg', ratio: '1.0', theme: 'light', minimum: 1.5 },
				},
				{
					messageId: 'lowContrast',
					data: { iconPath: 'icons/black.svg', ratio: '1.4', theme: 'dark', minimum: 1.5 },
				},
			],
		},
		{
			name: 'same black file in both slots fails on the dark theme only',
			code: createNodeCode({ light: 'file:icons/black.svg', dark: 'file:icons/black.svg' }),
			filename: nodeFilePath,
			errors: [
				{
					messageId: 'lowContrast',
					data: { iconPath: 'icons/black.svg', ratio: '1.4', theme: 'dark', minimum: 1.5 },
				},
			],
		},
		{
			name: 'light brand color fails a stricter minimum',
			code: createNodeCode('file:icons/teal.svg'),
			filename: nodeFilePath,
			options: [{ minimum: 3 }],
			errors: [
				{
					messageId: 'lowContrast',
					data: { iconPath: 'icons/teal.svg', ratio: '1.9', theme: 'light', minimum: 3 },
				},
			],
		},
		{
			name: 'credential black icon fails on the dark theme',
			code: createCredentialCode('file:icons/black.svg'),
			filename: credentialFilePath,
			errors: [
				{
					messageId: 'lowContrast',
					data: { iconPath: 'icons/black.svg', ratio: '1.4', theme: 'dark', minimum: 1.5 },
				},
			],
		},
	],
});

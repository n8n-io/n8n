import { Resvg } from '@resvg/resvg-js';
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as fs from 'node:fs';
import { basename } from 'node:path';
import { vi } from 'vitest';

import { IconContrastRule } from './icon-contrast.js';

vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs')>();
	return { ...actual, readFileSync: vi.fn() };
});

const svgFiles: Record<string, string> = {
	// A mid gray: visible at the default minimum, too faint for 3:1 on the light theme.
	'gray.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#999" d="M0 0h24v24H0z"/></svg>',
	'black.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>',
	'white.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M0 0h24v24H0z"/></svg>',
	'teal.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle fill="#18a589" cx="12" cy="12" r="12"/></svg>',
	// A dark badge disappears on the dark theme, but its white glyph stays visible.
	'badge.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#222"/><rect x="6" y="6" width="12" height="12" fill="#fff"/></svg>',
	// Same structure as a published dark variant: style paint inside clip-path groups.
	'white-wordmark.svg':
		'<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 414 297"><defs><clipPath id="clip"><rect width="414" height="120" style="fill:none;"/></clipPath></defs><g style="clip-path:url(#clip);"><path d="M0 0h120v120H0z" style="fill:#fff;"/><path d="M140 0h120v120H140z" style="fill:#fff;"/></g></svg>',
	'half-transparent.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><style>.shape { fill: #000; fill-opacity: 0.5 }</style><rect class="shape" width="24" height="24"/></svg>',
	'dark-tile-with-dot.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#2b2b2b"/><circle cx="12" cy="12" r="1" fill="#fff"/></svg>',
	'text-only.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text x="0" y="20">A</text></svg>',
	'broken.svg': '<svg',
};

const pngFiles: Record<string, Buffer> = {
	'black.png': new Resvg(svgFiles['black.svg'] ?? '').render().asPng(),
	'white.png': new Resvg(svgFiles['white.svg'] ?? '').render().asPng(),
};

vi.mocked(fs.readFileSync).mockImplementation((path) => {
	const name = basename(path.toString());
	const file = pngFiles[name] ?? svgFiles[name];
	if (file === undefined) throw new Error(`ENOENT: ${name}`);
	return Buffer.from(file);
});

const nodeFilePath = '/tmp/TestNode.node.ts';
const credentialFilePath = '/tmp/TestCredential.credentials.ts';

function createNodeCode(icon: string | { light: string; dark: string }): string {
	const iconProperty =
		typeof icon === 'string'
			? `icon: '${icon}',`
			: `icon: { light: '${icon.light}', dark: '${icon.dark}' },`;
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
		defaults: { name: 'Test Node' },
		inputs: [],
		outputs: [],
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

function createVersionedNodeCode(icon: string): string {
	return `
import type { INodeTypeBaseDescription, VersionedNodeType } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			displayName: 'Test Node',
			name: 'testNode',
			icon: '${icon}',
			version: 1,
			properties: [],
		};
	}
}`;
}

const ruleTester = new RuleTester();

ruleTester.run('icon-contrast', IconContrastRule, {
	valid: [
		{
			name: 'class that does not implement INodeType',
			code: "export class NotANode { description = { icon: 'file:black.svg' }; }",
			filename: nodeFilePath,
		},
		{
			name: 'file that is not a node or credential file',
			code: createNodeCode('file:black.svg'),
			filename: '/tmp/helpers.ts',
		},
		{
			name: 'themed variants that each fit their theme',
			code: createNodeCode({ light: 'file:black.svg', dark: 'file:white.svg' }),
			filename: nodeFilePath,
		},
		{
			name: 'single icon with a mid-tone color',
			code: createNodeCode('file:teal.svg'),
			filename: nodeFilePath,
		},
		{
			name: 'dark badge with a light glyph',
			code: createNodeCode('file:badge.svg'),
			filename: nodeFilePath,
		},
		{
			name: 'icon that is not a file',
			code: createNodeCode('fa:envelope'),
			filename: nodeFilePath,
		},
		{
			name: 'missing icon file',
			code: createNodeCode('file:missing.svg'),
			filename: nodeFilePath,
		},
		{
			name: 'icon that paints no pixels without fonts',
			code: createNodeCode('file:text-only.svg'),
			filename: nodeFilePath,
		},
		{
			name: 'invalid SVG markup',
			code: createNodeCode('file:broken.svg'),
			filename: nodeFilePath,
		},
		{
			name: 'credential with a mid-tone icon',
			code: createCredentialCode('file:teal.svg'),
			filename: credentialFilePath,
		},
		{
			name: 'PNG variants that each fit their theme',
			code: createNodeCode({ light: 'file:black.png', dark: 'file:white.png' }),
			filename: nodeFilePath,
		},
		{
			name: 'mid gray icon at the default minimum',
			code: createNodeCode('file:gray.svg'),
			filename: nodeFilePath,
		},
	],
	invalid: [
		{
			name: 'single black icon on the dark theme',
			code: createNodeCode('file:black.svg'),
			filename: nodeFilePath,
			errors: [
				{ messageId: 'lowContrast', data: { iconPath: 'black.svg', theme: 'dark', visible: 0 } },
			],
		},
		{
			name: 'single white wordmark on the light theme',
			code: createNodeCode('file:white-wordmark.svg'),
			filename: nodeFilePath,
			errors: [
				{
					messageId: 'lowContrast',
					data: { iconPath: 'white-wordmark.svg', theme: 'light', visible: 0 },
				},
			],
		},
		{
			name: 'themed variants that are swapped',
			code: createNodeCode({ light: 'file:white.svg', dark: 'file:black.svg' }),
			filename: nodeFilePath,
			errors: [
				{ messageId: 'lowContrast', data: { iconPath: 'white.svg', theme: 'light', visible: 0 } },
				{ messageId: 'lowContrast', data: { iconPath: 'black.svg', theme: 'dark', visible: 0 } },
			],
		},
		{
			name: 'paint made half transparent by a CSS class',
			code: createNodeCode({ light: 'file:black.svg', dark: 'file:half-transparent.svg' }),
			filename: nodeFilePath,
			errors: [
				{
					messageId: 'lowContrast',
					data: { iconPath: 'half-transparent.svg', theme: 'dark', visible: 0 },
				},
			],
		},
		{
			name: 'dark tile whose only light part is a small dot',
			code: createNodeCode({ light: 'file:black.svg', dark: 'file:dark-tile-with-dot.svg' }),
			filename: nodeFilePath,
			errors: [
				{
					messageId: 'lowContrast',
					data: { iconPath: 'dark-tile-with-dot.svg', theme: 'dark', visible: 0 },
				},
			],
		},
		{
			name: 'credential icon',
			code: createCredentialCode('file:white.svg'),
			filename: credentialFilePath,
			errors: [
				{ messageId: 'lowContrast', data: { iconPath: 'white.svg', theme: 'light', visible: 0 } },
			],
		},
		{
			name: 'single black PNG on the dark theme',
			code: createNodeCode('file:black.png'),
			filename: nodeFilePath,
			errors: [
				{ messageId: 'lowContrast', data: { iconPath: 'black.png', theme: 'dark', visible: 0 } },
			],
		},
		{
			name: 'description assigned in the constructor',
			code: createVersionedNodeCode('file:black.svg'),
			filename: nodeFilePath,
			errors: [
				{ messageId: 'lowContrast', data: { iconPath: 'black.svg', theme: 'dark', visible: 0 } },
			],
		},
		{
			name: 'mid gray icon with a minimum of 3:1',
			code: createNodeCode('file:gray.svg'),
			filename: nodeFilePath,
			options: [{ minimum: 3 }],
			errors: [
				{ messageId: 'lowContrast', data: { iconPath: 'gray.svg', theme: 'light', visible: 0 } },
			],
		},
	],
});

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as fs from 'node:fs';
import { basename } from 'node:path';
import { expect, vi } from 'vitest';

import { IconContrastRule } from './icon-contrast.js';

vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs')>();
	return { ...actual, readFileSync: vi.fn() };
});

function wordmark(color: string): string {
	return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 414 297"><defs><clipPath id="clippath"><rect x="2.402" width="411.598" height="120" style="fill:none;"/></clipPath></defs><g style="clip-path:url(#clippath);"><path d="M2 0h80v120H2z" style="fill:${color};"/><path d="M110 0h80v120h-80z" style="fill:${color};"/><path d="M220 0h80v120h-80z" style="fill:${color};"/></g><path d="M2 177h400v120H2z" style="fill:${color};"/></svg>`;
}

const svgFiles: Record<string, string> = {
	// A mid gray: visible at the default minimum, too faint for 3:1 on the light theme.
	'gray.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#999" d="M0 0h24v24H0z"/></svg>',
	'black.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>',
	'white.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M0 0h24v24H0z"/></svg>',
	'mixed-fill.svg': '<svg><path fill="white"/><path/></svg>',
	'mixed-style.svg': '<svg><path style="fill: white"/><path/></svg>',
	'mixed-stylesheet.svg':
		'<svg><style>.white { fill: white }</style><path class="white"/><path/></svg>',
	'inherited-fill.svg': '<svg><g fill="white"><path/></g></svg>',
	'teal.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle fill="#18a589" cx="12" cy="12" r="12"/></svg>',
	// A dark badge disappears on the dark theme, but its white glyph stays visible.
	'badge.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#222"/><rect x="6" y="6" width="12" height="12" fill="#fff"/></svg>',
	// A blue wordmark for the light theme and a white one for the dark theme, painted through
	// style attributes inside clip-path groups.
	'wordmark.svg': wordmark('#003d8f'),
	'wordmark.dark.svg': wordmark('#fff'),
	'half-transparent.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><style>.shape { fill: #000; fill-opacity: 0.5 }</style><rect class="shape" width="24" height="24"/></svg>',
	'faint.svg': '<svg><path fill="rgb(0 0 0 / 10%)"/></svg>',
	'current-color.svg': '<svg><path fill="currentColor"/></svg>',
	'variable.svg': '<svg><path fill="var(--icon-color)"/></svg>',
	'fallback.svg': '<svg><path fill="var(--icon-color, #fff)"/></svg>',
	'style.svg': '<svg><path style="fill: rgb(255 255 255)"/></svg>',
	'stylesheet.svg': '<svg><style>.icon { fill: oklch(100% 0 0) }</style><path class="icon"/></svg>',
	'stroke.svg': '<svg><path fill="none" stroke="#fff"/></svg>',
	'gradient.svg':
		'<svg><defs><linearGradient id="g"><stop stop-color="#fff"/></linearGradient></defs><path fill="url(#g)"/></svg>',
	'quoted-gradient.svg':
		'<svg><defs><radialGradient id="g"><stop stop-color="#fff"/></radialGradient></defs><path style="fill: url(\'#g\')"/></svg>',
	'linked-gradient.svg':
		'<svg><defs><linearGradient id="base"><stop stop-color="#fff"/></linearGradient><linearGradient id="g" href="#base"/></defs><path fill="url(#g)"/></svg>',
	'image.svg': '<svg><image href="data:image/png;base64,AA=="/><path fill="#fff"/></svg>',
	'external-image.svg': '<svg><image href="image.png"/></svg>',
	'url.svg': '<svg><path fill="url(#pattern)"/></svg>',
	'url-style.svg': '<svg><style>.icon { fill: url(#pattern) }</style><path/></svg>',
	'pattern-with-gradient.svg':
		'<svg><defs><linearGradient id="g"><stop stop-color="#fff"/></linearGradient><pattern id="pattern"><path fill="#fff"/></pattern></defs><path fill="url(#pattern)"/></svg>',
	'empty-gradient.svg':
		'<svg><defs><linearGradient id="g"><stop stop-color="#fff"/></linearGradient><linearGradient id="empty"/></defs><path fill="url(#empty)"/></svg>',
	'empty.svg': '<svg><path fill="none"/></svg>',
	'broken-style.svg': '<svg><style>.icon { fill: </style></svg>',
	'dark-tile-with-dot.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#2b2b2b"/><circle cx="12" cy="12" r="1" fill="#fff"/></svg>',
	'text-only.svg':
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text x="0" y="20">A</text></svg>',
	'broken.svg': '<svg',
};

vi.mocked(fs.readFileSync).mockImplementation((path, options) => {
	const name = basename(path.toString());
	const file = svgFiles[name];
	if (file === undefined) throw new Error(`ENOENT: ${name}`);
	return options === 'utf8' ? file : Buffer.from(file);
});

const nodeFilePath = '/tmp/TestNode.node.ts';
const credentialFilePath = '/tmp/TestCredential.credentials.ts';

function createNodeCode(icon: string | { light: string; dark: string }, assertion = ''): string {
	const iconProperty =
		typeof icon === 'string'
			? `icon: '${icon}'${assertion},`
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

function createCredentialCode(
	icon: string | { light: string; dark: string },
	assertion = '',
): string {
	const iconValue =
		typeof icon === 'string' ? `'${icon}'` : `{ light: '${icon.light}', dark: '${icon.dark}' }`;
	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TestCredential implements ICredentialType {
	name = 'testApi';
	displayName = 'Test API';
	icon = ${iconValue}${assertion};
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

function lowContrast(iconPath: string, theme: 'light' | 'dark', ratio: string, minimum = 1.5) {
	return { messageId: 'lowContrast' as const, data: { iconPath, theme, ratio, minimum } };
}

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
		...['mixed-fill.svg', 'mixed-style.svg', 'mixed-stylesheet.svg'].flatMap((file) => [
			{
				name: `single icon with explicit white and default black: ${file}`,
				code: createNodeCode(`file:${file}`),
				filename: nodeFilePath,
			},
			{
				name: `themed credential with explicit white and default black: ${file}`,
				code: createCredentialCode({ light: `file:${file}`, dark: 'file:white.svg' }),
				filename: credentialFilePath,
			},
		]),
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
			name: 'credential with themed variants that each fit their theme',
			code: createCredentialCode({ light: 'file:black.svg', dark: 'file:white.svg' }),
			filename: credentialFilePath,
		},
		{
			name: 'blue and white SVG wordmarks, each on its own theme',
			code: createNodeCode({ light: 'file:wordmark.svg', dark: 'file:wordmark.dark.svg' }),
			filename: nodeFilePath,
		},
		{
			name: 'blue and white PNG wordmarks, each on its own theme',
			code: createNodeCode({ light: 'file:wordmark.png', dark: 'file:wordmark.dark.png' }),
			filename: nodeFilePath,
		},
		{
			name: 'PNG variants that each fit their theme',
			code: createNodeCode({ light: 'file:black.png', dark: 'file:white.png' }),
			filename: nodeFilePath,
		},
		{
			name: 'PNG files are skipped before reading',
			code: createNodeCode('file:black.png'),
			filename: nodeFilePath,
			before: () => vi.mocked(fs.readFileSync).mockClear(),
			after: () => expect(fs.readFileSync).not.toHaveBeenCalled(),
		},
		{
			name: 'the best color counts even on a small shape',
			code: createNodeCode({ light: 'file:black.svg', dark: 'file:dark-tile-with-dot.svg' }),
			filename: nodeFilePath,
		},
		...[
			'image.svg',
			'external-image.svg',
			'url.svg',
			'url-style.svg',
			'pattern-with-gradient.svg',
			'empty-gradient.svg',
			'empty.svg',
			'broken-style.svg',
		].flatMap((file) => [
			{
				name: `skip a node icon that cannot be judged: ${file}`,
				code: createNodeCode(`file:${file}`),
				filename: nodeFilePath,
			},
			{
				name: `skip a credential icon that cannot be judged: ${file}`,
				code: createCredentialCode(`file:${file}`),
				filename: credentialFilePath,
			},
		]),
		{
			name: 'empty options retain the default minimum',
			code: createNodeCode('file:gray.svg'),
			filename: nodeFilePath,
			options: [{}],
		},
		{
			name: 'lower minimum accepts black on the dark background',
			code: createNodeCode('file:black.svg'),
			filename: nodeFilePath,
			options: [{ minimum: 1.4 }],
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
			errors: [lowContrast('black.svg', 'dark', '1.48')],
		},
		{
			name: 'white SVG wordmark used as the only icon is invisible on the light theme',
			code: createNodeCode('file:wordmark.dark.svg'),
			filename: nodeFilePath,
			errors: [lowContrast('wordmark.dark.svg', 'light', '1.00')],
		},
		{
			name: 'white wordmark in the light slot is invisible on the light theme',
			code: createNodeCode({ light: 'file:wordmark.dark.svg', dark: 'file:wordmark.dark.svg' }),
			filename: nodeFilePath,
			errors: [lowContrast('wordmark.dark.svg', 'light', '1.00')],
		},
		{
			name: 'icon path with a type assertion',
			code: createNodeCode('file:black.svg', ' as const'),
			filename: nodeFilePath,
			errors: [lowContrast('black.svg', 'dark', '1.48')],
		},
		{
			name: 'themed variants that are swapped',
			code: createNodeCode({ light: 'file:white.svg', dark: 'file:black.svg' }),
			filename: nodeFilePath,
			errors: [lowContrast('white.svg', 'light', '1.00'), lowContrast('black.svg', 'dark', '1.48')],
		},
		{
			name: 'paint declarations do not apply separate opacity properties',
			code: createNodeCode({ light: 'file:black.svg', dark: 'file:half-transparent.svg' }),
			filename: nodeFilePath,
			errors: [lowContrast('half-transparent.svg', 'dark', '1.48')],
		},
		{
			name: 'text paint is checked without loading system fonts',
			code: createNodeCode('file:text-only.svg'),
			filename: nodeFilePath,
			errors: [lowContrast('text-only.svg', 'dark', '1.48')],
		},
		{
			name: 'credential icon',
			code: createCredentialCode('file:white.svg'),
			filename: credentialFilePath,
			errors: [lowContrast('white.svg', 'light', '1.00')],
		},
		{
			name: 'credential with themed variants that are swapped',
			code: createCredentialCode({ light: 'file:white.svg', dark: 'file:black.svg' }),
			filename: credentialFilePath,
			errors: [lowContrast('white.svg', 'light', '1.00'), lowContrast('black.svg', 'dark', '1.48')],
		},
		{
			name: 'credential with themed variants and a minimum of 3:1',
			code: createCredentialCode({ light: 'file:gray.svg', dark: 'file:white.svg' }),
			filename: credentialFilePath,
			options: [{ minimum: 3 }],
			errors: [lowContrast('gray.svg', 'light', '2.85', 3)],
		},
		{
			name: 'description assigned in the constructor',
			code: createVersionedNodeCode('file:black.svg'),
			filename: nodeFilePath,
			errors: [lowContrast('black.svg', 'dark', '1.48')],
		},
		{
			name: 'mid gray icon with a minimum of 3:1',
			code: createNodeCode('file:gray.svg'),
			filename: nodeFilePath,
			options: [{ minimum: 3 }],
			errors: [lowContrast('gray.svg', 'light', '2.85', 3)],
		},
		...['current-color.svg', 'variable.svg'].map((file) => ({
			name: `black paint on the dark theme: ${file}`,
			code: createNodeCode(`file:${file}`),
			filename: nodeFilePath,
			errors: [lowContrast(file, 'dark', '1.48')],
		})),
		...[
			'fallback.svg',
			'style.svg',
			'stylesheet.svg',
			'stroke.svg',
			'gradient.svg',
			'quoted-gradient.svg',
			'linked-gradient.svg',
			'inherited-fill.svg',
		].map((file) => ({
			name: `white paint on the light theme: ${file}`,
			code: createNodeCode(`file:${file}`),
			filename: nodeFilePath,
			errors: [lowContrast(file, 'light', '1.00')],
		})),
		{
			name: 'one black file used in both theme slots',
			code: createNodeCode({ light: 'file:black.svg', dark: 'file:black.svg' }),
			filename: nodeFilePath,
			errors: [lowContrast('black.svg', 'dark', '1.48')],
		},
		{
			name: 'low-alpha paint still has a contrast result',
			code: createNodeCode({ light: 'file:faint.svg', dark: 'file:white.svg' }),
			filename: nodeFilePath,
			errors: [lowContrast('faint.svg', 'light', '1.25')],
		},
		...['!', ' satisfies string', ' as string'].flatMap((assertion) => [
			{
				name: `node icon behind an assertion: ${assertion}`,
				code: createNodeCode('file:black.svg', assertion),
				filename: nodeFilePath,
				errors: [lowContrast('black.svg', 'dark', '1.48')],
			},
			{
				name: `credential icon behind an assertion: ${assertion}`,
				code: createCredentialCode('file:black.svg', assertion),
				filename: credentialFilePath,
				errors: [lowContrast('black.svg', 'dark', '1.48')],
			},
		]),
		...['INodeType', 'ICredentialType'].map((type) => ({
			name: `themed icon and path behind assertions for ${type}`,
			code: `export class Test implements ${type} {
				${type === 'INodeType' ? 'description = { icon:' : 'icon ='}
				({ light: 'file:black.svg', dark: ('file:black.svg' as const)! } as const)!
				${type === 'INodeType' ? '}' : ''};
			}`,
			filename: type === 'INodeType' ? nodeFilePath : credentialFilePath,
			errors: [lowContrast('black.svg', 'dark', '1.48')],
		})),
	],
});

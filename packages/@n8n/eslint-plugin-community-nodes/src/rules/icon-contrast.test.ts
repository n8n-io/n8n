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
	'black.svg': '<svg><path d="M0 0h24v24H0z"/></svg>',
	'white.svg': '<svg><path fill="#fff"/></svg>',
	'gray.svg': '<svg><path fill="#999"/></svg>',
	'current-color.svg': '<svg><path fill="currentColor"/></svg>',
	'variable.svg': '<svg><path fill="var(--icon-color)"/></svg>',
	'fallback.svg': '<svg><path fill="var(--icon-color, #fff)"/></svg>',
	'style.svg': '<svg><path style="fill: rgb(255 255 255)"/></svg>',
	'stylesheet.svg': '<svg><style>.icon { fill: hsl(0 0% 100%) }</style><path/></svg>',
	'stroke.svg': '<svg><path fill="none" stroke="#fff"/></svg>',
	'gradient.svg':
		'<svg><defs><linearGradient id="g"><stop stop-color="#fff"/></linearGradient></defs><path fill="url(#g)"/></svg>',
	'quoted-gradient.svg':
		'<svg><defs><radialGradient id="g"><stop stop-color="#fff"/></radialGradient></defs><path style="fill: url(\'#g\')"/></svg>',
	'linked-gradient.svg':
		'<svg><defs><linearGradient id="base"><stop stop-color="#fff"/></linearGradient><linearGradient id="g" href="#base"/></defs><path fill="url(#g)"/></svg>',
	'best-color.svg': '<svg><path fill="#2b2b2b"/><circle fill="#fff" r="1"/></svg>',
	'image.svg': '<svg><image href="data:image/png;base64,AA=="/><path fill="#fff"/></svg>',
	'external-image.svg': '<svg><image href="image.png"/></svg>',
	'url.svg': '<svg><path fill="url(#pattern)"/></svg>',
	'url-style.svg': '<svg><style>.icon { fill: url(#pattern) }</style><path/></svg>',
	'pattern-with-gradient.svg':
		'<svg><defs><linearGradient id="g"><stop stop-color="#fff"/></linearGradient><pattern id="pattern"><path fill="#fff"/></pattern></defs><path fill="url(#pattern)"/></svg>',
	'empty-gradient.svg':
		'<svg><defs><linearGradient id="g"><stop stop-color="#fff"/></linearGradient><linearGradient id="empty"/></defs><path fill="url(#empty)"/></svg>',
	'empty.svg': '<svg><path fill="none"/></svg>',
	'broken.svg': '<svg',
	'broken-style.svg': '<svg><style>.icon { fill: </style></svg>',
};

vi.mocked(fs.readFileSync).mockImplementation((path) => {
	const name = basename(path.toString());
	const file = svgFiles[name];
	if (file === undefined) throw new Error(`ENOENT: ${name}`);
	return file;
});

const nodeFilePath = '/tmp/TestNode.node.ts';
const credentialFilePath = '/tmp/TestCredential.credentials.ts';

function createNodeCode(icon: string): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
export class TestNode implements INodeType {
	description: INodeTypeDescription = { icon: ${icon} };
}`;
}

function createCredentialCode(icon: string): string {
	return `
import type { ICredentialType } from 'n8n-workflow';
export class TestCredential implements ICredentialType {
	icon = ${icon};
}`;
}

function lowContrast(iconPath: string, theme: 'light' | 'dark', ratio: string, minimum = 1.5) {
	return { messageId: 'lowContrast' as const, data: { iconPath, theme, ratio, minimum } };
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
			code: createNodeCode("'file:black.svg'"),
			filename: '/tmp/helpers.ts',
		},
		{
			name: 'themed variants that each fit their theme',
			code: createNodeCode("{ light: 'file:black.svg', dark: 'file:white.svg' }"),
			filename: nodeFilePath,
		},
		{
			name: 'themed credential variants',
			code: createCredentialCode("{ light: 'file:black.svg', dark: 'file:white.svg' }"),
			filename: credentialFilePath,
		},
		...['gray.svg', 'best-color.svg'].map((file) => ({
			name: `single icon with a visible color: ${file}`,
			code: createNodeCode(`'file:${file}'`),
			filename: nodeFilePath,
		})),
		...[
			'fa:envelope',
			'file:black.png',
			'file:missing.svg',
			'file:broken.svg',
			'file:broken-style.svg',
			'file:image.svg',
			'file:external-image.svg',
			'file:url.svg',
			'file:url-style.svg',
			'file:pattern-with-gradient.svg',
			'file:empty-gradient.svg',
			'file:empty.svg',
		].map((icon) => ({
			name: `skip an icon that cannot be judged: ${icon}`,
			code: createNodeCode(`'${icon}'`),
			filename: nodeFilePath,
		})),
		{
			name: 'missing or dynamic icon',
			code: 'export class TestNode implements INodeType { description = { icon: getIcon() }; }',
			filename: nodeFilePath,
		},
		{
			name: 'empty options retain the default minimum',
			code: createNodeCode("'file:gray.svg'"),
			filename: nodeFilePath,
			options: [{}],
		},
		{
			name: 'lower minimum accepts black on the dark background',
			code: createNodeCode("'file:black.svg'"),
			filename: nodeFilePath,
			options: [{ minimum: 1.4 }],
		},
	],
	invalid: [
		...['black.svg', 'current-color.svg', 'variable.svg'].map((file) => ({
			name: `black paint on the dark theme: ${file}`,
			code: createNodeCode(`'file:${file}'`),
			filename: nodeFilePath,
			errors: [lowContrast(file, 'dark', '1.48')],
		})),
		...[
			'white.svg',
			'style.svg',
			'stylesheet.svg',
			'stroke.svg',
			'gradient.svg',
			'quoted-gradient.svg',
			'linked-gradient.svg',
			'fallback.svg',
		].map((file) => ({
			name: `white paint on the light theme: ${file}`,
			code: createNodeCode(`'file:${file}'`),
			filename: nodeFilePath,
			errors: [lowContrast(file, 'light', '1.00')],
		})),
		{
			name: 'themed variants that are swapped',
			code: createNodeCode("{ light: 'file:white.svg', dark: 'file:black.svg' }"),
			filename: nodeFilePath,
			errors: [lowContrast('white.svg', 'light', '1.00'), lowContrast('black.svg', 'dark', '1.48')],
		},
		{
			name: 'one black file used in both theme slots',
			code: createNodeCode("{ light: 'file:black.svg', dark: 'file:black.svg' }"),
			filename: nodeFilePath,
			errors: [lowContrast('black.svg', 'dark', '1.48')],
		},
		{
			name: 'credential icon',
			code: createCredentialCode("'file:white.svg'"),
			filename: credentialFilePath,
			errors: [lowContrast('white.svg', 'light', '1.00')],
		},
		{
			name: 'description assigned in the constructor',
			code: `export class TestNode implements INodeType {
				description: INodeTypeDescription;
				constructor() { this.description = { icon: 'file:black.svg' } as INodeTypeDescription; }
			}`,
			filename: nodeFilePath,
			errors: [lowContrast('black.svg', 'dark', '1.48')],
		},
		{
			name: 'mid gray icon with a minimum of 3:1',
			code: createNodeCode("'file:gray.svg'"),
			filename: nodeFilePath,
			options: [{ minimum: 3 }],
			errors: [lowContrast('gray.svg', 'light', '2.85', 3)],
		},
		{
			name: 'minimum also applies to themed credentials',
			code: createCredentialCode("{ light: 'file:gray.svg', dark: 'file:white.svg' }"),
			filename: credentialFilePath,
			options: [{ minimum: 3 }],
			errors: [lowContrast('gray.svg', 'light', '2.85', 3)],
		},
		...[
			"'file:black.svg' as const",
			"(<string>'file:black.svg')!",
			"'file:black.svg' satisfies string",
			"({ light: 'file:black.svg', dark: 'file:black.svg' } as const)!",
			"{ dark: ('file:black.svg' as const)! } satisfies Icon",
		].flatMap((icon) => [
			{
				name: `node icon behind assertions: ${icon}`,
				code: createNodeCode(icon),
				filename: nodeFilePath,
				errors: [lowContrast('black.svg', 'dark', '1.48')],
			},
			{
				name: `credential icon behind assertions: ${icon}`,
				code: createCredentialCode(icon),
				filename: credentialFilePath,
				errors: [lowContrast('black.svg', 'dark', '1.48')],
			},
		]),
	],
});

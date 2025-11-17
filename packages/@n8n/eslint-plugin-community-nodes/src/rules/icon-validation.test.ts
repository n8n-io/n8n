import { RuleTester } from '@typescript-eslint/rule-tester';
import * as fs from 'node:fs';
import { vi } from 'vitest';

import { IconValidationRule } from './icon-validation.js';

const ruleTester = new RuleTester();

vi.mock('node:fs', () => ({
	existsSync: vi.fn(),
	readdirSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(fs.existsSync);
const mockReaddirSync = vi.mocked(fs.readdirSync);

const mockSvgFiles = [
	'TestNode.svg',
	'ValidIcon.svg',
	'ValidIcon.dark.svg',
	'SameIcon.svg',
	'github.svg',
];

function setupMockFileSystem() {
	mockExistsSync.mockImplementation((path: fs.PathLike) => {
		const pathStr = path.toString();

		if (mockSvgFiles.some((file) => pathStr.includes(file)) || pathStr.includes('NotSvg.png')) {
			return true;
		}

		if (pathStr.endsWith('/tmp/icons') || pathStr.endsWith('/tmp') || pathStr.endsWith('icons')) {
			return true;
		}

		return false;
	});

	// @ts-expect-error Typescript does not select the correct overload
	mockReaddirSync.mockImplementation((path: fs.PathLike): string[] => {
		const pathStr = path.toString();

		if (pathStr.includes('icons')) {
			return [...mockSvgFiles, 'NotSvg.png'];
		}

		return [];
	});
}

setupMockFileSystem();

const nodeFilePath = '/tmp/TestNode.node.ts';
const credentialFilePath = '/tmp/TestCredential.credentials.ts';

function createNodeCode(
	icon?: string | { light: string; dark: string },
	includeTypeImport: boolean = false,
): string {
	const typeImport = includeTypeImport
		? "import type { INodeType, INodeTypeDescription } from 'n8n-workflow';"
		: "import type { INodeType } from 'n8n-workflow';";

	const typeAnnotation = includeTypeImport ? ': INodeTypeDescription' : '';

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
${typeImport}

export class TestNode implements INodeType {
	description${typeAnnotation} = {
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

// Helper function to create non-node class
function createNonNodeClass(icon: string): string {
	return `
export class NotANode {
	icon = '${icon}';
}`;
}

ruleTester.run('icon-validation', IconValidationRule, {
	valid: [
		{
			name: 'non-node class ignored',
			filename: nodeFilePath,
			code: createNonNodeClass('file:nonexistent.png'),
		},
		{
			name: 'non-node file ignored',
			filename: '/tmp/regular-file.ts',
			code: createNodeCode('file:nonexistent.svg'),
		},
		{
			name: 'node with valid string icon in description',
			filename: nodeFilePath,
			code: createNodeCode('file:icons/TestNode.svg', true),
		},
		{
			name: 'node with valid light/dark icons in description',
			filename: nodeFilePath,
			code: createNodeCode(
				{
					light: 'file:icons/ValidIcon.svg',
					dark: 'file:icons/ValidIcon.dark.svg',
				},
				true,
			),
		},
		{
			name: 'credential with valid string icon',
			filename: credentialFilePath,
			code: createCredentialCode('file:icons/TestNode.svg'),
		},
		{
			name: 'credential with valid light/dark icons',
			filename: credentialFilePath,
			code: createCredentialCode({
				light: 'file:icons/ValidIcon.svg',
				dark: 'file:icons/ValidIcon.dark.svg',
			}),
		},
	],
	invalid: [
		{
			name: 'node missing icon property in description',
			filename: nodeFilePath,
			code: createNodeCode(undefined, true),
			errors: [
				{
					messageId: 'missingIcon',
					suggestions: [
						{
							messageId: 'addPlaceholder',
							output:
								"\nimport type { INodeType, INodeTypeDescription } from 'n8n-workflow';\n\nexport class TestNode implements INodeType {\n\tdescription: INodeTypeDescription = {\n\t\tdisplayName: 'Test Node',\n\t\tname: 'testNode',\n\t\t\n\t\tgroup: ['input'],\n\t\tversion: 1,\n\t\tdescription: 'A test node',\n\t\tdefaults: {\n\t\t\tname: 'Test Node',\n\t\t},\n\t\tinputs: ['main'],\n\t\toutputs: ['main'],\n\t\tproperties: [],\n\t\ticon: \"file:./icon.svg\",\n\t};\n}",
						},
					],
				},
			],
		},
		{
			name: 'icon file does not exist in description',
			filename: nodeFilePath,
			code: createNodeCode('file:icons/NonExistent.svg', true),
			errors: [{ messageId: 'iconFileNotFound', data: { iconPath: 'icons/NonExistent.svg' } }],
		},
		{
			name: 'light and dark icons are the same file in description',
			filename: nodeFilePath,
			code: createNodeCode(
				{
					light: 'file:icons/SameIcon.svg',
					dark: 'file:icons/SameIcon.svg',
				},
				true,
			),
			errors: [{ messageId: 'lightDarkSame', data: { iconPath: 'icons/SameIcon.svg' } }],
		},
		{
			name: 'credential missing icon property',
			filename: credentialFilePath,
			code: createCredentialCode(),
			errors: [
				{
					messageId: 'missingIcon',
					suggestions: [
						{
							messageId: 'addPlaceholder',
							output:
								"\nimport type { ICredentialType, INodeProperties } from 'n8n-workflow';\n\nexport class TestCredential implements ICredentialType {\n\tname = 'testApi';\n\tdisplayName = 'Test API';\n\t\n\tproperties: INodeProperties[] = [];\n\n\ticon = \"file:./icon.svg\";\n}",
						},
					],
				},
			],
		},
		{
			name: 'credential icon file does not exist',
			filename: credentialFilePath,
			code: createCredentialCode('file:icons/NonExistent.svg'),
			errors: [{ messageId: 'iconFileNotFound', data: { iconPath: 'icons/NonExistent.svg' } }],
		},
		{
			name: 'credential light and dark icons are the same file',
			filename: credentialFilePath,
			code: createCredentialCode({
				light: 'file:icons/SameIcon.svg',
				dark: 'file:icons/SameIcon.svg',
			}),
			errors: [{ messageId: 'lightDarkSame', data: { iconPath: 'icons/SameIcon.svg' } }],
		},
		{
			name: 'node icon file does not exist but similar file exists - should suggest similar file',
			filename: nodeFilePath,
			code: createNodeCode('file:icons/github2.svg'),
			errors: [
				{
					messageId: 'iconFileNotFound',
					data: { iconPath: 'icons/github2.svg' },
					suggestions: [
						{
							messageId: 'similarIcon',
							data: { suggestedName: 'icons/github.svg' },
							output: `
import type { INodeType } from 'n8n-workflow';

export class TestNode implements INodeType {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		icon: "file:icons/github.svg",
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
}`,
						},
					],
				},
			],
		},
	],
});

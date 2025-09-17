import { RuleTester } from '@typescript-eslint/rule-tester';
import { IconValidationRule } from './icon-validation.js';
import { vi } from 'vitest';
import * as fs from 'node:fs';

const ruleTester = new RuleTester();

vi.mock('node:fs', () => ({
	existsSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(fs.existsSync);

function setupMockFileSystem() {
	mockExistsSync.mockImplementation((path: fs.PathLike) => {
		const pathStr = path.toString();
		return (
			pathStr.includes('TestNode.svg') ||
			pathStr.includes('ValidIcon.svg') ||
			pathStr.includes('ValidIcon.dark.svg') ||
			pathStr.includes('SameIcon.svg') ||
			pathStr.includes('NotSvg.png')
		);
	});
}

setupMockFileSystem();

const nodeFilePath = '/tmp/TestNode.node.ts';

function createNodeCode(
	icon?: string | { light: string; dark: string },
	includeTypeImport: boolean = false,
): string {
	const typeImport = includeTypeImport
		? `import type { INodeType, INodeTypeDescription } from 'n8n-workflow';`
		: `import type { INodeType } from 'n8n-workflow';`;

	const typeAnnotation = includeTypeImport ? `: INodeTypeDescription` : '';

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
	],
	invalid: [
		{
			name: 'node missing icon property in description',
			filename: nodeFilePath,
			code: createNodeCode(undefined, true),
			errors: [{ messageId: 'missingIcon' }],
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
	],
});

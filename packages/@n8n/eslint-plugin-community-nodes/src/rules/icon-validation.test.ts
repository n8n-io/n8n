import { RuleTester } from '@typescript-eslint/rule-tester';
import { IconValidationRule } from './icon-validation.js';
import { vi } from 'vitest';
import * as fs from 'node:fs';

const ruleTester = new RuleTester();

// Mock existsSync to simulate file existence
vi.mock('node:fs', () => ({
	existsSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(fs.existsSync);

// Setup mock for file existence
function setupMockFileSystem() {
	mockExistsSync.mockImplementation((path: any) => {
		const pathStr = path.toString();
		// Mock existing files
		if (
			pathStr.includes('TestNode.svg') ||
			pathStr.includes('ValidIcon.svg') ||
			pathStr.includes('ValidIcon.dark.svg') ||
			pathStr.includes('SameIcon.svg') ||
			pathStr.includes('NotSvg.png')
		) {
			return true;
		}
		// All other files don't exist
		return false;
	});
}

setupMockFileSystem();

const nodeFilePath = '/tmp/TestNode.node.ts';

ruleTester.run('icon-validation', IconValidationRule, {
	valid: [
		{
			name: 'node with valid string icon',
			filename: nodeFilePath,
			code: `
				import type { INodeType } from 'n8n-workflow';

				export class TestNode implements INodeType {
					icon = 'file:icons/TestNode.svg';
				}
			`,
		},
		{
			name: 'node with valid light/dark icons (different files)',
			filename: nodeFilePath,
			code: `
				import type { INodeType } from 'n8n-workflow';

				export class TestNode implements INodeType {
					icon = {
						light: 'file:icons/ValidIcon.svg',
						dark: 'file:icons/ValidIcon.dark.svg'
					};
				}
			`,
		},
		{
			name: 'node with valid light/dark icons using as const',
			filename: nodeFilePath,
			code: `
				import type { INodeType } from 'n8n-workflow';

				export class TestNode implements INodeType {
					icon = {
						light: 'file:icons/ValidIcon.svg',
						dark: 'file:icons/ValidIcon.dark.svg'
					} as const;
				}
			`,
		},
		{
			name: 'non-node class ignored',
			filename: nodeFilePath,
			code: `
				export class NotANode {
					icon = 'file:nonexistent.png';
				}
			`,
		},
		{
			name: 'non-node file ignored',
			filename: '/tmp/regular-file.ts',
			code: `
				import type { INodeType } from 'n8n-workflow';

				export class TestNode implements INodeType {
					icon = 'file:nonexistent.svg';
				}
			`,
		},
	],
	invalid: [
		{
			name: 'node missing icon property',
			filename: nodeFilePath,
			code: `
				import type { INodeType } from 'n8n-workflow';

				export class TestNode implements INodeType {
					// No icon property
				}
			`,
			errors: [{ messageId: 'missingIcon' }],
		},
		{
			name: 'icon file does not exist',
			filename: nodeFilePath,
			code: `
				import type { INodeType } from 'n8n-workflow';

				export class TestNode implements INodeType {
					icon = 'file:icons/NonExistent.svg';
				}
			`,
			errors: [{ messageId: 'iconFileNotFound', data: { iconPath: 'icons/NonExistent.svg' } }],
		},
		{
			name: 'icon file is not SVG',
			filename: nodeFilePath,
			code: `
				import type { INodeType } from 'n8n-workflow';

				export class TestNode implements INodeType {
					icon = 'file:icons/NotSvg.png';
				}
			`,
			errors: [{ messageId: 'iconNotSvg', data: { iconPath: 'icons/NotSvg.png' } }],
		},
		{
			name: 'icon path without file: protocol',
			filename: nodeFilePath,
			code: `
				import type { INodeType } from 'n8n-workflow';

				export class TestNode implements INodeType {
					icon = 'icons/TestNode.svg';
				}
			`,
			errors: [{ messageId: 'invalidIconPath', data: { iconPath: 'icons/TestNode.svg' } }],
		},
		{
			name: 'light and dark icons are the same file',
			filename: nodeFilePath,
			code: `
				import type { INodeType } from 'n8n-workflow';

				export class TestNode implements INodeType {
					icon = {
						light: 'file:icons/SameIcon.svg',
						dark: 'file:icons/SameIcon.svg'
					};
				}
			`,
			errors: [{ messageId: 'lightDarkSame', data: { iconPath: 'icons/SameIcon.svg' } }],
		},
		{
			name: 'light and dark icons are the same file (as const)',
			filename: nodeFilePath,
			code: `
				import type { INodeType } from 'n8n-workflow';

				export class TestNode implements INodeType {
					icon = {
						light: 'file:icons/SameIcon.svg',
						dark: 'file:icons/SameIcon.svg'
					} as const;
				}
			`,
			errors: [{ messageId: 'lightDarkSame', data: { iconPath: 'icons/SameIcon.svg' } }],
		},
		{
			name: 'light icon file does not exist',
			filename: nodeFilePath,
			code: `
				import type { INodeType } from 'n8n-workflow';

				export class TestNode implements INodeType {
					icon = {
						light: 'file:icons/NonExistentLight.svg',
						dark: 'file:icons/ValidIcon.dark.svg'
					};
				}
			`,
			errors: [{ messageId: 'iconFileNotFound', data: { iconPath: 'icons/NonExistentLight.svg' } }],
		},
		{
			name: 'dark icon file does not exist',
			filename: nodeFilePath,
			code: `
				import type { INodeType } from 'n8n-workflow';

				export class TestNode implements INodeType {
					icon = {
						light: 'file:icons/ValidIcon.svg',
						dark: 'file:icons/NonExistentDark.svg'
					};
				}
			`,
			errors: [{ messageId: 'iconFileNotFound', data: { iconPath: 'icons/NonExistentDark.svg' } }],
		},
		{
			name: 'light icon is not SVG',
			filename: nodeFilePath,
			code: `
				import type { INodeType } from 'n8n-workflow';

				export class TestNode implements INodeType {
					icon = {
						light: 'file:icons/NotSvg.png',
						dark: 'file:icons/ValidIcon.dark.svg'
					};
				}
			`,
			errors: [{ messageId: 'iconNotSvg', data: { iconPath: 'icons/NotSvg.png' } }],
		},
		{
			name: 'multiple errors: both light and dark invalid',
			filename: nodeFilePath,
			code: `
				import type { INodeType } from 'n8n-workflow';

				export class TestNode implements INodeType {
					icon = {
						light: 'file:icons/NonExistent.svg',
						dark: 'file:icons/NotSvg.png'
					};
				}
			`,
			errors: [
				{ messageId: 'iconFileNotFound', data: { iconPath: 'icons/NonExistent.svg' } },
				{ messageId: 'iconNotSvg', data: { iconPath: 'icons/NotSvg.png' } },
			],
		},
	],
});

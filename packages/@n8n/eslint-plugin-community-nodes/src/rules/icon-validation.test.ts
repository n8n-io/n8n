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
					description = {
						icon: 'file:nonexistent.svg'
					};
				}
			`,
		},
		{
			name: 'node with valid string icon in description',
			filename: nodeFilePath,
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						icon: 'file:icons/TestNode.svg',
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
				}
			`,
		},
		{
			name: 'node with valid light/dark icons in description',
			filename: nodeFilePath,
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						icon: {
							light: 'file:icons/ValidIcon.svg',
							dark: 'file:icons/ValidIcon.dark.svg'
						},
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
				}
			`,
		},
	],
	invalid: [
		{
			name: 'node missing icon property in description',
			filename: nodeFilePath,
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
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
				}
			`,
			errors: [{ messageId: 'missingIcon' }],
		},
		{
			name: 'icon file does not exist in description',
			filename: nodeFilePath,
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						icon: 'file:icons/NonExistent.svg',
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
				}
			`,
			errors: [{ messageId: 'iconFileNotFound', data: { iconPath: 'icons/NonExistent.svg' } }],
		},
		{
			name: 'light and dark icons are the same file in description',
			filename: nodeFilePath,
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						icon: {
							light: 'file:icons/SameIcon.svg',
							dark: 'file:icons/SameIcon.svg'
						},
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
				}
			`,
			errors: [{ messageId: 'lightDarkSame', data: { iconPath: 'icons/SameIcon.svg' } }],
		},
	],
});

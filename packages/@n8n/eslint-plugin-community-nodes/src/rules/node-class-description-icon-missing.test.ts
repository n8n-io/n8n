import { RuleTester } from '@typescript-eslint/rule-tester';

import { NodeClassDescriptionIconMissingRule } from './node-class-description-icon-missing.js';

const ruleTester = new RuleTester();

const nodeFilePath = '/tmp/TestNode.node.ts';
const nonNodeFilePath = '/tmp/SomeHelper.ts';

function createNodeCode(withIcon: boolean): string {
	const iconLine = withIcon ? "\n\t\ticon: 'file:testNode.svg'," : '';
	return `
import type { INodeType } from 'n8n-workflow';

export class TestNode implements INodeType {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['transform'],
		version: 1,
		description: 'Test',${iconLine}
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};
}`;
}

function createNodeCodeWithLightDarkIcon(): string {
	return `
import type { INodeType } from 'n8n-workflow';

export class TestNode implements INodeType {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['transform'],
		version: 1,
		description: 'Test',
		icon: { light: 'file:testNode.svg', dark: 'file:testNode.dark.svg' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};
}`;
}

function createRegularClass(): string {
	return `
export class RegularClass {
	description = {
		displayName: 'Test',
	};
}`;
}

ruleTester.run('node-class-description-icon-missing', NodeClassDescriptionIconMissingRule, {
	valid: [
		{
			name: 'node with icon defined',
			filename: nodeFilePath,
			code: createNodeCode(true),
		},
		{
			name: 'node with light/dark icon object',
			filename: nodeFilePath,
			code: createNodeCodeWithLightDarkIcon(),
		},
		{
			name: 'class not implementing INodeType is ignored',
			filename: nodeFilePath,
			code: createRegularClass(),
		},
		{
			name: 'non-.node.ts file is ignored',
			filename: nonNodeFilePath,
			code: createNodeCode(false),
		},
	],
	invalid: [
		{
			name: 'node missing icon property',
			filename: nodeFilePath,
			code: createNodeCode(false),
			errors: [
				{
					messageId: 'missingIcon',
					suggestions: [
						{
							messageId: 'addPlaceholder',
							output: `
import type { INodeType } from 'n8n-workflow';

export class TestNode implements INodeType {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['transform'],
		version: 1,
		description: 'Test',
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
		icon: "file:./icon.svg",
	};
}`,
						},
					],
				},
			],
		},
	],
});

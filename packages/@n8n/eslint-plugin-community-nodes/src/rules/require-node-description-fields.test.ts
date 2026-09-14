import { RuleTester } from '@typescript-eslint/rule-tester';

import { RequireNodeDescriptionFieldsRule } from './require-node-description-fields.js';

const ruleTester = new RuleTester();

const nodeFilePath = '/tmp/TestNode.node.ts';
const nonNodeFilePath = '/tmp/SomeHelper.ts';

function createFullNode(): string {
	return `
import type { INodeType } from 'n8n-workflow';

export class TestNode implements INodeType {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		icon: 'file:testNode.svg',
		group: ['transform'],
		version: 1,
		description: 'Test node description',
		subtitle: '={{$parameter["operation"]}}',
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};
}`;
}

function createNodeMissingSubtitle(): string {
	return `
import type { INodeType } from 'n8n-workflow';

export class TestNode implements INodeType {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		icon: 'file:testNode.svg',
		group: ['transform'],
		version: 1,
		description: 'Test node description',
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};
}`;
}

function createNodeMissingIconAndSubtitle(): string {
	return `
import type { INodeType } from 'n8n-workflow';

export class TestNode implements INodeType {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['transform'],
		version: 1,
		description: 'Test node description',
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};
}`;
}

function createNodeExtendsBase(): string {
	return `
export class TestNode extends Node {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		icon: 'file:testNode.svg',
		group: ['transform'],
		version: 1,
		description: 'Test node description',
		subtitle: '={{$parameter["operation"]}}',
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};
}`;
}

function createNodeExtendsBaseMissingSubtitle(): string {
	return `
export class TestNode extends Node {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		icon: 'file:testNode.svg',
		group: ['transform'],
		version: 1,
		description: 'Test node description',
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};
}`;
}

function createNodeWithOnlyIconAndSubtitle(): string {
	return `
import type { INodeType } from 'n8n-workflow';

export class TestNode implements INodeType {
	description = {
		icon: 'file:testNode.svg',
		subtitle: '={{$parameter["operation"]}}',
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

ruleTester.run('require-node-description-fields', RequireNodeDescriptionFieldsRule, {
	valid: [
		{
			name: 'node with all required fields',
			filename: nodeFilePath,
			code: createFullNode(),
		},
		{
			name: 'class extending Node with all required fields',
			filename: nodeFilePath,
			code: createNodeExtendsBase(),
		},
		{
			name: 'node with only icon and subtitle passes (other fields enforced by tsc)',
			filename: nodeFilePath,
			code: createNodeWithOnlyIconAndSubtitle(),
		},
		{
			name: 'class not implementing INodeType is ignored',
			filename: nodeFilePath,
			code: createRegularClass(),
		},
		{
			name: 'non-.node.ts file is ignored',
			filename: nonNodeFilePath,
			code: createNodeMissingSubtitle(),
		},
	],
	invalid: [
		{
			name: 'node missing subtitle',
			filename: nodeFilePath,
			code: createNodeMissingSubtitle(),
			errors: [{ messageId: 'missingField', data: { field: 'subtitle' } }],
		},
		{
			name: 'node missing icon and subtitle',
			filename: nodeFilePath,
			code: createNodeMissingIconAndSubtitle(),
			errors: [{ messageId: 'missingFields', data: { fields: '`icon`, `subtitle`' } }],
		},
		{
			name: 'class extending Node missing subtitle',
			filename: nodeFilePath,
			code: createNodeExtendsBaseMissingSubtitle(),
			errors: [{ messageId: 'missingField', data: { field: 'subtitle' } }],
		},
	],
});

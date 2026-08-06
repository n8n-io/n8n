import { RuleTester } from '@typescript-eslint/rule-tester';

import { ValidCodexCategoriesRule } from './valid-codex-categories.js';

const ruleTester = new RuleTester();

function createNodeCode(codex: string): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['input'],
		version: 1,
		description: 'A test node',
		defaults: { name: 'Test Node' },
		inputs: [],
		outputs: [],
		${codex}
		properties: [],
	};
}`;
}

function createNonNodeClass(): string {
	return `
export class RegularClass {
	codex = {
		categories: ['NotARealCategory'],
	};
}`;
}

function createNonINodeTypeClass(): string {
	return `
export class NotANode {
	description = {
		displayName: 'Not A Node',
		codex: {
			categories: ['NotARealCategory'],
		},
	};
}`;
}

ruleTester.run('valid-codex-categories', ValidCodexCategoriesRule, {
	valid: [
		{
			name: 'node without a codex property',
			code: createNodeCode(''),
		},
		{
			name: 'node with valid categories only',
			code: createNodeCode(`codex: {
			categories: ['Core Nodes'],
		},`),
		},
		{
			name: 'node with valid categories and subcategories',
			code: createNodeCode(`codex: {
			categories: ['Core Nodes'],
			subcategories: {
				'Core Nodes': ['Helpers'],
			},
		},`),
		},
		{
			name: 'AI node with valid categories and subcategories',
			code: createNodeCode(`codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Agents', 'Tools'],
			},
		},`),
		},
		{
			name: 'non-node file ignored',
			code: createNonNodeClass(),
		},
		{
			name: 'non-INodeType class ignored',
			code: createNonINodeTypeClass(),
		},
	],
	invalid: [
		{
			name: 'unknown category with no close match',
			code: createNodeCode(`codex: {
			categories: ['TotallyMadeUp'],
		},`),
			errors: [
				{
					messageId: 'unknownCategory',
					data: { value: 'TotallyMadeUp' },
					suggestions: [],
				},
			],
		},
		{
			name: 'unknown category that is a typo of a known one — suggestion offered',
			code: createNodeCode(`codex: {
			categories: ['Core Node'],
		},`),
			errors: [
				{
					messageId: 'unknownCategory',
					data: { value: 'Core Node' },
					suggestions: [
						{
							messageId: 'didYouMean',
							data: { suggestedName: 'Core Nodes' },
							output: createNodeCode(`codex: {
			categories: ["Core Nodes"],
		},`),
						},
					],
				},
			],
		},
		{
			name: 'unknown subcategory value nested under a valid AI category — the CE-2027 scenario',
			code: createNodeCode(`codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Agents & Tools', 'Tools'],
			},
		},`),
			errors: [
				{
					messageId: 'unknownSubcategory',
					data: { value: 'Agents & Tools' },
					suggestions: [],
				},
			],
		},
		{
			name: 'unknown subcategory that is a typo of a known one — suggestion offered',
			code: createNodeCode(`codex: {
			categories: ['Core Nodes'],
			subcategories: {
				'Core Nodes': ['Helper'],
			},
		},`),
			errors: [
				{
					messageId: 'unknownSubcategory',
					data: { value: 'Helper' },
					suggestions: [
						{
							messageId: 'didYouMean',
							data: { suggestedName: 'Helpers' },
							output: createNodeCode(`codex: {
			categories: ['Core Nodes'],
			subcategories: {
				'Core Nodes': ["Helpers"],
			},
		},`),
						},
					],
				},
			],
		},
		{
			name: 'unknown category used as a subcategories key',
			code: createNodeCode(`codex: {
			categories: ['Core Nodes'],
			subcategories: {
				NotARealCategory: ['Helpers'],
			},
		},`),
			errors: [
				{
					messageId: 'unknownSubcategoryKey',
					data: { value: 'NotARealCategory' },
				},
			],
		},
		{
			name: 'subcategories declared as a bare array instead of a category map',
			code: createNodeCode(`codex: {
			categories: ['Core Nodes'],
			subcategories: ['Helpers'],
		},`),
			errors: [
				{
					messageId: 'invalidSubcategoriesShape',
				},
			],
		},
	],
});

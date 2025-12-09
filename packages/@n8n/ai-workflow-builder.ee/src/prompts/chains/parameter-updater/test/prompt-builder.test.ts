import type { INodeTypeDescription } from 'n8n-workflow';

import {
	buildParameterUpdatePrompt,
	estimatePromptTokens,
	hasResourceLocatorParameters,
} from '../prompt-builder';

// Mock node type definition
const mockSetNodeDefinition: INodeTypeDescription = {
	displayName: 'Set',
	name: 'n8n-nodes-base.set',
	group: ['transform'],
	version: 1,
	description: 'Set values',
	defaults: { name: 'Set' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Assignments',
			name: 'assignments',
			type: 'fixedCollection',
			default: {},
			typeOptions: { multipleValues: true },
			options: [],
		},
	],
};

const mockIfNodeDefinition: INodeTypeDescription = {
	displayName: 'IF',
	name: 'n8n-nodes-base.if',
	group: ['transform'],
	version: 1,
	description: 'Conditional logic',
	defaults: { name: 'IF' },
	inputs: ['main'],
	outputs: ['main', 'main'],
	properties: [
		{
			displayName: 'Conditions',
			name: 'conditions',
			type: 'filter',
			default: {},
		},
	],
};

const mockToolNodeDefinition: INodeTypeDescription = {
	displayName: 'Gmail Tool',
	name: 'gmailTool',
	group: ['output'],
	version: 1,
	description: 'Send emails via Gmail',
	defaults: { name: 'Gmail Tool' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'To',
			name: 'sendTo',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Subject',
			name: 'subject',
			type: 'string',
			default: '',
		},
	],
};

describe('buildParameterUpdatePrompt', () => {
	it('should include Set node guide for Set nodes', () => {
		const prompt = buildParameterUpdatePrompt({
			nodeType: 'n8n-nodes-base.set',
			nodeDefinition: mockSetNodeDefinition,
			requestedChanges: ['Set message to Hello'],
		});

		expect(prompt).toContain('Set Node Updates - Comprehensive Type Handling Guide');
		expect(prompt).toContain('Assignment Structure');
	});

	it('should include IF node guide for IF nodes', () => {
		const prompt = buildParameterUpdatePrompt({
			nodeType: 'n8n-nodes-base.if',
			nodeDefinition: mockIfNodeDefinition,
			requestedChanges: ['Check if status equals active'],
		});

		expect(prompt).toContain('IF Node Updates - Comprehensive Guide');
		expect(prompt).toContain('Complete Operator Reference');
	});

	it('should include tool node guide for tool nodes', () => {
		const prompt = buildParameterUpdatePrompt({
			nodeType: 'gmailTool',
			nodeDefinition: mockToolNodeDefinition,
			requestedChanges: ['Send email to user'],
		});

		expect(prompt).toContain('$fromAI Expression Support for Tool Nodes');
		expect(prompt).toContain('Gmail Tool');
	});

	it('should include resource locator guide when keywords are mentioned', () => {
		const prompt = buildParameterUpdatePrompt({
			nodeType: 'n8n-nodes-base.slack',
			nodeDefinition: {} as INodeTypeDescription,
			requestedChanges: ['Send to channel #general'],
		});

		expect(prompt).toContain('ResourceLocator Parameter Handling');
	});

	it('should respect includeExamples option', () => {
		const promptWithExamples = buildParameterUpdatePrompt({
			nodeType: 'n8n-nodes-base.set',
			nodeDefinition: mockSetNodeDefinition,
			requestedChanges: ['Set value'],
			options: { includeExamples: true },
		});

		const promptWithoutExamples = buildParameterUpdatePrompt({
			nodeType: 'n8n-nodes-base.set',
			nodeDefinition: mockSetNodeDefinition,
			requestedChanges: ['Set value'],
			options: { includeExamples: false },
		});

		expect(promptWithExamples.length).toBeGreaterThan(promptWithoutExamples.length);
		expect(promptWithoutExamples).not.toContain('Relevant Examples');
	});

	it('should keep prompt size reasonable', () => {
		const prompt = buildParameterUpdatePrompt({
			nodeType: 'n8n-nodes-base.httpRequest',
			nodeDefinition: {} as INodeTypeDescription,
			requestedChanges: ['Add API key header', 'Set body parameters'],
		});

		const tokens = estimatePromptTokens(prompt);
		expect(tokens).toBeLessThan(3500); // Should stay under budget
		expect(tokens).toBeGreaterThan(1000); // Should have substantial content
	});
});

describe('estimatePromptTokens', () => {
	it('should estimate tokens correctly', () => {
		const testString = 'a'.repeat(400); // 400 characters
		const estimate = estimatePromptTokens(testString);
		expect(estimate).toBe(100); // 400 / 4 = 100
	});
});

describe('hasResourceLocatorParameters', () => {
	it('should detect resource locator parameters', () => {
		const nodeWithResourceLocator: INodeTypeDescription = {
			...mockSetNodeDefinition,
			properties: [
				{
					displayName: 'Channel',
					name: 'channelId',
					type: 'resourceLocator',
					default: { mode: 'list', value: '' },
				},
			],
		};

		const hasResourceLocator = hasResourceLocatorParameters(nodeWithResourceLocator);
		expect(hasResourceLocator).toBe(true);

		const noResourceLocator = hasResourceLocatorParameters(mockSetNodeDefinition);
		expect(noResourceLocator).toBe(true); // mockSetNodeDefinition has fixedCollection which returns true
	});

	it('should return false for node without resource locator or fixedCollection', () => {
		const nodeWithoutResourceLocator: INodeTypeDescription = {
			...mockSetNodeDefinition,
			properties: [
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
				},
			],
		};

		const hasResourceLocator = hasResourceLocatorParameters(nodeWithoutResourceLocator);
		expect(hasResourceLocator).toBe(false);
	});
});

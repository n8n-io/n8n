import type { INodeTypeDescription } from 'n8n-workflow';

import { ParameterUpdatePromptBuilder } from './prompt-builder';

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

describe('ParameterUpdatePromptBuilder', () => {
	describe('buildSystemPrompt', () => {
		it('should include Set node guide for Set nodes', () => {
			const prompt = ParameterUpdatePromptBuilder.buildSystemPrompt({
				nodeType: 'n8n-nodes-base.set',
				nodeDefinition: mockSetNodeDefinition,
				requestedChanges: ['Set message to Hello'],
			});

			expect(prompt).toContain('Set Node Updates - Comprehensive Type Handling Guide');
			expect(prompt).toContain('Assignment Structure');
		});

		it('should include IF node guide for IF nodes', () => {
			const prompt = ParameterUpdatePromptBuilder.buildSystemPrompt({
				nodeType: 'n8n-nodes-base.if',
				nodeDefinition: mockIfNodeDefinition,
				requestedChanges: ['Check if status equals active'],
			});

			expect(prompt).toContain('IF Node Updates - Comprehensive Guide');
			expect(prompt).toContain('Complete Operator Reference');
		});

		it('should include tool node guide for tool nodes', () => {
			const prompt = ParameterUpdatePromptBuilder.buildSystemPrompt({
				nodeType: 'gmailTool',
				nodeDefinition: mockToolNodeDefinition,
				requestedChanges: ['Send email to user'],
			});

			expect(prompt).toContain('$fromAI Expression Support for Tool Nodes');
			expect(prompt).toContain('Gmail Tool');
		});

		it('should include resource locator guide when keywords are mentioned', () => {
			const prompt = ParameterUpdatePromptBuilder.buildSystemPrompt({
				nodeType: 'n8n-nodes-base.slack',
				nodeDefinition: {} as INodeTypeDescription,
				requestedChanges: ['Send to channel #general'],
			});

			expect(prompt).toContain('ResourceLocator Parameter Handling');
		});

		it('should estimate tokens correctly', () => {
			const testString = 'a'.repeat(400); // 400 characters
			const estimate = ParameterUpdatePromptBuilder.estimateTokens(testString);
			expect(estimate).toBe(100); // 400 / 4 = 100
		});

		it('should respect includeExamples option', () => {
			const promptWithExamples = ParameterUpdatePromptBuilder.buildSystemPrompt({
				nodeType: 'n8n-nodes-base.set',
				nodeDefinition: mockSetNodeDefinition,
				requestedChanges: ['Set value'],
				options: { includeExamples: true },
			});

			const promptWithoutExamples = ParameterUpdatePromptBuilder.buildSystemPrompt({
				nodeType: 'n8n-nodes-base.set',
				nodeDefinition: mockSetNodeDefinition,
				requestedChanges: ['Set value'],
				options: { includeExamples: false },
			});

			expect(promptWithExamples.length).toBeGreaterThan(promptWithoutExamples.length);
			expect(promptWithoutExamples).not.toContain('Relevant Examples');
		});

		it('should keep prompt size reasonable', () => {
			const prompt = ParameterUpdatePromptBuilder.buildSystemPrompt({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeDefinition: {} as INodeTypeDescription,
				requestedChanges: ['Add API key header', 'Set body parameters'],
			});

			const tokens = ParameterUpdatePromptBuilder.estimateTokens(prompt);
			expect(tokens).toBeLessThan(3500); // Should stay under budget
			expect(tokens).toBeGreaterThan(1000); // Should have substantial content
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

			const hasResourceLocator =
				ParameterUpdatePromptBuilder.hasResourceLocatorParameters(nodeWithResourceLocator);
			expect(hasResourceLocator).toBe(true);

			const noResourceLocator =
				ParameterUpdatePromptBuilder.hasResourceLocatorParameters(mockSetNodeDefinition);
			expect(noResourceLocator).toBe(false);
		});
	});
});

// Run basic tests if this file is executed directly
if (require.main === module) {
	console.log('Running prompt builder tests...');

	// Test 1: Set node prompt
	const setPrompt = ParameterUpdatePromptBuilder.buildSystemPrompt({
		nodeType: 'n8n-nodes-base.set',
		nodeDefinition: mockSetNodeDefinition,
		requestedChanges: ['Set message to Hello World'],
		options: { verbose: true },
	});
	console.log(
		`\n✓ Set node prompt generated (${ParameterUpdatePromptBuilder.estimateTokens(setPrompt)} tokens)`,
	);

	// Test 2: Tool node prompt
	const toolPrompt = ParameterUpdatePromptBuilder.buildSystemPrompt({
		nodeType: 'gmailTool',
		nodeDefinition: mockToolNodeDefinition,
		requestedChanges: ['Send email with AI-generated content'],
		options: { verbose: true },
	});
	console.log(
		`✓ Tool node prompt generated (${ParameterUpdatePromptBuilder.estimateTokens(toolPrompt)} tokens)`,
	);

	// Test 3: Complex prompt with multiple features
	const complexPrompt = ParameterUpdatePromptBuilder.buildSystemPrompt({
		nodeType: 'n8n-nodes-base.httpRequest',
		nodeDefinition: {} as INodeTypeDescription,
		requestedChanges: ['Add authentication header', 'Set request body', 'Use channel from Slack'],
		hasResourceLocatorParams: true,
		options: { verbose: true },
	});
	console.log(
		`✓ Complex prompt generated (${ParameterUpdatePromptBuilder.estimateTokens(complexPrompt)} tokens)`,
	);

	console.log('\n✅ All tests passed!');
}

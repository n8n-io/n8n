import type { INodeTypeDescription } from 'n8n-workflow';

import { NodeTypeParser } from '../node-type-parser';

// Mock node with array version (like OpenAI V2)
const mockOpenAiNode: INodeTypeDescription = {
	name: '@n8n/n8n-nodes-langchain.openAi',
	displayName: 'OpenAI',
	description: 'Message an assistant or GPT, analyze images, generate audio, etc.',
	group: ['transform'],
	version: [2, 2.1], // Array version - this is the key part of the test
	defaults: { name: 'OpenAI' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Text', value: 'text' },
				{ name: 'Image', value: 'image' },
			],
			default: 'text',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: ['text'] } },
			options: [
				{ name: 'Message a Model', value: 'response' },
				{ name: 'Classify Text', value: 'classify' },
			],
			default: 'response',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: ['image'] } },
			options: [{ name: 'Generate', value: 'generate' }],
			default: 'generate',
		},
	],
};

describe('NodeTypeParser', () => {
	describe('getNodeType with array versions', () => {
		it('should find node when version is in the array', () => {
			const parser = new NodeTypeParser([mockOpenAiNode]);

			// Node has version: [2, 2.1], should find it when searching for 2.1
			const result = parser.getNodeType('@n8n/n8n-nodes-langchain.openAi', 2.1);

			expect(result).not.toBeNull();
			expect(result?.name).toBe('@n8n/n8n-nodes-langchain.openAi');
			expect(result?.displayName).toBe('OpenAI');
		});

		it('should find node when searching for any version in the array', () => {
			const parser = new NodeTypeParser([mockOpenAiNode]);

			// Should find for version 2 (first in array)
			const result2 = parser.getNodeType('@n8n/n8n-nodes-langchain.openAi', 2);
			expect(result2).not.toBeNull();

			// Should find for version 2.1 (second in array)
			const result21 = parser.getNodeType('@n8n/n8n-nodes-langchain.openAi', 2.1);
			expect(result21).not.toBeNull();
		});

		it('should return null for version not in array', () => {
			const parser = new NodeTypeParser([mockOpenAiNode]);

			// Node has version: [2, 2.1], should NOT find version 1
			const result = parser.getNodeType('@n8n/n8n-nodes-langchain.openAi', 1);

			expect(result).toBeNull();
		});
	});

	describe('getNodeType without version specified', () => {
		it('should return node with highest version when no version specified and multiple descriptions exist', () => {
			// Simulate versioned node: SetV1 (versions 1,2) and SetV2 (versions 3, 3.4)
			// Inserted in order that puts the older description LAST
			const setV1: INodeTypeDescription = {
				name: 'n8n-nodes-base.set',
				displayName: 'Set',
				description: 'Old description',
				group: ['input'],
				version: [1, 2],
				defaults: { name: 'Set' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
			};
			const setV2: INodeTypeDescription = {
				name: 'n8n-nodes-base.set',
				displayName: 'Edit Fields (Set)',
				description: 'New description',
				group: ['input'],
				version: [3, 3.4],
				defaults: { name: 'Edit Fields (Set)' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						noDataExpression: true,
						options: [
							{ name: 'Manual', value: 'manual' },
							{ name: 'Raw', value: 'raw' },
						],
						default: 'manual',
					},
				],
			};
			// Insert V2 first, V1 last — previously would return V1
			const parser = new NodeTypeParser([setV2, setV1]);
			const result = parser.getNodeType('n8n-nodes-base.set');
			expect(result?.displayName).toBe('Edit Fields (Set)');
			// Verify it's the v3.4 description, not v2
			expect(Array.isArray(result?.version) && result.version.includes(3.4)).toBe(true);
		});
	});
});

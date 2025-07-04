import { describe, it, expect, beforeEach } from '@jest/globals';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeTypeDescription } from 'n8n-workflow';

import { NodeDetailsTool } from '../node-details.tool';
import { createMockToolContext } from './test-utils/mock-context';
import { createMockNodeTypes } from './test-utils/node-mocks';

describe('NodeDetailsTool', () => {
	let nodeTypes: INodeTypeDescription[];
	let tool: NodeDetailsTool;

	beforeEach(() => {
		nodeTypes = createMockNodeTypes();
		tool = new NodeDetailsTool(nodeTypes);
	});

	describe('execute', () => {
		it('should return node details for a valid node', async () => {
			const result = await tool['execute'](
				{
					nodeName: 'n8n-nodes-base.httpRequest',
					withParameters: false,
					withConnections: true,
				},
				createMockToolContext(nodeTypes),
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.found).toBe(true);
				expect(result.data.details.name).toBe('n8n-nodes-base.httpRequest');
				expect(result.data.details.displayName).toBe('HTTP Request');
				expect(result.data.details.description).toContain('HTTP request');
				expect(result.data.message).toContain('<node_details>');
				expect(result.data.message).toContain('<connections>');
			}
		});

		it('should return error for non-existent node', async () => {
			const result = await tool['execute'](
				{
					nodeName: 'non.existent.node',
					withParameters: false,
					withConnections: true,
				},
				createMockToolContext(nodeTypes),
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('Node type "non.existent.node" not found');
				expect(result.error.code).toBe('NODE_NOT_FOUND');
			}
		});

		it('should include parameters when requested', async () => {
			const result = await tool['execute'](
				{
					nodeName: 'n8n-nodes-base.httpRequest',
					withParameters: true,
					withConnections: false,
				},
				createMockToolContext(nodeTypes),
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.message).toContain('<properties>');
				expect(result.data.message).toContain('<property>');
				expect(result.data.message).not.toContain('<connections>');
			}
		});

		it('should handle AI sub-nodes correctly', async () => {
			const result = await tool['execute'](
				{
					nodeName: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					withParameters: false,
					withConnections: true,
				},
				createMockToolContext(nodeTypes),
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.details.name).toBe('@n8n/n8n-nodes-langchain.lmChatOpenAi');
				expect(result.data.details.displayName).toBe('OpenAI Chat Model');
				expect(result.data.message).toContain(`type="${NodeConnectionTypes.AiLanguageModel}"`);
			}
		});
	});

	describe('formatNodeDetails', () => {
		it('should format basic node details', () => {
			const details = {
				name: 'test.node',
				displayName: 'Test Node',
				description: 'A test node',
				properties: [],
				inputs: ['main'] as any,
				outputs: ['main'] as any,
			};

			const formatted = tool['formatNodeDetails'](details, false, false);

			expect(formatted).toContain('<name>test.node</name>');
			expect(formatted).toContain('<display_name>Test Node</display_name>');
			expect(formatted).toContain('<description>A test node</description>');
			expect(formatted).not.toContain('<properties>');
			expect(formatted).not.toContain('<connections>');
		});

		it('should include subtitle when present', () => {
			const details = {
				name: 'test.node',
				displayName: 'Test Node',
				description: 'A test node',
				subtitle: 'Test subtitle',
				properties: [],
				inputs: ['main'] as any,
				outputs: ['main'] as any,
			};

			const formatted = tool['formatNodeDetails'](details);

			expect(formatted).toContain('<subtitle>Test subtitle</subtitle>');
		});

		it('should format complex inputs and outputs', () => {
			const details = {
				name: 'test.node',
				displayName: 'Test Node',
				description: 'A test node',
				properties: [],
				inputs: [
					'main',
					{
						type: NodeConnectionTypes.AiTool,
						displayName: 'Tools',
						required: false,
					},
				] as any,
				outputs: [
					'main',
					{
						type: NodeConnectionTypes.AiLanguageModel,
						displayName: 'Language Model',
					},
				] as any,
			};

			const formatted = tool['formatNodeDetails'](details, false, true);

			expect(formatted).toContain('<input>main</input>');
			expect(formatted).toContain(
				`<input type="${NodeConnectionTypes.AiTool}" displayName="Tools" required="false" />`,
			);
			expect(formatted).toContain('<output>main</<input type>');
			expect(formatted).toContain(
				`<output>{type="${NodeConnectionTypes.AiLanguageModel}" displayName="Language Model" required=false}/>`,
			);
		});
	});

	describe('formatSuccessMessage', () => {
		it('should return the message from output', () => {
			const output = {
				details: {} as any,
				found: true,
				message: 'Test message',
			};

			const message = tool['formatSuccessMessage'](output);
			expect(message).toBe('Test message');
		});
	});

	describe('tool metadata', () => {
		it('should have correct name and description', () => {
			expect(tool['name']).toBe('get_node_details');
			expect(tool['description']).toContain(
				'Get detailed information about a specific n8n node type',
			);
		});
	});
});

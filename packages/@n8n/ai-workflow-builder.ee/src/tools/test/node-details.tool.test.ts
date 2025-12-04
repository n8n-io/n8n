import type { INodeTypeDescription } from 'n8n-workflow';

import {
	nodeTypes,
	parseToolResult,
	extractProgressMessages,
	findProgressMessage,
	createToolConfigWithWriter,
	createToolConfig,
	expectToolSuccess,
	expectToolError,
	buildNodeDetailsInput,
	expectNodeDetails,
	expectXMLTag,
	type ParsedToolContent,
	createNodeType,
} from '../../../test/test-utils';
import { createNodeDetailsTool } from '../node-details.tool';

// Mock LangGraph dependencies
jest.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: jest.fn(),
	Command: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
		content: JSON.stringify(params),
	})),
}));

describe('NodeDetailsTool', () => {
	let nodeTypesList: INodeTypeDescription[];
	let nodeDetailsTool: ReturnType<typeof createNodeDetailsTool>['tool'];

	beforeEach(() => {
		jest.clearAllMocks();

		nodeTypesList = [
			nodeTypes.code,
			nodeTypes.httpRequest,
			nodeTypes.webhook,
			nodeTypes.agent,
			nodeTypes.openAiModel,
			nodeTypes.setNode,
			nodeTypes.ifNode,
			nodeTypes.mergeNode,
			nodeTypes.vectorStoreNode,
		];
		nodeDetailsTool = createNodeDetailsTool(nodeTypesList).tool;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('invoke', () => {
		it('should retrieve basic node details with default options', async () => {
			const mockConfig = createToolConfigWithWriter('get_node_details', 'test-call-1');

			const result = await nodeDetailsTool.invoke(
				buildNodeDetailsInput({
					nodeName: 'n8n-nodes-base.code',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolSuccess(content, '<node_details>');

			const message = content.update.messages[0]?.kwargs.content;

			// Check basic details
			expectNodeDetails(content, {
				name: 'n8n-nodes-base.code',
				displayName: 'Code',
				description: 'Test node description',
			});

			// Check connections are included by default
			expect(message).toContain('<connections>');
			expect(message).toContain('<input>main</input>');
			expect(message).toContain('<output>main</output>');

			// Check properties are NOT included by default
			expect(message).not.toContain('<properties>');

			// Check progress messages
			const progressCalls = extractProgressMessages(mockConfig.writer);
			expect(progressCalls.length).toBeGreaterThanOrEqual(3);

			const startMessage = findProgressMessage(progressCalls, 'running', 'input');
			expect(startMessage).toBeDefined();
			expect(startMessage?.updates[0]?.data).toMatchObject({
				nodeName: 'n8n-nodes-base.code',
				withParameters: false,
				withConnections: true,
			});

			const completeMessage = findProgressMessage(progressCalls, 'completed');
			expect(completeMessage).toBeDefined();
		});

		it('should include node parameters when requested', async () => {
			const mockConfig = createToolConfig('get_node_details', 'test-call-2');

			const result = await nodeDetailsTool.invoke(
				buildNodeDetailsInput({
					nodeName: 'n8n-nodes-base.httpRequest',
					withParameters: true,
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<node_details>');

			// Check properties are included
			expect(message).toContain('<properties>');
			expect(message).toContain('"displayName": "URL"');
			expect(message).toContain('"name": "url"');
			expect(message).toContain('"displayName": "Method"');
			expect(message).toContain('"name": "method"');
		});

		it('should exclude connections when requested', async () => {
			const mockConfig = createToolConfig('get_node_details', 'test-call-3');

			const result = await nodeDetailsTool.invoke(
				buildNodeDetailsInput({
					nodeName: 'n8n-nodes-base.code',
					withConnections: false,
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<node_details>');

			// Check connections are NOT included
			expect(message).not.toContain('<connections>');
			expect(message).not.toContain('<input>');
			expect(message).not.toContain('<output>');
		});

		it('should handle node with subtitle', async () => {
			const mockConfig = createToolConfig('get_node_details', 'test-call-4');

			const result = await nodeDetailsTool.invoke(
				buildNodeDetailsInput({
					nodeName: '@n8n/n8n-nodes-langchain.vectorStore',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<node_details>');

			// Check subtitle is included
			expectXMLTag(
				message,
				'subtitle',
				'={{$parameter["mode"] === "retrieve" ? "Retrieve" : "Insert"}}',
			);
		});

		it('should handle unknown node type', async () => {
			const mockConfig = createToolConfig('get_node_details', 'test-call-5');

			const result = await nodeDetailsTool.invoke(
				buildNodeDetailsInput({
					nodeName: 'n8n-nodes-base.unknown',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			expectToolError(content, 'Error: Node type "n8n-nodes-base.unknown" not found');
		});

		it('should handle validation errors for missing required fields', async () => {
			const mockConfig = createToolConfig('get_node_details', 'test-call-6');

			try {
				await nodeDetailsTool.invoke(
					{
						// Missing nodeName
						withParameters: true,
					} as Parameters<typeof nodeDetailsTool.invoke>[0],
					mockConfig,
				);

				expect(true).toBe(false);
			} catch (error) {
				expect(error).toBeDefined();
				expect(String(error)).toContain('Received tool input did not match expected schema');
			}
		});

		it('should handle nodes with no inputs (triggers)', async () => {
			const mockConfig = createToolConfig('get_node_details', 'test-call-7');

			const result = await nodeDetailsTool.invoke(
				buildNodeDetailsInput({
					nodeName: 'n8n-nodes-base.webhook',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<node_details>');

			// Check for "none" inputs
			expect(message).toContain('<inputs>none</inputs>');
			expect(message).toContain('<output>main</output>');
		});

		it('should handle nodes with multiple inputs/outputs', async () => {
			const mockConfig = createToolConfig('get_node_details', 'test-call-8');

			const result = await nodeDetailsTool.invoke(
				buildNodeDetailsInput({
					nodeName: 'n8n-nodes-base.merge',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<node_details>');

			// Check multiple inputs
			expect(message).toContain('<connections>');
			const inputMatches = message.match(/<input>main<\/input>/g);
			expect(inputMatches?.length).toBe(2);
		});

		it('should handle nodes with array outputs (If node)', async () => {
			const mockConfig = createToolConfig('get_node_details', 'test-call-9');

			const result = await nodeDetailsTool.invoke(
				buildNodeDetailsInput({
					nodeName: 'n8n-nodes-base.if',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<node_details>');

			// Check multiple outputs
			const outputMatches = message.match(/<output>main<\/output>/g);
			expect(outputMatches?.length).toBe(2);
		});

		it('should handle expression-based inputs/outputs', async () => {
			const mockConfig = createToolConfig('get_node_details', 'test-call-10');

			const result = await nodeDetailsTool.invoke(
				buildNodeDetailsInput({
					nodeName: '@n8n/n8n-nodes-langchain.vectorStore',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<node_details>');

			// Check expression-based inputs/outputs are shown as expressions
			expect(message).toContain('<input>={{ ((parameter)');
			expect(message).toContain('<output>={{ ((parameter)');
		});

		it('should truncate very long properties', async () => {
			// Create a node with many properties
			const nodeWithManyProps = createNodeType({
				displayName: 'Node With Many Properties',
				name: 'test.manyProps',
				properties: Array.from({ length: 50 }, (_, i) => ({
					displayName: `Property ${i}`,
					name: `prop${i}`,
					type: 'string',
					default: `Default value for property ${i}`,
					description: `This is a very long description for property ${i} that should help make the properties section exceed 1000 characters when serialized to JSON`,
				})),
			});

			const testNodeTypes = [...nodeTypesList, nodeWithManyProps];
			const testTool = createNodeDetailsTool(testNodeTypes).tool;

			const mockConfig = createToolConfig('get_node_details', 'test-call-11');

			const result = await testTool.invoke(
				buildNodeDetailsInput({
					nodeName: 'test.manyProps',
					withParameters: true,
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<node_details>');

			// Check that properties were truncated
			expect(message).toContain('<properties>');
			expect(message).toContain('... Rest of properties omitted');
		});

		it('should handle AI sub-nodes properly', async () => {
			const mockConfig = createToolConfig('get_node_details', 'test-call-12');

			const result = await nodeDetailsTool.invoke(
				buildNodeDetailsInput({
					nodeName: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<node_details>');

			// Check AI node specifics
			expectNodeDetails(content, {
				name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				displayName: 'OpenAI Chat Model',
			});

			// Check AI outputs
			expect(message).toContain('<inputs>none</inputs>');
			expect(message).toContain('<output>ai_languageModel</output>');
		});

		it('should handle complex node configurations', async () => {
			const complexNode = createNodeType({
				displayName: 'Complex Node',
				name: 'test.complex',
				subtitle: '={{ $parameter["mode"] || "default" }}',
				inputs: [
					{ displayName: 'Main Input', type: 'main' },
					{ displayName: 'AI Input', type: 'ai_tool', required: false },
				],
				outputs: [
					{ displayName: 'Success', type: 'main' },
					{ displayName: 'Error', type: 'main' },
				],
				outputNames: ['success', 'error'],
				properties: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{ name: 'Default', value: 'default' },
							{ name: 'Advanced', value: 'advanced' },
						],
						default: 'default',
					},
				],
			});

			const testNodeTypes = [...nodeTypesList, complexNode];
			const testTool = createNodeDetailsTool(testNodeTypes).tool;

			const mockConfig = createToolConfig('get_node_details', 'test-call-13');

			const result = await testTool.invoke(
				buildNodeDetailsInput({
					nodeName: 'test.complex',
					withParameters: true,
					withConnections: true,
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<node_details>');

			// Check complex inputs/outputs formatting
			expect(message).toContain('<input>{"displayName":"Main Input","type":"main"}</input>');
			expect(message).toContain(
				'<input>{"displayName":"AI Input","type":"ai_tool","required":false}</input>',
			);
			expect(message).toContain('<output>{"displayName":"Success","type":"main"}</output>');
			expect(message).toContain('<output>{"displayName":"Error","type":"main"}</output>');
		});

		it('should handle both parameters and connections together', async () => {
			const mockConfig = createToolConfig('get_node_details', 'test-call-14');

			const result = await nodeDetailsTool.invoke(
				buildNodeDetailsInput({
					nodeName: 'n8n-nodes-base.set',
					withParameters: true,
					withConnections: true,
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<node_details>');

			// Check both sections are present
			expect(message).toContain('<properties>');
			expect(message).toContain('<connections>');

			// Check ordering - properties should come before connections
			const propsIndex = message.indexOf('<properties>');
			const connectionsIndex = message.indexOf('<connections>');
			expect(propsIndex).toBeLessThan(connectionsIndex);
		});

		it('should format empty outputs correctly', async () => {
			const noOutputNode = createNodeType({
				displayName: 'No Output Node',
				name: 'test.noOutput',
				inputs: ['main'],
				outputs: [],
			});

			const testNodeTypes = [...nodeTypesList, noOutputNode];
			const testTool = createNodeDetailsTool(testNodeTypes).tool;

			const mockConfig = createToolConfig('get_node_details', 'test-call-15');

			const result = await testTool.invoke(
				buildNodeDetailsInput({
					nodeName: 'test.noOutput',
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<node_details>');

			// Check empty outputs formatting
			expect(message).toContain('<outputs>none</outputs>');
		});

		it('should retrieve the correct node version when multiple versions exist', async () => {
			// Create multiple versions of the same node type
			const setNodeV1 = createNodeType({
				name: 'n8n-nodes-base.set',
				displayName: 'Set V1',
				version: 1,
				description: 'Set node version 1',
				properties: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{ name: 'Manual', value: 'manual' },
							{ name: 'Automatic', value: 'automatic' },
						],
						default: 'manual',
					},
				],
			});

			const setNodeV2 = createNodeType({
				name: 'n8n-nodes-base.set',
				displayName: 'Set V2',
				version: 2,
				description: 'Set node version 2 with enhanced features',
				properties: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{ name: 'Manual', value: 'manual' },
							{ name: 'Automatic', value: 'automatic' },
							{ name: 'Advanced', value: 'advanced' },
						],
						default: 'manual',
					},
				],
			});

			const setNodeV3 = createNodeType({
				name: 'n8n-nodes-base.set',
				displayName: 'Set V3',
				version: 3,
				description: 'Set node version 3 with latest improvements',
				properties: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						options: [
							{ name: 'Manual', value: 'manual' },
							{ name: 'Automatic', value: 'automatic' },
							{ name: 'Advanced', value: 'advanced' },
							{ name: 'Expert', value: 'expert' },
						],
						default: 'manual',
					},
				],
			});

			const testNodeTypes = [setNodeV1, setNodeV2, setNodeV3, nodeTypes.code];
			const testTool = createNodeDetailsTool(testNodeTypes).tool;

			const mockConfig = createToolConfig('get_node_details', 'test-call-16');

			// Request version 2 specifically
			const result = await testTool.invoke(
				buildNodeDetailsInput({
					nodeName: 'n8n-nodes-base.set',
					nodeVersion: 2,
					withParameters: true,
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expectToolSuccess(content, '<node_details>');

			// Verify we got version 2 details
			expectNodeDetails(content, {
				name: 'n8n-nodes-base.set',
				displayName: 'Set V2',
				description: 'Set node version 2 with enhanced features',
			});

			// Check that properties from v2 are present (3 options, not 2 from v1 or 4 from v3)
			expect(message).toContain('<properties>');
			expect(message).toContain('Advanced');
			expect(message).not.toContain('Expert'); // This is only in v3
		});

		it('should fail when requesting a non-existent node version', async () => {
			const mockConfig = createToolConfig('get_node_details', 'test-call-17');

			const result = await nodeDetailsTool.invoke(
				buildNodeDetailsInput({
					nodeName: 'n8n-nodes-base.code',
					nodeVersion: 99, // Non-existent version
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);
			expectToolError(content, 'Error: Node type "n8n-nodes-base.code" not found');
		});

		it('should retrieve correct version with array version node types', async () => {
			// Create a node that supports multiple versions in an array
			const multiVersionNode = createNodeType({
				name: 'n8n-nodes-base.multiVersion',
				displayName: 'Multi Version Node',
				version: [1, 2, 3],
				description: 'Node that supports versions 1, 2, and 3',
				properties: [
					{
						displayName: 'Setting',
						name: 'setting',
						type: 'string',
						default: '',
					},
				],
			});

			const testNodeTypes = [...nodeTypesList, multiVersionNode];
			const testTool = createNodeDetailsTool(testNodeTypes).tool;

			const mockConfig = createToolConfig('get_node_details', 'test-call-18');

			// Request version 2 from the array
			const result = await testTool.invoke(
				buildNodeDetailsInput({
					nodeName: 'n8n-nodes-base.multiVersion',
					nodeVersion: 2,
				}),
				mockConfig,
			);

			const content = parseToolResult<ParsedToolContent>(result);

			expectToolSuccess(content, '<node_details>');
			expectNodeDetails(content, {
				name: 'n8n-nodes-base.multiVersion',
				displayName: 'Multi Version Node',
				description: 'Node that supports versions 1, 2, and 3',
			});
		});
	});
});

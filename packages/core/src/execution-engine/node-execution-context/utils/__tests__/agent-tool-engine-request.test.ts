import { mock } from 'jest-mock-extended';
import type {
	INode,
	IRunExecutionData,
	INodeType,
	IExecuteFunctions,
	EngineRequest,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { makeHandleToolInvocation } from '../get-input-connection-data';

/**
 * Reproduction test for GHC-7055: Sub-agents unable to use MCP Tools due to Engine Request architecture
 *
 * Issue: When using multi-agent workflows, any tool that generates an Engine Request
 * (MCP Client Tool, Vector Store nodes in "Retrieve as Tool" mode, HITL nodes, etc.)
 * fails when connected to a sub-agent (via the Agent Tool node) with the error:
 * "Error: The Tool attempted to return an engine request, which is not supported in Agents"
 *
 * Root Cause: The Agent V3 engine request/response mechanism does not support relaying
 * EngineRequest objects through the tool serialization boundary. When Agent A calls
 * Agent B as a tool, Agent B is expected to return a string/JSON result. If Agent B's
 * tools generate engine requests, those requests cannot be passed back up through the
 * Agent Tool wrapper to the execution engine.
 *
 * Affected Node Types:
 * - MCP Client Tool nodes
 * - Vector Store nodes (Qdrant, Supabase, Pinecone, etc.) in "Retrieve Documents as Tool" mode
 * - HITL / sendAndWait nodes
 * - Community nodes with usableAsTool: true that trigger engine-level operations
 */
describe('GHC-7055: Sub-agent Engine Request Bug', () => {
	const mockWorkflow = mock<Workflow>();
	const runExecutionData = mock<IRunExecutionData>({
		resultData: { runData: {} },
	});

	describe('Tool generating Engine Request', () => {
		const toolNode = mock<INode>({
			name: 'MCP Client Tool',
			type: 'test.mcpTool',
		});

		const toolNodeType = mock<INodeType>();
		const contextFactory = jest.fn();
		const mockContext = mock<IExecuteFunctions>({
			addInputData: jest.fn(),
			addOutputData: jest.fn(),
			logger: { warn: jest.fn() },
		});

		beforeEach(() => {
			jest.clearAllMocks();
			contextFactory.mockReturnValue(mockContext);
		});

		it('should return error when tool returns engine request (reproduces GHC-7055)', async () => {
			// Simulate a tool (like MCP Client Tool or Vector Store retriever) returning an engine request
			const engineRequest: EngineRequest = {
				actions: [
					{
						actionType: 'ExecutionNodeAction',
						nodeName: 'SomeInternalNode',
						input: { query: 'test' },
						type: NodeConnectionTypes.Main,
						id: 'action-1',
						metadata: {},
					},
				],
				metadata: {},
			};

			toolNodeType.execute = jest.fn().mockResolvedValueOnce(engineRequest);

			const handleToolInvocation = makeHandleToolInvocation(
				contextFactory,
				toolNode,
				toolNodeType,
				runExecutionData,
			);

			const result = await handleToolInvocation({ query: 'search query' });

			// The error message that's returned when a tool generates an engine request
			expect(result).toBe(
				'"Error: The Tool attempted to return an engine request, which is not supported in Agents"',
			);

			// Verify the error is logged to the output
			expect(mockContext.addOutputData).toHaveBeenCalledWith(NodeConnectionTypes.AiTool, 0, [
				[
					{
						json: {
							response:
								'Error: The Tool attempted to return an engine request, which is not supported in Agents',
						},
					},
				],
			]);
		});

		it('should work correctly when tool returns regular data', async () => {
			// Control test: tool returning regular data works fine
			const normalOutput = [[{ json: { result: 'Retrieved data from MCP server' } }]];
			toolNodeType.execute = jest.fn().mockResolvedValueOnce(normalOutput);

			const handleToolInvocation = makeHandleToolInvocation(
				contextFactory,
				toolNode,
				toolNodeType,
				runExecutionData,
			);

			const result = await handleToolInvocation({ query: 'search query' });

			// Normal JSON result is returned
			expect(result).toBe('[{"result":"Retrieved data from MCP server"}]');

			expect(mockContext.addOutputData).toHaveBeenCalledWith(NodeConnectionTypes.AiTool, 0, [
				[
					{
						json: {
							response: [{ result: 'Retrieved data from MCP server' }],
						},
					},
				],
			]);
		});
	});

	describe('Architectural Context', () => {
		/**
		 * This test documents the architectural limitation:
		 *
		 * When Agent A calls Agent B (sub-agent) via Agent Tool node, and Agent B
		 * attempts to use a tool that generates an Engine Request:
		 *
		 * Flow:
		 * 1. Agent A decides to call Agent B (sub-agent) as a tool
		 * 2. Agent B receives the input and decides to call a tool (e.g., MCP Client)
		 * 3. The tool generates an Engine Request (needs engine-level operations)
		 * 4. The mapResult() function intercepts this and returns an error string
		 * 5. The error propagates back to Agent A as a tool result
		 *
		 * The limitation is in step 4: Engine Requests cannot be serialized through
		 * the Agent Tool wrapper because the wrapper expects serializable JSON data,
		 * not control-flow primitives.
		 *
		 * Workarounds (as documented in the issue):
		 * 1. Flatten the agent hierarchy - attach tools directly to top-level agent
		 * 2. Use "Call n8n Workflow" tool - gives sub-agent its own execution context
		 * 3. Pre-fetch data outside agent loop and pass as context
		 * 4. Use Agent V2 - older versions execute tools in-process without engine requests
		 */
		it('documents the limitation: engine requests cannot cross agent tool boundary', () => {
			// This is a documentation test that explains the limitation
			const limitation = {
				issue: 'GHC-7055',
				description: 'Sub-agents cannot use tools that generate Engine Requests',
				affectedTools: [
					'MCP Client Tool',
					'Vector Store nodes (in retrieve-as-tool mode)',
					'HITL / sendAndWait nodes',
					'Community nodes with usableAsTool that trigger engine operations',
				],
				rootCause:
					'Agent Tool wrapper expects serializable JSON, cannot relay Engine Request objects',
				errorMessage:
					'Error: The Tool attempted to return an engine request, which is not supported in Agents',
				workarounds: [
					'Flatten agent hierarchy - connect tools directly to top-level agent',
					'Use "Call n8n Workflow" tool - gives sub-agent own execution context',
					'Pre-fetch data outside agent loop',
					'Use Agent V2 (legacy)',
				],
			};

			expect(limitation.issue).toBe('GHC-7055');
			expect(limitation.errorMessage).toContain('engine request');
			expect(limitation.workarounds).toHaveLength(4);
		});
	});

	describe('Real-world Scenario Examples', () => {
		it('simulates MCP Client Tool in sub-agent context', async () => {
			const mcpClientNode = mock<INode>({
				name: 'MCP Client Tool',
				type: '@n8n/n8n-nodes-langchain.mcpClient',
			});

			const mcpNodeType = mock<INodeType>();
			const contextFactory = jest.fn();
			const mockContext = mock<IExecuteFunctions>({
				addInputData: jest.fn(),
				addOutputData: jest.fn(),
				logger: { warn: jest.fn() },
			});

			contextFactory.mockReturnValue(mockContext);

			// MCP Client generates an engine request to communicate with the MCP server
			const mcpEngineRequest: EngineRequest = {
				actions: [
					{
						actionType: 'ExecutionNodeAction',
						nodeName: 'MCPServer',
						input: { tool: 'search', params: { query: 'test' } },
						type: NodeConnectionTypes.AiTool,
						id: 'mcp-action-1',
						metadata: {},
					},
				],
				metadata: { mcpServer: 'notion-server' },
			};

			mcpNodeType.execute = jest.fn().mockResolvedValueOnce(mcpEngineRequest);

			const handleToolInvocation = makeHandleToolInvocation(
				contextFactory,
				mcpClientNode,
				mcpNodeType,
				runExecutionData,
			);

			const result = await handleToolInvocation({ query: 'search in notion' });

			expect(result).toContain('engine request');
			expect(result).toContain('not supported in Agents');
		});

		it('simulates Vector Store retriever in sub-agent context', async () => {
			const vectorStoreNode = mock<INode>({
				name: 'Qdrant Vector Store',
				type: '@n8n/n8n-nodes-langchain.vectorStoreQdrant',
			});

			const vectorStoreNodeType = mock<INodeType>();
			const contextFactory = jest.fn();
			const mockContext = mock<IExecuteFunctions>({
				addInputData: jest.fn(),
				addOutputData: jest.fn(),
				logger: { warn: jest.fn() },
			});

			contextFactory.mockReturnValue(mockContext);

			// Vector Store in "Retrieve as Tool" mode generates engine request
			const vectorStoreEngineRequest: EngineRequest = {
				actions: [
					{
						actionType: 'ExecutionNodeAction',
						nodeName: 'VectorStoreRetriever',
						input: { query: 'search vector db' },
						type: NodeConnectionTypes.AiRetriever,
						id: 'retriever-action-1',
						metadata: {},
					},
				],
				metadata: { vectorStore: 'qdrant', collection: 'documents' },
			};

			vectorStoreNodeType.execute = jest.fn().mockResolvedValueOnce(vectorStoreEngineRequest);

			const handleToolInvocation = makeHandleToolInvocation(
				contextFactory,
				vectorStoreNode,
				vectorStoreNodeType,
				runExecutionData,
			);

			const result = await handleToolInvocation({ query: 'find relevant documents' });

			expect(result).toContain('engine request');
			expect(result).toContain('not supported in Agents');
		});
	});
});

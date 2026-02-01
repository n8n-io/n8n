import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { waitFor } from '@testing-library/vue';
import { useToolParameters } from './useToolParameters';
import { useWorkflowsStore } from '../stores/workflows.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useNodeTypesStore } from '../stores/nodeTypes.store';
import { useAgentRequestStore } from '@n8n/stores/useAgentRequestStore';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { INode, INodeTypeDescription, Workflow } from 'n8n-workflow';
import { AI_MCP_TOOL_NODE_TYPE } from '../constants';
import { mock } from 'vitest-mock-extended';

describe('useToolParameters', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let projectsStore: MockedStore<typeof useProjectsStore>;
	let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;
	let agentRequestStore: ReturnType<typeof useAgentRequestStore>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		workflowsStore = mockedStore(useWorkflowsStore);
		projectsStore = mockedStore(useProjectsStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);
		agentRequestStore = useAgentRequestStore();

		// Setup default mocks
		projectsStore.currentProjectId = 'test-project';
		workflowsStore.workflowId = 'test-workflow';
		workflowsStore.getWorkflowExecution = null;
		agentRequestStore.getQueryValue = vi.fn().mockReturnValue(null);
	});

	describe('getToolName', () => {
		it('should replace spaces with underscores', () => {
			const node = ref<INode>({
				id: '1',
				name: 'Test Node Name',
				type: 'n8n-nodes-base.test',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			});

			const { getToolName } = useToolParameters({ node });
			expect(getToolName('Test Node Name')).toBe('Test_Node_Name');
		});

		it('should accept node object and extract name', () => {
			const testNode: INode = {
				id: '1',
				name: 'My Tool',
				type: 'n8n-nodes-base.test',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};
			const node = ref<INode>(testNode);

			const { getToolName } = useToolParameters({ node });
			expect(getToolName(testNode)).toBe('My_Tool');
		});
	});

	describe('Regular tool parameters', () => {
		it('should extract parameters from fromAI expressions', async () => {
			const testNode: INode = {
				id: '1',
				name: 'Test Tool',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					query: "={{ $fromAI('userQuery', '', 'string') }}",
					limit: "={{ $fromAI('limit', '', 'number') }}",
				},
			};
			const node = ref<INode>(testNode);

			const { parameters } = useToolParameters({ node });
			await nextTick();

			expect(parameters.value).toHaveLength(2);
			expect(parameters.value[0]).toMatchObject({
				name: 'query.userQuery',
				properties: {
					label: 'userQuery',
					type: 'text',
					required: true,
				},
			});
			expect(parameters.value[1]).toMatchObject({
				name: 'query.limit',
				properties: {
					label: 'limit',
					type: 'number',
					required: true,
				},
			});
		});

		it('should add fallback query field when no fromAI parameters exist', async () => {
			const testNode: INode = {
				id: '1',
				name: 'Test Tool',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};
			const node = ref<INode>(testNode);

			const { parameters } = useToolParameters({ node });
			await nextTick();

			expect(parameters.value).toHaveLength(1);
			expect(parameters.value[0]).toMatchObject({
				name: 'query',
				properties: {
					label: 'Query',
					type: 'text',
					required: true,
				},
			});
		});

		it('should use initial values from run data', async () => {
			const testNode: INode = {
				id: '1',
				name: 'Test Tool',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					query: "={{ $fromAI('userQuery', '', 'string') }}",
				},
			};

			workflowsStore.getWorkflowExecution = {
				data: {
					resultData: {
						runData: {
							'Test Tool': [
								{
									inputOverride: {
										[NodeConnectionTypes.AiTool]: [
											[{ json: { query: { userQuery: 'test query value' } } }],
										],
									},
								},
							],
						},
					},
				},
			} as never;

			const node = ref<INode>(testNode);

			const { parameters } = useToolParameters({ node });
			await nextTick();

			expect(parameters.value[0].initialValue).toBe('test query value');
		});

		it('should use initial values from agent request store', async () => {
			const testNode: INode = {
				id: '1',
				name: 'Test Tool',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					query: "={{ $fromAI('userQuery', '', 'string') }}",
				},
			};

			agentRequestStore.getQueryValue = vi.fn().mockReturnValue('value from agent request store');

			const node = ref<INode>(testNode);

			const { parameters } = useToolParameters({ node });
			await nextTick();

			expect(parameters.value[0].initialValue).toBe('value from agent request store');
		});

		it('should handle boolean type parameters', async () => {
			const testNode: INode = {
				id: '1',
				name: 'Test Tool',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					enabled: "={{ $fromAI('enabled', '', 'boolean') }}",
				},
			};
			const node = ref<INode>(testNode);

			const { parameters } = useToolParameters({ node });
			await nextTick();

			expect(parameters.value[0]).toMatchObject({
				name: 'query.enabled',
				properties: {
					type: 'checkbox',
					required: true,
				},
				initialValue: true,
			});
		});
	});

	describe('MCP tool parameters', () => {
		it('should load MCP tools and show tool selector', async () => {
			const mcpNode: INode = {
				id: '1',
				name: 'MCP Tool',
				type: AI_MCP_TOOL_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const mockTools = [
				{
					name: 'Tool One',
					value: 'tool-one',
					inputSchema: {
						properties: {},
					},
				},
				{
					name: 'Tool Two',
					value: 'tool-two',
					inputSchema: {
						properties: {},
					},
				},
			];

			nodeTypesStore.getNodeParameterOptions = vi.fn().mockResolvedValue(mockTools);

			const node = ref<INode>(mcpNode);

			const { parameters } = useToolParameters({ node });
			// Wait for the watcher to trigger and async operations to complete
			await waitFor(() => expect(parameters.value.length).toBeGreaterThan(0));

			expect(nodeTypesStore.getNodeParameterOptions).toHaveBeenCalledWith({
				nodeTypeAndVersion: {
					name: AI_MCP_TOOL_NODE_TYPE,
					version: 1,
				},
				path: 'parameters.includedTools',
				methodName: 'getTools',
				currentNodeParameters: {},
				credentials: undefined,
				projectId: 'test-project',
			});

			expect(parameters.value).toHaveLength(1);
			expect(parameters.value[0]).toMatchObject({
				name: 'tool_MCP_Tool_option',
				properties: {
					label: 'Tool name',
					type: 'select',
					required: true,
					options: [
						{ label: 'Tool One', value: 'tool-one', disabled: false },
						{ label: 'Tool Two', value: 'tool-two', disabled: false },
					],
				},
			});
		});

		it('should show parameters for selected MCP tool', async () => {
			const mcpNode: INode = {
				id: '1',
				name: 'MCP Tool',
				type: AI_MCP_TOOL_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const mockTools = [
				{
					name: 'Tool One',
					value: 'tool-one',
					inputSchema: {
						properties: {
							query: { type: 'string' },
							count: { type: 'number' },
						},
					},
				},
			];

			nodeTypesStore.getNodeParameterOptions = vi.fn().mockResolvedValue(mockTools);

			const node = ref<INode>(mcpNode);

			const { parameters, updateSelectedTool } = useToolParameters({ node });
			// Wait for the watcher to trigger and async operations to complete
			await waitFor(() => expect(parameters.value.length).toBeGreaterThan(0));

			// Initially only selector should be shown
			expect(parameters.value).toHaveLength(1);

			// Update selected tool
			updateSelectedTool('MCP Tool', 'tool-one');
			// Wait for the watcher to trigger again
			await waitFor(() => expect(parameters.value.length).toBeGreaterThan(1));

			// Now parameters should include the tool parameters
			expect(parameters.value.length).toBeGreaterThan(1);
			expect(parameters.value.some((p) => p.name.includes('query.query'))).toBe(true);
			expect(parameters.value.some((p) => p.name.includes('query.count'))).toBe(true);
		});

		it('should handle MCP tool loading errors', async () => {
			const mcpNode: INode = {
				id: '1',
				name: 'MCP Tool',
				type: AI_MCP_TOOL_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const errorMessage = 'Failed to load tools';
			nodeTypesStore.getNodeParameterOptions = vi.fn().mockRejectedValue(new Error(errorMessage));

			const node = ref<INode>(mcpNode);

			const { parameters, error } = useToolParameters({ node });
			// Wait for the watcher to trigger and async operations to complete
			await waitFor(() => expect(error.value).toBeDefined());

			expect(error.value).toBeDefined();
			expect(error.value?.message).toBe(errorMessage);
			expect(parameters.value).toHaveLength(0);
		});
	});

	describe('HITL tool parameters', () => {
		it('should load HITL tool with connected tools', async () => {
			const connectedTool: INode = {
				id: '2',
				name: 'Connected Tool',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					query: "={{ $fromAI('param1', '', 'string') }}",
				},
			};

			const hitlNode: INode = {
				id: '1',
				name: 'HITL Node',
				type: '@n8n/n8n-nodes-langchain.toolHitlTool',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					hitlQuery: "={{ $fromAI('param2', '', 'string') }}",
				},
			};

			const mockWorkflow = mock<Workflow>({
				getParentNodes: vi.fn().mockReturnValue(['Connected Tool']),
			});

			workflowsStore.workflowObject = mockWorkflow;
			workflowsStore.getNodeByName = vi.fn().mockImplementation((name: string) => {
				if (name === 'Connected Tool') return connectedTool;
				return null;
			});

			const node = ref<INode>(hitlNode);

			const { parameters } = useToolParameters({ node });
			// Wait for the watcher to trigger and async operations to complete
			await waitFor(() => expect(parameters.value.length).toBeGreaterThan(0));

			// Should have the tool selector
			expect(parameters.value.some((p) => p.name === 'tool_HITL_Node_option')).toBe(true);

			// Should have tool options
			const selectorParam = parameters.value.find((p) => p.name === 'tool_HITL_Node_option');
			expect(selectorParam?.properties.options).toHaveLength(1);
			expect(selectorParam?.properties.options?.[0]).toMatchObject({
				label: 'Connected Tool',
				value: 'Connected Tool',
				disabled: false,
			});

			// Should have hitl query parameter
			expect(parameters.value.some((p) => p.name === 'HITL_Node_query.param2')).toBe(true);
		});

		it('should show selected tool parameters for HITL', async () => {
			const connectedTool: INode = {
				id: '2',
				name: 'Connected Tool',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					query: "={{ $fromAI('param1', '', 'string') }}",
				},
			};

			const hitlNode: INode = {
				id: '1',
				name: 'HITL Node',
				type: '@n8n/n8n-nodes-langchain.toolHitlTool',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const mockWorkflow = mock<Workflow>({
				getParentNodes: vi.fn().mockReturnValue(['Connected Tool']),
			});

			workflowsStore.workflowObject = mockWorkflow;
			workflowsStore.getNodeByName = vi.fn().mockImplementation((name: string) => {
				if (name === 'Connected Tool') return connectedTool;
				return null;
			});

			const node = ref<INode>(hitlNode);

			const { parameters, updateSelectedTool } = useToolParameters({ node });
			// Wait for the watcher to trigger and async operations to complete
			await waitFor(() => expect(parameters.value.length).toBeGreaterThan(0));

			// Select a tool
			updateSelectedTool('HITL Node', 'Connected Tool');
			// Wait for the watcher to trigger again
			await waitFor(() =>
				expect(
					parameters.value.some((p) => p.name.includes('node_Connected_Tool_query.param1')),
				).toBe(true),
			);
		});
	});

	describe('Implicit input handling', () => {
		it('should add implicit input field for vector store tools', async () => {
			const vectorStoreNode: INode = {
				id: '1',
				name: 'Vector Store',
				type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					mode: 'retrieve-as-tool',
				},
			};

			const nodeType: INodeTypeDescription = {
				name: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
				displayName: 'Vector Store',
				description: 'Test',
				version: 1,
				defaults: {},
				inputs: [],
				outputs: [],
				properties: [],
				group: [],
				codex: {
					subcategories: {
						AI: ['Vector Stores', 'Tools'],
					},
				},
			};

			nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeType);

			const node = ref<INode>(vectorStoreNode);

			const { parameters } = useToolParameters({ node });
			await nextTick();

			expect(parameters.value[0]).toMatchObject({
				name: 'query.input',
				properties: {
					label: 'Query',
					type: 'text',
					required: true,
				},
				metadata: {
					implicitInput: true,
					propertyName: 'input',
				},
			});
		});
	});

	describe('Reactive updates', () => {
		it('should update parameters when node changes', async () => {
			const node1: INode = {
				id: '1',
				name: 'Node 1',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					query: "={{ $fromAI('param1', '', 'string') }}",
				},
			};

			const node2: INode = {
				id: '2',
				name: 'Node 2',
				type: 'n8n-nodes-base.code',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					query: "={{ $fromAI('param2', '', 'string') }}",
				},
			};

			const node = ref<INode>(node1);

			const { parameters } = useToolParameters({ node });
			await nextTick();

			expect(parameters.value[0].name).toBe('query.param1');

			// Change the node
			node.value = node2;
			await nextTick();

			expect(parameters.value[0].name).toBe('query.param2');
		});

		it('should handle null node', async () => {
			const node = ref<INode | null>(null);

			const { parameters } = useToolParameters({ node });
			await nextTick();

			expect(parameters.value).toHaveLength(0);
		});
	});

	describe('Error handling', () => {
		it('should set error when non-Error exception is thrown', async () => {
			const mcpNode: INode = {
				id: '1',
				name: 'MCP Tool',
				type: AI_MCP_TOOL_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			nodeTypesStore.getNodeParameterOptions = vi.fn().mockRejectedValue('String error');

			const node = ref<INode>(mcpNode);

			const { error } = useToolParameters({ node });
			// Wait for the watcher to trigger and async operations to complete
			await waitFor(() => expect(error.value).toBeDefined());

			expect(error.value).toBeDefined();
			expect(error.value?.message).toBe('Unknown error occurred');
		});
	});
});

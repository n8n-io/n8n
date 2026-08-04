import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { NodeExecutionSchema, Schema } from 'n8n-workflow';

import { createNode, createWorkflow, createMockRunData } from '../../../test/test-utils';
import { MAX_AI_RESPONSE_CHARS } from '../../constants';
import type { CoordinationLogEntry } from '../../types/coordination';
import type { ChatPayload } from '../../workflow-builder-agent';
import {
	buildSimplifiedExecutionContext,
	buildConversationContext,
	buildWorkflowOverview,
	buildExecutionContextBlock,
	buildExecutionSchemaBlock,
	buildSelectedNodesContextBlock,
	buildSelectedNodesSummary,
} from '../context-builders';

// Helper to create mock execution schema with proper typing
const createMockSchema = (value: Schema['value']): Schema => ({
	type: 'array',
	path: '',
	value,
});

// Helper to create mock NodeExecutionSchema
const createMockNodeSchema = (nodeName: string, value: Schema['value']): NodeExecutionSchema => ({
	nodeName,
	schema: createMockSchema(value),
});

describe('buildSimplifiedExecutionContext', () => {
	describe('no execution data', () => {
		it('should return no_execution status when workflowContext is undefined', () => {
			const result = buildSimplifiedExecutionContext(undefined);
			expect(result).toContain('<status>no_execution</status>');
		});

		it('should return no_execution status when runData is empty', () => {
			const workflowContext: ChatPayload['workflowContext'] = {
				executionData: {
					runData: {},
				},
			};
			const result = buildSimplifiedExecutionContext(workflowContext);
			expect(result).toContain('<status>no_execution</status>');
		});
	});

	describe('error status', () => {
		it('should return error status when there is an error', () => {
			const workflowContext: ChatPayload['workflowContext'] = {
				executionData: {
					runData: { Node1: [] },
					lastNodeExecuted: 'Send to Telegram',
					error: {
						message: 'Bad request - please check your parameters',
						description: 'Bad Request: chat not found',
						node: { name: 'Send to Telegram' },
					} as unknown as NonNullable<
						NonNullable<ChatPayload['workflowContext']>['executionData']
					>['error'],
				},
			};
			const result = buildSimplifiedExecutionContext(workflowContext);

			expect(result).toContain('<status>error</status>');
			expect(result).toContain('<last_node_executed>Send to Telegram</last_node_executed>');
			expect(result).toContain('<node>Send to Telegram</node>');
			expect(result).toContain('<message>Bad request - please check your parameters</message>');
			expect(result).toContain('<description>Bad Request: chat not found</description>');
		});

		it('should handle error with string node name', () => {
			const workflowContext: ChatPayload['workflowContext'] = {
				executionData: {
					runData: { Node1: [] },
					error: {
						message: 'Error occurred',
						node: 'ErrorNode',
					} as unknown as NonNullable<
						NonNullable<ChatPayload['workflowContext']>['executionData']
					>['error'],
				},
			};
			const result = buildSimplifiedExecutionContext(workflowContext);

			expect(result).toContain('<status>error</status>');
			expect(result).toContain('<node>ErrorNode</node>');
		});
	});

	describe('issues_detected status', () => {
		it('should detect incomplete execution when nodes did not run', () => {
			const workflowContext: ChatPayload['workflowContext'] = {
				executionData: {
					runData: {
						'Schedule Trigger1': [],
						'Get Articles': [],
						'Split Articles1': [],
					},
					lastNodeExecuted: 'Split Articles1',
				},
				executionSchema: [],
			};
			const workflowNodes = [
				{ name: 'Schedule Trigger1' },
				{ name: 'Get Articles' },
				{ name: 'Split Articles1' },
				{ name: 'Top 5 Articles1' },
			];

			const result = buildSimplifiedExecutionContext(workflowContext, workflowNodes);

			expect(result).toContain('<status>issues_detected</status>');
			expect(result).toContain('<data_flow>');
			expect(result).toContain('Schedule Trigger1');
			expect(result).toContain('Get Articles');
			expect(result).toContain('Split Articles1');
			expect(result).toContain('<nodes_not_executed>Top 5 Articles1</nodes_not_executed>');
		});

		it('should detect nodes with empty output', () => {
			const workflowContext: ChatPayload['workflowContext'] = {
				executionData: {
					runData: createMockRunData({
						'Schedule Trigger1': [{ json: { triggered: true } }],
						'Get Articles': [
							{ json: { article: 'Article 1' } },
							{ json: { article: 'Article 2' } },
						],
						'Split Articles1': [], // Node ran but produced 0 items
					}),
					lastNodeExecuted: 'Split Articles1',
				},
				executionSchema: [
					createMockNodeSchema('Get Articles', [
						createMockSchema('Article 1'),
						createMockSchema('Article 2'),
					]),
					createMockNodeSchema('Split Articles1', []),
				],
			};
			const workflowNodes = [
				{ name: 'Schedule Trigger1' },
				{ name: 'Get Articles' },
				{ name: 'Split Articles1' },
			];

			const result = buildSimplifiedExecutionContext(workflowContext, workflowNodes);

			expect(result).toContain('<status>issues_detected</status>');
			expect(result).toContain(
				'<nodes_with_empty_output>Split Articles1</nodes_with_empty_output>',
			);
		});

		it('should detect both incomplete execution and empty output', () => {
			const workflowContext: ChatPayload['workflowContext'] = {
				executionData: {
					runData: createMockRunData({
						'Schedule Trigger1': [{ json: { triggered: true } }],
						'Get Articles': [{ json: { article: 'test' } }],
						'Filter Node': [], // Node ran but produced 0 items
					}),
					lastNodeExecuted: 'Filter Node',
				},
				executionSchema: [createMockNodeSchema('Filter Node', [])],
			};
			const workflowNodes = [
				{ name: 'Schedule Trigger1' },
				{ name: 'Get Articles' },
				{ name: 'Filter Node' },
				{ name: 'Process Data' },
			];

			const result = buildSimplifiedExecutionContext(workflowContext, workflowNodes);

			expect(result).toContain('<status>issues_detected</status>');
			expect(result).toContain('<nodes_not_executed>Process Data</nodes_not_executed>');
			expect(result).toContain('<nodes_with_empty_output>Filter Node</nodes_with_empty_output>');
		});

		it('should list multiple nodes that did not execute', () => {
			const workflowContext: ChatPayload['workflowContext'] = {
				executionData: {
					runData: {
						Trigger: [],
						'IF Node': [],
					},
					lastNodeExecuted: 'IF Node',
				},
				executionSchema: [],
			};
			const workflowNodes = [
				{ name: 'Trigger' },
				{ name: 'IF Node' },
				{ name: 'Send Slack' },
				{ name: 'Process Data' },
			];

			const result = buildSimplifiedExecutionContext(workflowContext, workflowNodes);

			expect(result).toContain('<status>issues_detected</status>');
			expect(result).toContain('<nodes_not_executed>Send Slack, Process Data</nodes_not_executed>');
		});

		it('should show data flow with item counts', () => {
			// Helper to create mock task data with proper structure
			const createMockTaskData = (
				items: Array<{ json: Record<string, unknown> }>,
				executionIndex: number,
			) =>
				({
					data: { main: [items] },
					startTime: 0,
					executionTime: 100,
					executionIndex,
					source: [],
				}) as unknown as NonNullable<
					NonNullable<ChatPayload['workflowContext']>['executionData']
				>['runData'] extends infer R
					? R extends Record<string, infer T>
						? T extends Array<infer U>
							? U
							: never
						: never
					: never;

			const workflowContext: ChatPayload['workflowContext'] = {
				executionData: {
					runData: {
						Trigger: [createMockTaskData([{ json: { id: 1 } }], 0)],
						'HTTP Request': [
							createMockTaskData(
								[{ json: { title: 'Article 1' } }, { json: { title: 'Article 2' } }],
								1,
							),
						],
						'Split Items': [createMockTaskData([], 2)],
					},
				},
				executionSchema: [createMockNodeSchema('Split Items', [])],
			};
			const workflowNodes = [
				{ name: 'Trigger' },
				{ name: 'HTTP Request' },
				{ name: 'Split Items' },
			];

			const result = buildSimplifiedExecutionContext(workflowContext, workflowNodes);

			expect(result).toContain('<status>issues_detected</status>');
			expect(result).toContain('<data_flow>');
			// Trigger produced 1 item
			expect(result).toContain('Trigger (1 item)');
			// HTTP Request produced 2 items
			expect(result).toContain('HTTP Request (2 items)');
			// Split Items produced 0 items
			expect(result).toContain('Split Items (0 items)');
			expect(result).toContain('<nodes_with_empty_output>Split Items</nodes_with_empty_output>');
		});
	});

	describe('disabled nodes handling', () => {
		it('should ignore disabled nodes when detecting incomplete execution', () => {
			const workflowContext: ChatPayload['workflowContext'] = {
				executionData: {
					runData: {
						Trigger: [],
						'Active Node': [],
					},
					lastNodeExecuted: 'Active Node',
				},
				executionSchema: [],
			};
			const workflowNodes = [
				{ name: 'Trigger' },
				{ name: 'Active Node' },
				{ name: 'Disabled Node', disabled: true },
			];

			const result = buildSimplifiedExecutionContext(workflowContext, workflowNodes);

			expect(result).toContain('<status>success</status>');
			expect(result).not.toContain('Disabled Node');
		});

		it('should only list active nodes that did not execute', () => {
			const workflowContext: ChatPayload['workflowContext'] = {
				executionData: {
					runData: {
						Trigger: [],
					},
					lastNodeExecuted: 'Trigger',
				},
				executionSchema: [],
			};
			const workflowNodes = [
				{ name: 'Trigger' },
				{ name: 'Active Missing', disabled: false },
				{ name: 'Disabled Missing', disabled: true },
			];

			const result = buildSimplifiedExecutionContext(workflowContext, workflowNodes);

			expect(result).toContain('<status>issues_detected</status>');
			expect(result).toContain('<nodes_not_executed>Active Missing</nodes_not_executed>');
			expect(result).not.toContain('Disabled Missing');
		});
	});

	describe('success status', () => {
		it('should return success when all active nodes executed with output', () => {
			const workflowContext: ChatPayload['workflowContext'] = {
				executionData: {
					runData: {
						Trigger: [],
						'Process Data': [],
						'Send Email': [],
					},
					lastNodeExecuted: 'Send Email',
				},
				executionSchema: [
					createMockNodeSchema('Trigger', [createMockSchema('trigger data')]),
					createMockNodeSchema('Process Data', [createMockSchema('result')]),
					createMockNodeSchema('Send Email', [createMockSchema('sent')]),
				],
			};
			const workflowNodes = [{ name: 'Trigger' }, { name: 'Process Data' }, { name: 'Send Email' }];

			const result = buildSimplifiedExecutionContext(workflowContext, workflowNodes);

			expect(result).toContain('<status>success</status>');
		});

		it('should return success when workflowNodes is not provided and no errors', () => {
			const workflowContext: ChatPayload['workflowContext'] = {
				executionData: {
					runData: {
						Node1: [],
						Node2: [],
					},
				},
				executionSchema: [],
			};

			const result = buildSimplifiedExecutionContext(workflowContext);

			// Without workflowNodes, we can't detect incomplete execution
			expect(result).toContain('<status>success</status>');
		});
	});

	describe('backward compatibility', () => {
		it('should work without workflowNodes parameter (legacy behavior)', () => {
			const workflowContext: ChatPayload['workflowContext'] = {
				executionData: {
					runData: {
						Node1: [],
					},
				},
			};

			// Should not throw when called without workflowNodes
			const result = buildSimplifiedExecutionContext(workflowContext);
			expect(result).toContain('<status>success</status>');
		});
	});
});

describe('buildConversationContext', () => {
	describe('basic functionality', () => {
		it('should return empty string when no context is available', () => {
			const result = buildConversationContext([], [], undefined);
			expect(result).toBe('');
		});

		it('should include previous summary when provided', () => {
			const result = buildConversationContext([], [], 'User asked for a weather workflow');
			expect(result).toContain('Previous conversation summary:');
			expect(result).toContain('User asked for a weather workflow');
		});

		it('should include current request from last HumanMessage', () => {
			const messages = [new HumanMessage('Fix it please')];
			const result = buildConversationContext(messages, [], undefined);
			expect(result).toContain('Current request: "Fix it please"');
		});

		it('should include original request when different from current', () => {
			const messages = [
				new HumanMessage('Create a workflow that fetches daily AI news'),
				new AIMessage('I created the workflow'),
				new HumanMessage('Fix it please'),
			];
			const result = buildConversationContext(messages, [], undefined);
			expect(result).toContain('Original request: "Create a workflow that fetches daily AI news"');
			expect(result).toContain('Current request: "Fix it please"');
		});

		it('should include last AI response before current request', () => {
			const messages = [
				new HumanMessage('Why is my workflow not working?'),
				new AIMessage(
					'I can see the Split Articles node produced 0 items. Would you like me to investigate and fix this?',
				),
				new HumanMessage('Please do'),
			];
			const result = buildConversationContext(messages, [], undefined);
			expect(result).toContain('Last AI response:');
			expect(result).toContain('Would you like me to investigate and fix this?');
			expect(result).toContain('Current request: "Please do"');
		});

		it('should truncate long AI responses', () => {
			const longResponse = 'A'.repeat(MAX_AI_RESPONSE_CHARS * 2);
			const messages = [
				new HumanMessage('Original request'),
				new AIMessage(longResponse),
				new HumanMessage('Yes'),
			];
			const result = buildConversationContext(messages, [], undefined);
			expect(result).toContain('Last AI response: "...');
			// Should be truncated to MAX_AI_RESPONSE_CHARS + "..."
			expect(result).not.toContain('A'.repeat(MAX_AI_RESPONSE_CHARS + 100));
		});

		it('should not include AI response when there is only one user message', () => {
			const messages = [new HumanMessage('Create a workflow')];
			const result = buildConversationContext(messages, [], undefined);
			expect(result).not.toContain('Last AI response');
			expect(result).toContain('Current request: "Create a workflow"');
		});

		it('should NOT show original request when same as current (single message)', () => {
			const messages = [new HumanMessage('Create a workflow')];
			const result = buildConversationContext(messages, [], undefined);
			expect(result).not.toContain('Original request');
			expect(result).toContain('Current request: "Create a workflow"');
		});
	});

	describe('coordination log handling', () => {
		it('should include previous actions from coordination log', () => {
			const coordinationLog: CoordinationLogEntry[] = [
				{
					phase: 'discovery',
					status: 'completed',
					timestamp: Date.now(),
					summary: 'Found 3 node types (httpRequest, splitOut, limit)',
					metadata: {
						phase: 'discovery',
						nodesFound: 3,
						nodeTypes: ['httpRequest', 'splitOut', 'limit'],
						hasBestPractices: false,
					},
				},
				{
					phase: 'builder',
					status: 'completed',
					timestamp: Date.now(),
					summary: 'Created 4 nodes with 3 connections',
					metadata: {
						phase: 'builder',
						nodesCreated: 4,
						connectionsCreated: 3,
						nodeNames: ['Trigger', 'HTTP Request', 'Split', 'Limit'],
					},
				},
			];

			const messages = [new HumanMessage('Fix it')];
			const result = buildConversationContext(messages, coordinationLog, undefined);

			expect(result).toContain('Previous actions:');
			expect(result).toContain('- Discovery: Found 3 node types');
			expect(result).toContain('- Builder: Created 4 nodes with 3 connections');
		});

		it('should skip error entries in coordination log', () => {
			const coordinationLog: CoordinationLogEntry[] = [
				{
					phase: 'builder',
					status: 'error',
					timestamp: Date.now(),
					summary: 'Recursion limit reached',
					metadata: {
						phase: 'error',
						failedSubgraph: 'builder',
						errorMessage: 'Recursion limit reached',
					},
				},
			];

			const messages = [new HumanMessage('Fix it')];
			const result = buildConversationContext(messages, coordinationLog, undefined);

			// Should not include error entries in "Previous actions"
			expect(result).not.toContain('Previous actions:');
		});
	});

	describe('full context assembly', () => {
		it('should assemble all parts in correct order', () => {
			const messages = [
				new HumanMessage('Create a news fetcher'),
				new AIMessage('I created the workflow. Would you like me to fix anything?'),
				new HumanMessage('Fix the empty output'),
			];

			const coordinationLog: CoordinationLogEntry[] = [
				{
					phase: 'builder',
					status: 'completed',
					timestamp: Date.now(),
					summary: 'Created 3 nodes',
					metadata: {
						phase: 'builder',
						nodesCreated: 3,
						connectionsCreated: 2,
						nodeNames: ['Trigger', 'HTTP', 'Split'],
					},
				},
			];

			const result = buildConversationContext(
				messages,
				coordinationLog,
				'Earlier user discussed weather API',
			);

			// Check order: summary -> original -> actions -> ai response -> current
			const summaryIndex = result.indexOf('Previous conversation summary:');
			const originalIndex = result.indexOf('Original request:');
			const actionsIndex = result.indexOf('Previous actions:');
			const aiResponseIndex = result.indexOf('Last AI response:');
			const currentIndex = result.indexOf('Current request:');

			expect(summaryIndex).toBeLessThan(originalIndex);
			expect(originalIndex).toBeLessThan(actionsIndex);
			expect(actionsIndex).toBeLessThan(aiResponseIndex);
			expect(aiResponseIndex).toBeLessThan(currentIndex);
		});
	});
});

describe('buildExecutionContextBlock', () => {
	it('should return empty data when workflowContext is undefined', () => {
		const result = buildExecutionContextBlock(undefined);

		expect(result).toContain('<execution_data>');
		expect(result).toContain('<execution_schema>');
		expect(result).toContain('{}');
		expect(result).toContain('[]');
	});

	it('should include execution data and schema', () => {
		const workflowContext: ChatPayload['workflowContext'] = {
			executionData: {
				runData: { TestNode: [] },
				lastNodeExecuted: 'TestNode',
			},
			executionSchema: [createMockNodeSchema('TestNode', [createMockSchema('test data')])],
		};

		const result = buildExecutionContextBlock(workflowContext);

		expect(result).toContain('<execution_data>');
		expect(result).toContain('TestNode');
		expect(result).toContain('lastNodeExecuted');
		expect(result).toContain('<execution_schema>');
		expect(result).toContain('nodeName');
	});
});

describe('buildExecutionSchemaBlock', () => {
	it('should return empty string when no schema', () => {
		const result = buildExecutionSchemaBlock(undefined);
		expect(result).toBe('');
	});

	it('should return empty string when executionSchema is empty array', () => {
		const workflowContext: ChatPayload['workflowContext'] = {
			executionSchema: [],
		};
		const result = buildExecutionSchemaBlock(workflowContext);
		expect(result).toBe('');
	});

	it('should return schema block when schema exists', () => {
		const workflowContext: ChatPayload['workflowContext'] = {
			executionSchema: [createMockNodeSchema('Code', [createMockSchema('result')])],
		};

		const result = buildExecutionSchemaBlock(workflowContext);

		expect(result).toContain('<execution_schema>');
		expect(result).toContain('Code');
		expect(result).toContain('result');
		expect(result).toContain('</execution_schema>');
	});
});

describe('buildWorkflowOverview', () => {
	describe('empty workflow', () => {
		it('should return ready to build message for empty workflow', () => {
			const workflow = createWorkflow([]);
			const result = buildWorkflowOverview(workflow);
			expect(result).toBe('Empty workflow - ready to build');
		});
	});

	describe('workflow with nodes', () => {
		it('should include workflow_overview tags', () => {
			const workflow = createWorkflow([
				createNode({ id: '1', name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger' }),
			]);

			const result = buildWorkflowOverview(workflow);

			expect(result).toContain('<workflow_overview>');
			expect(result).toContain('</workflow_overview>');
		});

		it('should include node count', () => {
			const workflow = createWorkflow([
				createNode({ id: '1', name: 'Node1' }),
				createNode({ id: '2', name: 'Node2' }),
				createNode({ id: '3', name: 'Node3' }),
			]);

			const result = buildWorkflowOverview(workflow);

			expect(result).toContain('Node count: 3');
		});

		it('should include trigger info when single trigger exists', () => {
			const workflow = createWorkflow([
				createNode({ id: '1', name: 'My Webhook', type: 'n8n-nodes-base.webhook' }),
				createNode({ id: '2', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			const result = buildWorkflowOverview(workflow);

			expect(result).toContain('Trigger: My Webhook (n8n-nodes-base.webhook)');
		});

		it('should list all triggers when multiple exist', () => {
			const workflow = createWorkflow([
				createNode({ id: '1', name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger' }),
				createNode({ id: '2', name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
				createNode({ id: '3', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			const result = buildWorkflowOverview(workflow);

			expect(result).toContain('Triggers (2):');
			expect(result).toContain('- Schedule Trigger (n8n-nodes-base.scheduleTrigger)');
			expect(result).toContain('- Webhook (n8n-nodes-base.webhook)');
		});

		it('should indicate no triggers when none exist', () => {
			const workflow = createWorkflow([
				createNode({ id: '1', name: 'Code', type: 'n8n-nodes-base.code' }),
			]);

			const result = buildWorkflowOverview(workflow);

			expect(result).toContain('Triggers: None');
		});

		it('should include mermaid diagram', () => {
			const workflow = createWorkflow([
				createNode({ id: '1', name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }),
			]);

			const result = buildWorkflowOverview(workflow);

			expect(result).toContain('```mermaid');
			expect(result).toContain('flowchart TD');
			expect(result).toContain('```');
		});

		it('should include node parameters in mermaid comments', () => {
			const workflow = createWorkflow([
				createNode({
					id: '1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					parameters: { url: 'https://api.example.com', method: 'GET' },
				}),
			]);

			const result = buildWorkflowOverview(workflow);

			// Parameters should be in mermaid comment lines
			expect(result).toContain('https://api.example.com');
			expect(result).toContain('GET');
		});
	});
});

describe('buildSelectedNodesContextBlock', () => {
	it('should return empty string when workflowContext is undefined', () => {
		const result = buildSelectedNodesContextBlock(undefined);
		expect(result).toBe('');
	});

	it('should return empty string when selectedNodes is undefined', () => {
		const result = buildSelectedNodesContextBlock({});
		expect(result).toBe('');
	});

	it('should return empty string when selectedNodes is empty', () => {
		const result = buildSelectedNodesContextBlock({ selectedNodes: [] });
		expect(result).toBe('');
	});

	it('should wrap output in selected_nodes tags', () => {
		const result = buildSelectedNodesContextBlock({
			selectedNodes: [{ name: 'HTTP Request', incomingConnections: [], outgoingConnections: [] }],
		});
		expect(result).toContain('<selected_nodes>');
		expect(result).toContain('</selected_nodes>');
	});

	it('should include node with escaped name', () => {
		const result = buildSelectedNodesContextBlock({
			selectedNodes: [
				{ name: 'Node "A" <test>', incomingConnections: [], outgoingConnections: [] },
			],
		});
		expect(result).toContain('<node name="Node &quot;A&quot; &lt;test&gt;">');
		expect(result).toContain('</node>');
	});

	it('should include issues when present', () => {
		const result = buildSelectedNodesContextBlock({
			selectedNodes: [
				{
					name: 'HTTP Request',
					issues: { url: ['URL is required'], 'credential:httpAuth': ['Creds missing'] },
					incomingConnections: [],
					outgoingConnections: [],
				},
			],
		});
		expect(result).toContain('<issues>');
		expect(result).toContain('<issue parameter="url">URL is required</issue>');
		expect(result).toContain('<issue parameter="credential:httpAuth">Creds missing</issue>');
		expect(result).toContain('</issues>');
	});

	it('should omit issues when empty', () => {
		const result = buildSelectedNodesContextBlock({
			selectedNodes: [{ name: 'Code', incomingConnections: [], outgoingConnections: [] }],
		});
		expect(result).not.toContain('<issues>');
	});

	it('should include incoming connections', () => {
		const result = buildSelectedNodesContextBlock({
			selectedNodes: [
				{
					name: 'Code',
					incomingConnections: ['Trigger', 'HTTP Request'],
					outgoingConnections: [],
				},
			],
		});
		expect(result).toContain('<incoming_connections>Trigger, HTTP Request</incoming_connections>');
	});

	it('should include outgoing connections', () => {
		const result = buildSelectedNodesContextBlock({
			selectedNodes: [
				{
					name: 'Code',
					incomingConnections: [],
					outgoingConnections: ['Send Email'],
				},
			],
		});
		expect(result).toContain('<outgoing_connections>Send Email</outgoing_connections>');
	});

	it('should omit empty connections', () => {
		const result = buildSelectedNodesContextBlock({
			selectedNodes: [{ name: 'Code', incomingConnections: [], outgoingConnections: [] }],
		});
		expect(result).not.toContain('<incoming_connections>');
		expect(result).not.toContain('<outgoing_connections>');
	});

	it('should escape XML special chars in connections', () => {
		const result = buildSelectedNodesContextBlock({
			selectedNodes: [
				{
					name: 'Code',
					incomingConnections: ['Node <A>'],
					outgoingConnections: [],
				},
			],
		});
		expect(result).toContain('Node &lt;A&gt;');
	});

	it('should handle multiple nodes', () => {
		const result = buildSelectedNodesContextBlock({
			selectedNodes: [
				{ name: 'Node A', incomingConnections: [], outgoingConnections: [] },
				{ name: 'Node B', incomingConnections: ['Node A'], outgoingConnections: [] },
			],
		});
		expect(result).toContain('<node name="Node A">');
		expect(result).toContain('<node name="Node B">');
	});
});

describe('buildSelectedNodesSummary', () => {
	it('should return empty string when workflowContext is undefined', () => {
		const result = buildSelectedNodesSummary(undefined);
		expect(result).toBe('');
	});

	it('should return empty string when selectedNodes is undefined', () => {
		const result = buildSelectedNodesSummary({});
		expect(result).toBe('');
	});

	it('should return empty string when selectedNodes is empty', () => {
		const result = buildSelectedNodesSummary({ selectedNodes: [] });
		expect(result).toBe('');
	});

	it('should return count and list of nodes', () => {
		const result = buildSelectedNodesSummary({
			selectedNodes: [
				{ name: 'HTTP Request', incomingConnections: [], outgoingConnections: [] },
				{ name: 'Code', incomingConnections: [], outgoingConnections: [] },
			],
		});
		expect(result).toContain('2 node(s) selected');
		expect(result).toContain('- "HTTP Request"');
		expect(result).toContain('- "Code"');
	});

	it('should note issues when present', () => {
		const result = buildSelectedNodesSummary({
			selectedNodes: [
				{
					name: 'HTTP Request',
					issues: { url: ['URL is required'] },
					incomingConnections: [],
					outgoingConnections: [],
				},
			],
		});
		expect(result).toContain('configuration issues');
	});

	it('should not note issues when none present', () => {
		const result = buildSelectedNodesSummary({
			selectedNodes: [{ name: 'HTTP Request', incomingConnections: [], outgoingConnections: [] }],
		});
		expect(result).not.toContain('configuration issues');
	});
});

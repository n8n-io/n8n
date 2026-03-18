import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
} from '@n8n/api-types';

import {
	buildVerificationArtifactFromMessages,
	extractWorkflowIdsFromMessages,
} from '../verification';
import type { AgentOutcome } from '../types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeToolCall(overrides: Partial<InstanceAiToolCallState> = {}): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'search-web',
		args: { query: 'n8n email nodes' },
		isLoading: false,
		result: 'Found 3 results: Gmail, SMTP, Outlook',
		...overrides,
	};
}

function makeAgentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'completed',
		textContent: 'Here are the email nodes available.',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

function makeMessage(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		createdAt: '2026-01-01T00:00:00Z',
		content: '',
		reasoning: '',
		isStreaming: false,
		...overrides,
	};
}

function emptyOutcome(): AgentOutcome {
	return {
		workflowsCreated: [],
		executionsRun: [],
		dataTablesCreated: [],
		finalText: '',
		workflowJsons: [],
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildVerificationArtifactFromMessages', () => {
	test('renders user message and assistant text with tool call results', () => {
		const toolCall = makeToolCall();
		const messages: InstanceAiMessage[] = [
			makeMessage({ id: 'msg-user', role: 'user', content: 'What email nodes are available?' }),
			makeMessage({
				id: 'msg-assistant',
				role: 'assistant',
				content: 'Here are the email nodes.',
				agentTree: makeAgentNode({
					textContent: 'Here are the email nodes.',
					toolCalls: [toolCall],
					timeline: [
						{ type: 'text', content: 'Here are the email nodes.' },
						{ type: 'tool-call', toolCallId: 'tc-1' },
					],
				}),
			}),
		];

		const artifact = buildVerificationArtifactFromMessages(messages, emptyOutcome());

		expect(artifact).toContain('What email nodes are available?');
		expect(artifact).toContain('Here are the email nodes.');
		expect(artifact).toContain('search-web');
		expect(artifact).toContain('Found 3 results: Gmail, SMTP, Outlook');
		expect(artifact).toContain('n8n email nodes');
	});

	test('renders nested agent tree with child agents', () => {
		const childToolCall = makeToolCall({
			toolCallId: 'tc-child',
			toolName: 'build-workflow',
			args: { name: 'My Workflow' },
			result: { workflowId: 'wf-123' },
		});

		const childAgent = makeAgentNode({
			agentId: 'agent-child',
			role: 'workflow-builder',
			kind: 'builder',
			title: 'Building workflow',
			textContent: 'Workflow built successfully.',
			toolCalls: [childToolCall],
			timeline: [
				{ type: 'tool-call', toolCallId: 'tc-child' },
				{ type: 'text', content: 'Workflow built successfully.' },
			],
		});

		const messages: InstanceAiMessage[] = [
			makeMessage({
				role: 'assistant',
				agentTree: makeAgentNode({
					textContent: 'I will build a workflow.',
					children: [childAgent],
					timeline: [
						{ type: 'text', content: 'I will build a workflow.' },
						{ type: 'child', agentId: 'agent-child' },
					],
				}),
			}),
		];

		const artifact = buildVerificationArtifactFromMessages(messages, emptyOutcome());

		expect(artifact).toContain('I will build a workflow.');
		expect(artifact).toContain('workflow-builder');
		expect(artifact).toContain('build-workflow');
		expect(artifact).toContain('Workflow built successfully.');
	});

	test('renders tool call with error', () => {
		const failedToolCall = makeToolCall({
			toolCallId: 'tc-err',
			toolName: 'fetch-page',
			args: { url: 'https://docs.n8n.io/missing' },
			result: undefined,
			error: '404 Not Found',
		});

		const messages: InstanceAiMessage[] = [
			makeMessage({
				role: 'assistant',
				agentTree: makeAgentNode({
					toolCalls: [failedToolCall],
					timeline: [{ type: 'tool-call', toolCallId: 'tc-err' }],
				}),
			}),
		];

		const artifact = buildVerificationArtifactFromMessages(messages, emptyOutcome());

		expect(artifact).toContain('fetch-page');
		expect(artifact).toContain('404 Not Found');
		expect(artifact).not.toContain('undefined');
	});

	test('returns only outcome sections when messages are empty', () => {
		const outcome: AgentOutcome = {
			workflowsCreated: [{ id: 'wf-1', name: 'Test WF', nodeCount: 3, active: true }],
			executionsRun: [{ id: 'exec-1', workflowId: 'wf-1', status: 'success' }],
			dataTablesCreated: [],
			finalText: '',
			workflowJsons: [],
		};

		const artifact = buildVerificationArtifactFromMessages([], outcome);

		expect(artifact).toContain('Test WF');
		expect(artifact).toContain('wf-1');
		expect(artifact).toContain('success');
	});

	test('respects timeline ordering over default ordering', () => {
		const tc1 = makeToolCall({
			toolCallId: 'tc-first',
			toolName: 'search-web',
			result: 'Result A',
		});
		const tc2 = makeToolCall({
			toolCallId: 'tc-second',
			toolName: 'fetch-page',
			result: 'Result B',
		});

		const messages: InstanceAiMessage[] = [
			makeMessage({
				role: 'assistant',
				agentTree: makeAgentNode({
					textContent: 'First I search, then I fetch.',
					toolCalls: [tc1, tc2],
					timeline: [
						{ type: 'tool-call', toolCallId: 'tc-first' },
						{ type: 'text', content: 'First I search, then I fetch.' },
						{ type: 'tool-call', toolCallId: 'tc-second' },
					],
				}),
			}),
		];

		const artifact = buildVerificationArtifactFromMessages(messages, emptyOutcome());

		const searchIndex = artifact.indexOf('search-web');
		const textIndex = artifact.indexOf('First I search, then I fetch.');
		const fetchIndex = artifact.indexOf('fetch-page');

		expect(searchIndex).toBeLessThan(textIndex);
		expect(textIndex).toBeLessThan(fetchIndex);
	});

	test('appends outcome sections after message content', () => {
		const messages: InstanceAiMessage[] = [
			makeMessage({
				role: 'assistant',
				content: 'Done building.',
				agentTree: makeAgentNode({ textContent: 'Done building.' }),
			}),
		];

		const outcome: AgentOutcome = {
			workflowsCreated: [{ id: 'wf-1', name: 'Email WF', nodeCount: 5, active: false }],
			executionsRun: [
				{
					id: 'exec-1',
					workflowId: 'wf-1',
					status: 'error',
					error: 'Missing credential',
					failedNode: 'Gmail',
				},
			],
			dataTablesCreated: ['dt-1'],
			finalText: '',
			workflowJsons: [],
		};

		const artifact = buildVerificationArtifactFromMessages(messages, outcome);

		expect(artifact).toContain('Done building.');
		expect(artifact).toContain('Email WF');
		expect(artifact).toContain('Nodes: 5');
		expect(artifact).toContain('Missing credential');
		expect(artifact).toContain('Gmail');
		expect(artifact).toContain('dt-1');
	});

	test('truncates large tool call results', () => {
		const largeResult = 'x'.repeat(5000);
		const messages: InstanceAiMessage[] = [
			makeMessage({
				role: 'assistant',
				agentTree: makeAgentNode({
					toolCalls: [makeToolCall({ result: largeResult })],
					timeline: [{ type: 'tool-call', toolCallId: 'tc-1' }],
				}),
			}),
		];

		const artifact = buildVerificationArtifactFromMessages(messages, emptyOutcome());

		expect(artifact).toContain('truncated');
		expect(artifact.length).toBeLessThan(largeResult.length);
	});

	test('renders targetResource when present on agent node', () => {
		const messages: InstanceAiMessage[] = [
			makeMessage({
				role: 'assistant',
				agentTree: makeAgentNode({
					targetResource: { type: 'workflow', id: 'wf-42', name: 'My Email WF' },
					textContent: 'Built the workflow.',
				}),
			}),
		];

		const artifact = buildVerificationArtifactFromMessages(messages, emptyOutcome());

		expect(artifact).toContain('wf-42');
		expect(artifact).toContain('My Email WF');
	});

	test('falls back to textContent when timeline is empty', () => {
		const tc = makeToolCall({ toolCallId: 'tc-fb', toolName: 'search-docs' });
		const messages: InstanceAiMessage[] = [
			makeMessage({
				role: 'assistant',
				agentTree: makeAgentNode({
					textContent: 'Fallback text content.',
					toolCalls: [tc],
					timeline: [], // empty timeline
				}),
			}),
		];

		const artifact = buildVerificationArtifactFromMessages(messages, emptyOutcome());

		expect(artifact).toContain('Fallback text content.');
		expect(artifact).toContain('search-docs');
	});
});

describe('extractWorkflowIdsFromMessages', () => {
	test('extracts workflow IDs from targetResource on root agent', () => {
		const messages: InstanceAiMessage[] = [
			makeMessage({
				role: 'assistant',
				agentTree: makeAgentNode({
					targetResource: { type: 'workflow', id: 'wf-1', name: 'My WF' },
				}),
			}),
		];

		expect(extractWorkflowIdsFromMessages(messages)).toEqual(['wf-1']);
	});

	test('extracts workflow IDs from child agents', () => {
		const messages: InstanceAiMessage[] = [
			makeMessage({
				role: 'assistant',
				agentTree: makeAgentNode({
					children: [
						makeAgentNode({
							agentId: 'child-1',
							targetResource: { type: 'workflow', id: 'wf-child', name: 'Child WF' },
						}),
					],
				}),
			}),
		];

		expect(extractWorkflowIdsFromMessages(messages)).toEqual(['wf-child']);
	});

	test('returns empty array when no workflows referenced', () => {
		const messages: InstanceAiMessage[] = [
			makeMessage({
				role: 'assistant',
				agentTree: makeAgentNode({ textContent: 'Just text, no workflows.' }),
			}),
		];

		expect(extractWorkflowIdsFromMessages(messages)).toEqual([]);
	});

	test('ignores non-workflow targetResources', () => {
		const messages: InstanceAiMessage[] = [
			makeMessage({
				role: 'assistant',
				agentTree: makeAgentNode({
					targetResource: { type: 'data-table', id: 'dt-1', name: 'Table' },
				}),
			}),
		];

		expect(extractWorkflowIdsFromMessages(messages)).toEqual([]);
	});

	test('deduplicates workflow IDs', () => {
		const messages: InstanceAiMessage[] = [
			makeMessage({
				role: 'assistant',
				agentTree: makeAgentNode({
					targetResource: { type: 'workflow', id: 'wf-1' },
					children: [
						makeAgentNode({
							agentId: 'child-1',
							targetResource: { type: 'workflow', id: 'wf-1' },
						}),
					],
				}),
			}),
		];

		expect(extractWorkflowIdsFromMessages(messages)).toEqual(['wf-1']);
	});
});

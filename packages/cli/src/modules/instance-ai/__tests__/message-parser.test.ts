import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';

import {
	collectConfirmationRequestIds,
	markExpiredConfirmations,
	parseStoredMessages,
} from '../message-parser';
import type { StoredAgentMessage } from '../message-parser';

const BASE_DATE_MS = Date.UTC(2026, 0, 1);

function makeDate(offset = 0): Date {
	return new Date(BASE_DATE_MS + offset);
}

function makeSnapshotTree(text = 'Snapshot text'): InstanceAiAgentNode {
	return {
		agentId: 'agent-001',
		role: 'orchestrator',
		status: 'completed',
		textContent: text,
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [{ type: 'text', content: text }],
	};
}

describe('parseStoredMessages', () => {
	describe('user messages', () => {
		it('should parse user message with string content', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-1',
					role: 'user',
					content: 'Hello world',
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				id: 'msg-1',
				role: 'user',
				content: 'Hello world',
				reasoning: '',
				isStreaming: false,
			});
		});

		it('should parse user message with native content parts', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-1',
					role: 'user',
					content: [{ type: 'text', text: 'Build me a workflow' }],
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].content).toBe('Build me a workflow');
		});
	});

	describe('assistant messages', () => {
		it('should parse assistant message with text only', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Hi',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: [{ type: 'text', text: 'Hello! How can I help?' }],
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(2);
			const assistant = result[1];
			expect(assistant.role).toBe('assistant');
			expect(assistant.content).toBe('Hello! How can I help?');
			expect(assistant.reasoning).toBe('');
			expect(assistant.isStreaming).toBe(false);
			expect(assistant.agentTree).toBeDefined();
			expect(assistant.agentTree?.textContent).toBe('Hello! How can I help?');
		});

		it('should parse assistant message with tool invocations (result state)', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'List workflows',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: [
						{ type: 'text', text: 'Here are your workflows' },
						{
							type: 'tool-call',
							toolCallId: 'tc-1',
							toolName: 'list-workflows',
							input: { limit: 10 },
							state: 'resolved',
							output: { workflows: ['wf1'] },
						},
					],
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			const assistant = result[1];
			expect(assistant.agentTree?.toolCalls).toHaveLength(1);
			expect(assistant.agentTree?.toolCalls[0]).toMatchObject({
				toolCallId: 'tc-1',
				toolName: 'list-workflows',
				args: { limit: 10 },
				result: { workflows: ['wf1'] },
				isLoading: false,
				renderHint: 'default',
			});
		});

		it('should parse assistant message with tool invocations (call state - interrupted)', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Do something',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'tc-2',
							toolName: 'task-control',
							input: { tasks: [] },
						},
					],
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			const tc = result[1].agentTree?.toolCalls[0];
			expect(tc?.isLoading).toBe(true);
			expect(tc?.result).toBeUndefined();
			expect(tc?.renderHint).toBe('tasks');
		});

		it('should surface rejected tool calls via `error`, not `result`', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Do something',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'tc-rej',
							toolName: 'workflows',
							input: { name: 'x' },
							state: 'rejected',
							error: 'Workflow not found',
						},
					],
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			const tc = result[1].agentTree?.toolCalls[0];
			expect(tc?.isLoading).toBe(false);
			expect(tc?.result).toBeUndefined();
			expect(tc?.error).toBe('Workflow not found');
		});

		it('should skip malformed tool-call parts instead of rendering half-populated cards', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Go',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: [
						// Valid tool call — should survive.
						{
							type: 'tool-call',
							toolCallId: 'tc-ok',
							toolName: 'list-workflows',
							input: {},
							state: 'resolved',
							output: { ok: true },
						},
						// Missing toolName — fails the schema, must be dropped.
						{ type: 'tool-call', toolCallId: 'tc-no-name', input: {}, state: 'resolved' },
						// Missing toolCallId — dropped.
						{ type: 'tool-call', toolName: 'orphan', input: {}, state: 'resolved' },
						// `error` wrong type for a rejected call — dropped.
						{
							type: 'tool-call',
							toolCallId: 'tc-bad-error',
							toolName: 'workflows',
							state: 'rejected',
							error: { not: 'a string' },
						},
					],
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			const toolCalls = result[1].agentTree?.toolCalls ?? [];
			expect(toolCalls.map((tc) => tc.toolCallId)).toEqual(['tc-ok']);
		});

		it('should drop content parts with an unrecognized type', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Go',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: [
						{ type: 'text', text: 'Hello' },
						// Unknown type — not in the content-part union, must be ignored.
						{ type: 'bogus-part', text: 'should not surface', payload: 42 },
					],
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result[1].content).toBe('Hello');
			expect(result[1].agentTree?.timeline).toEqual([{ type: 'text', content: 'Hello' }]);
		});

		it('should parse reasoning from native parts', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Think',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: [
						{ type: 'reasoning', text: 'Reasoning part' },
						{ type: 'text', text: 'Answer' },
					],
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result[1].reasoning).toBe('Reasoning part');
			expect(result[1].content).toBe('Answer');
		});

		it('should use agentTree snapshot when available', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Build something',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: [{ type: 'text', text: 'Done!' }],
					createdAt: makeDate(1),
				},
			];

			const snapshotTree: InstanceAiAgentNode = {
				agentId: 'agent-001',
				role: 'orchestrator',
				status: 'completed',
				textContent: 'Full tree text',
				reasoning: '',
				toolCalls: [],
				children: [
					{
						agentId: 'agent-002',
						role: 'builder',
						status: 'completed',
						textContent: 'Built it',
						reasoning: '',
						toolCalls: [],
						children: [],
						timeline: [],
					},
				],
				timeline: [],
			};

			const snapshots = [
				{
					tree: snapshotTree,
					runId: 'run_abc123',
					createdAt: makeDate(1),
					updatedAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages, snapshots);

			expect(result[1].agentTree).toBe(snapshotTree);
			expect(result[1].agentTree?.children).toHaveLength(1);
			// Should use the native runId from the snapshot (not the user message id)
			expect(result[1].runId).toBe('run_abc123');
		});

		it('should hydrate orphan snapshots without a matching assistant message', () => {
			const snapshotCreatedAt = makeDate(1);
			const tree = makeSnapshotTree('I finished the run, but I did not generate a final response.');
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Build something',
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages, [
				{
					tree,
					runId: 'run_silent',
					messageGroupId: 'mg_silent',
					runIds: ['run_silent'],
					createdAt: snapshotCreatedAt,
					updatedAt: snapshotCreatedAt,
				},
			]);

			expect(result).toHaveLength(2);
			expect(result[1]).toMatchObject({
				id: 'mg_silent',
				role: 'assistant',
				runId: 'run_silent',
				messageGroupId: 'mg_silent',
				content: tree.textContent,
				createdAt: snapshotCreatedAt.toISOString(),
				agentTree: tree,
			});
		});

		it('should append trailing orphan snapshots without remapping existing assistant snapshots', () => {
			const firstTree = makeSnapshotTree('First assistant response');
			const orphanTree = makeSnapshotTree('The run was cancelled before I could send a response.');
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u1',
					role: 'user',
					content: 'First request',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a1',
					role: 'assistant',
					content: [{ type: 'text', text: 'First assistant response' }],
					createdAt: makeDate(1),
				},
				{
					id: 'msg-u2',
					role: 'user',
					content: 'Cancel the next run',
					createdAt: makeDate(2),
				},
			];

			const result = parseStoredMessages(messages, [
				{
					tree: firstTree,
					runId: 'run_first',
					messageGroupId: 'mg_first',
					createdAt: makeDate(1),
					updatedAt: makeDate(1),
				},
				{
					tree: orphanTree,
					runId: 'run_cancelled',
					messageGroupId: 'mg_cancelled',
					createdAt: makeDate(3),
					updatedAt: makeDate(3),
				},
			]);

			expect(result).toHaveLength(4);
			expect(result[1].runId).toBe('run_first');
			expect(result[1].agentTree).toBe(firstTree);
			expect(result[3]).toMatchObject({
				role: 'assistant',
				runId: 'run_cancelled',
				messageGroupId: 'mg_cancelled',
				content: orphanTree.textContent,
				agentTree: orphanTree,
			});
		});

		it('should place leading orphan snapshots before later assistant messages', () => {
			const orphanTree = makeSnapshotTree('The run was cancelled before I could send a response.');
			const secondTree = makeSnapshotTree('Second assistant response');
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u1',
					role: 'user',
					content: 'Cancel this run',
					createdAt: makeDate(),
				},
				{
					id: 'msg-u2',
					role: 'user',
					content: 'Now answer normally',
					createdAt: makeDate(2),
				},
				{
					id: 'msg-a2',
					role: 'assistant',
					content: [{ type: 'text', text: 'Second assistant response' }],
					createdAt: makeDate(3),
				},
			];

			const result = parseStoredMessages(messages, [
				{
					tree: orphanTree,
					runId: 'run_cancelled',
					messageGroupId: 'mg_cancelled',
					createdAt: makeDate(1),
					updatedAt: makeDate(1),
				},
				{
					tree: secondTree,
					runId: 'run_second',
					messageGroupId: 'mg_second',
					createdAt: makeDate(4),
					updatedAt: makeDate(4),
				},
			]);

			expect(result).toHaveLength(4);
			expect(result[1]).toMatchObject({
				role: 'assistant',
				runId: 'run_cancelled',
				messageGroupId: 'mg_cancelled',
				content: orphanTree.textContent,
				agentTree: orphanTree,
			});
			expect(result[3]).toMatchObject({
				role: 'assistant',
				runId: 'run_second',
				messageGroupId: 'mg_second',
				content: 'Second assistant response',
				agentTree: secondTree,
			});
		});

		it('should keep the snapshot tree when dedupe collapses in-flight checkpoint messages', () => {
			// Simulates the in-flight HITL case: the SDK hasn't committed
			// the turn to memory yet, so `loadInFlightCheckpointMessages`
			// surfaces several intermediate assistant messages from the
			// checkpoint blob. The snapshot was paired with a middle
			// message via timestamp matching, while a later message
			// (with no tree of its own) carries the latest text. Dedupe
			// must transfer the agentTree forward so the confirmation
			// card in the snapshot tree survives.
			const snapshotTree: InstanceAiAgentNode = {
				agentId: 'agent-001',
				role: 'orchestrator',
				status: 'active',
				textContent: 'Streaming...',
				reasoning: '',
				toolCalls: [
					{
						toolCallId: 'tc-cred',
						toolName: 'credentials',
						args: {},
						isLoading: true,
						confirmation: {
							requestId: 'req-live',
							inputType: 'approval',
							message: 'Select a credential',
							severity: 'info',
						},
						renderHint: 'default',
					},
				],
				children: [],
				timeline: [],
			};

			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Build it',
					createdAt: makeDate(0),
				},
				{
					id: 'msg-a-early',
					role: 'assistant',
					content: [{ type: 'text', text: '' }],
					createdAt: makeDate(10),
				},
				{
					id: 'msg-a-paired',
					role: 'assistant',
					content: [{ type: 'text', text: 'Looking up credentials' }],
					createdAt: makeDate(20),
				},
				{
					id: 'msg-a-latest',
					role: 'assistant',
					content: [{ type: 'text', text: 'Need credential confirmation' }],
					createdAt: makeDate(40),
				},
			];

			const result = parseStoredMessages(messages, [
				{
					tree: snapshotTree,
					runId: 'run_paired',
					messageGroupId: 'mg_inflight',
					createdAt: makeDate(25),
					updatedAt: makeDate(25),
				},
			]);

			// One user + one assistant (dedup collapses the three assistant rows).
			expect(result).toHaveLength(2);
			const assistant = result[1];
			// Latest message id survives so live SSE deltas keep correlating.
			expect(assistant.id).toBe('msg-a-latest');
			// Tree from the snapshot is transferred onto the kept message.
			expect(assistant.agentTree).toBe(snapshotTree);
			expect(assistant.agentTree?.toolCalls[0].confirmation?.requestId).toBe('req-live');
		});

		it('should apply renderHint correctly for known tool names', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Go',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'tc-1',
							toolName: 'delegate',
							input: {},
							state: 'resolved',
							output: 'ok',
						},
						{
							type: 'tool-call',
							toolCallId: 'tc-2',
							toolName: 'build-workflow',
							input: {},
							state: 'resolved',
							output: 'ok',
						},
						{
							type: 'tool-call',
							toolCallId: 'tc-3',
							toolName: 'create-tasks',
							input: {},
							state: 'resolved',
							output: 'ok',
						},
					],
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			const toolCalls = result[1].agentTree?.toolCalls ?? [];
			expect(toolCalls[0].renderHint).toBe('delegate');
			expect(toolCalls[1].renderHint).toBe('builder');
			expect(toolCalls[2].renderHint).toBe('planner');
		});
	});

	describe('internal enrichment stripping', () => {
		it('should hide auto-follow-up (continue) messages', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u1',
					role: 'user',
					content: 'Build me a workflow',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a1',
					role: 'assistant',
					content: [{ type: 'text', text: 'On it!' }],
					createdAt: makeDate(1),
				},
				{
					id: 'msg-u2',
					role: 'user',
					content:
						'<running-tasks>\n[Background task completed — workflow-builder]: Done\n</running-tasks>\n\n(continue)',
					createdAt: makeDate(2),
				},
				{
					id: 'msg-a2',
					role: 'assistant',
					content: [{ type: 'text', text: 'Your workflow is ready!' }],
					createdAt: makeDate(3),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(3);
			expect(result[0]).toMatchObject({ id: 'msg-u1', role: 'user' });
			expect(result[1]).toMatchObject({ id: 'msg-a1', role: 'assistant' });
			// The (continue) user message is hidden; only the assistant response remains
			expect(result[2]).toMatchObject({ id: 'msg-a2', role: 'assistant' });
		});

		it('should hide bare (continue) messages without task context block', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: '(continue)',
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(0);
		});

		it('should strip running-tasks enrichment from real user messages', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content:
						'<running-tasks>\n[Running task — workflow-builder]: taskId=build-1234\n</running-tasks>\n\nUse the Redis credential instead',
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].content).toBe('Use the Redis credential instead');
		});

		it('should not strip running-tasks text that appears mid-message', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Tell me about <running-tasks> tags',
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].content).toBe('Tell me about <running-tasks> tags');
		});
	});

	describe('multi-run conversational turn (planned-task follow-ups)', () => {
		// Mirrors the real flow: user sends a message, orchestrator suspends at a
		// HITL plan-approval, user approves, planned tasks dispatch a builder, the
		// orchestrator restarts internally (skipped <planned-task-follow-up> user
		// rows) for checkpoint and synthesize sub-runs, and a snapshot is saved
		// per sub-run. Without messageGroupId propagation across the turn, the
		// intra-turn unpaired text rows survive the dedup loop and render as
		// duplicates of the final snapshot's tree.textContent.
		it('collapses intra-turn unpaired assistant rows into the final snapshot', () => {
			const finalTree: InstanceAiAgentNode = {
				agentId: 'agent-001',
				role: 'orchestrator',
				status: 'completed',
				textContent:
					'On it!The background workflow-builder task finished.The trigger is a manual trigger. **Workflow** is ready.',
				reasoning: '',
				toolCalls: [],
				children: [],
				timeline: [{ type: 'text', content: 'On it!' }],
			};

			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-user',
					role: 'user',
					content: 'lets build a simple workflow with just a single manual trigger on it',
					createdAt: makeDate(0),
				},
				{
					id: 'msg-plan-toolcall',
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'toolu_plan',
							toolName: 'create-tasks',
							input: {},
							state: 'resolved',
							output: { result: 'Plan approved and 2 tasks dispatched.' },
						},
					],
					createdAt: makeDate(2),
				},
				{
					id: 'msg-on-it',
					role: 'assistant',
					content: [{ type: 'text', text: 'On it!' }],
					createdAt: makeDate(55),
				},
				{
					id: 'msg-followup-checkpoint',
					role: 'user',
					content:
						'<planned-task-follow-up type="checkpoint">\n{}\n</planned-task-follow-up>\n\n(continue)',
					createdAt: makeDate(104),
				},
				{
					id: 'msg-trigger-text',
					role: 'assistant',
					content: [
						{ type: 'text', text: 'The trigger is a manual trigger.' },
						{
							type: 'tool-call',
							toolCallId: 'toolu_executions',
							toolName: 'executions',
							input: { action: 'run', workflowId: 'wf-1' },
							state: 'resolved',
							output: { executionId: '1293', status: 'success' },
						},
					],
					createdAt: makeDate(107),
				},
				{
					id: 'msg-complete-checkpoint',
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'toolu_complete',
							toolName: 'complete-checkpoint',
							input: { taskId: 'chk-1', status: 'succeeded' },
							state: 'resolved',
							output: { ok: true },
						},
					],
					createdAt: makeDate(110),
				},
				{
					id: 'msg-followup-synthesize',
					role: 'user',
					content:
						'<planned-task-follow-up type="synthesize">\n{}\n</planned-task-follow-up>\n\n(continue)',
					createdAt: makeDate(111),
				},
				{
					id: 'msg-final',
					role: 'assistant',
					content: [{ type: 'text', text: '**Workflow** is ready.' }],
					createdAt: makeDate(114),
				},
			];

			const result = parseStoredMessages(messages, [
				{
					tree: makeSnapshotTree('On it! (partial)'),
					runId: 'run_A',
					messageGroupId: 'mg_turn',
					runIds: ['run_A'],
					createdAt: makeDate(11),
					updatedAt: makeDate(11),
				},
				{
					tree: makeSnapshotTree('On it! checkpoint done (partial)'),
					runId: 'run_B',
					messageGroupId: 'mg_turn',
					runIds: ['run_A', 'run_B'],
					createdAt: makeDate(111),
					updatedAt: makeDate(111),
				},
				{
					tree: finalTree,
					runId: 'run_C',
					messageGroupId: 'mg_turn',
					runIds: ['run_A', 'run_B', 'run_C'],
					createdAt: makeDate(114),
					updatedAt: makeDate(114),
				},
			]);

			// 1 user + 1 collapsed assistant (the final snapshot).
			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({ id: 'msg-user', role: 'user' });
			expect(result[1]).toMatchObject({
				id: 'msg-final',
				role: 'assistant',
				messageGroupId: 'mg_turn',
				agentTree: finalTree,
			});
		});

		it('keeps unpaired assistant rows when no paired snapshot exists in the turn', () => {
			// A turn with no snapshot at all (e.g. a quick text-only reply) must
			// not be touched by the propagation — there's no group to inherit.
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'Hi',
					createdAt: makeDate(0),
				},
				{
					id: 'msg-a1',
					role: 'assistant',
					content: [{ type: 'text', text: 'Hello' }],
					createdAt: makeDate(1),
				},
				{
					id: 'msg-a2',
					role: 'assistant',
					content: [{ type: 'text', text: 'World' }],
					createdAt: makeDate(2),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(3);
			expect(result[1].messageGroupId).toBeUndefined();
			expect(result[2].messageGroupId).toBeUndefined();
		});

		it('does not propagate group ids across separate turns', () => {
			// Turn 1 has a paired snapshot; turn 2 has no snapshot. The turn-2
			// assistant rows must NOT inherit turn-1's group id.
			const turn1Tree = makeSnapshotTree('Turn 1 result');
			const messages: StoredAgentMessage[] = [
				{ id: 'msg-u1', role: 'user', content: 'First', createdAt: makeDate(0) },
				{
					id: 'msg-a1',
					role: 'assistant',
					content: [{ type: 'text', text: 'Turn 1 result' }],
					createdAt: makeDate(1),
				},
				{ id: 'msg-u2', role: 'user', content: 'Second', createdAt: makeDate(2) },
				{
					id: 'msg-a2',
					role: 'assistant',
					content: [{ type: 'text', text: 'Turn 2 result' }],
					createdAt: makeDate(3),
				},
			];

			const result = parseStoredMessages(messages, [
				{
					tree: turn1Tree,
					runId: 'run_turn1',
					messageGroupId: 'mg_turn1',
					createdAt: makeDate(1),
					updatedAt: makeDate(1),
				},
			]);

			expect(result).toHaveLength(4);
			expect(result[1]).toMatchObject({ id: 'msg-a1', messageGroupId: 'mg_turn1' });
			expect(result[3]).toMatchObject({ id: 'msg-a2' });
			expect(result[3].messageGroupId).toBeUndefined();
		});
	});

	describe('edge cases', () => {
		it('should handle empty message list', () => {
			const result = parseStoredMessages([]);
			expect(result).toEqual([]);
		});

		it('should skip tool/system role messages', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-t',
					role: 'tool',
					content: 'tool output',
					createdAt: makeDate(),
				},
				{
					id: 'msg-s',
					role: 'system',
					content: 'system message',
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);
			expect(result).toHaveLength(0);
		});

		it('should handle assistant message with empty native content gracefully', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-a',
					role: 'assistant',
					content: [],
					createdAt: makeDate(),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result).toHaveLength(1);
			expect(result[0].content).toBe('');
			// No tool calls and no text → no agentTree
			expect(result[0].agentTree).toBeUndefined();
		});

		it('should extract tool calls from native parts', () => {
			const messages: StoredAgentMessage[] = [
				{
					id: 'msg-u',
					role: 'user',
					content: 'test',
					createdAt: makeDate(),
				},
				{
					id: 'msg-a',
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'tc-parts',
							toolName: 'create-tasks',
							input: { goal: 'x' },
							state: 'resolved',
							output: 'done',
						},
					],
					createdAt: makeDate(1),
				},
			];

			const result = parseStoredMessages(messages);

			expect(result[1].agentTree?.toolCalls).toHaveLength(1);
			expect(result[1].agentTree?.toolCalls[0].toolCallId).toBe('tc-parts');
		});
	});
});

describe('confirmation expiration helpers', () => {
	function makeMessageWithConfirmations(requestIds: string[]): InstanceAiMessage {
		return {
			id: 'msg-a',
			role: 'assistant',
			createdAt: makeDate().toISOString(),
			content: '',
			reasoning: '',
			isStreaming: false,
			runId: 'run-1',
			agentTree: {
				agentId: 'agent-001',
				role: 'orchestrator',
				status: 'completed',
				textContent: '',
				reasoning: '',
				toolCalls: requestIds.map((requestId, idx) => ({
					toolCallId: `tc-${idx}`,
					toolName: 'create-tasks',
					args: {},
					isLoading: true,
					confirmation: {
						requestId,
						severity: 'info' as const,
						message: '',
						inputType: 'plan-review' as const,
					},
				})),
				children: [
					{
						agentId: 'agent-delegate',
						role: 'delegate',
						status: 'completed',
						textContent: '',
						reasoning: '',
						toolCalls: [
							{
								toolCallId: 'tc-sub',
								toolName: 'ask-user',
								args: {},
								isLoading: true,
								confirmation: {
									requestId: 'req-sub',
									severity: 'info' as const,
									message: '',
									inputType: 'plan-review' as const,
								},
							},
						],
						children: [],
						timeline: [],
					},
				],
				timeline: [],
			},
		};
	}

	it('collects request IDs from orchestrator and sub-agent tool calls', () => {
		const messages = [makeMessageWithConfirmations(['req-1', 'req-2'])];
		expect(collectConfirmationRequestIds(messages).sort()).toEqual(['req-1', 'req-2', 'req-sub']);
	});

	it('flips expired flag only on confirmations whose requestId is not in the live set', () => {
		const messages = [makeMessageWithConfirmations(['req-1'])];
		markExpiredConfirmations(messages, new Set(['req-1']));

		const node = messages[0].agentTree!;
		expect(node.toolCalls[0].confirmation?.expired).toBeUndefined();
		expect(node.children[0].toolCalls[0].confirmation?.expired).toBe(true);
	});

	it('does nothing for messages without an agent tree', () => {
		const messages: InstanceAiMessage[] = [
			{
				id: 'msg-u',
				role: 'user',
				createdAt: makeDate().toISOString(),
				content: 'hi',
				reasoning: '',
				isStreaming: false,
			},
		];
		expect(collectConfirmationRequestIds(messages)).toEqual([]);
		markExpiredConfirmations(messages, new Set());
	});

	/** Build a single assistant message carrying one plan-review confirmation
	 *  card, with overridable actionability fields. */
	function makeCardMessage(
		overrides: Partial<{ isLoading: boolean; confirmationStatus: 'approved' | 'denied' }>,
	): InstanceAiMessage {
		return {
			id: 'msg-a',
			role: 'assistant',
			createdAt: makeDate().toISOString(),
			content: '',
			reasoning: '',
			isStreaming: false,
			runId: 'run-1',
			agentTree: {
				agentId: 'agent-001',
				role: 'orchestrator',
				status: 'completed',
				textContent: '',
				reasoning: '',
				toolCalls: [
					{
						toolCallId: 'tc-0',
						toolName: 'create-tasks',
						args: {},
						isLoading: overrides.isLoading ?? true,
						...(overrides.confirmationStatus
							? { confirmationStatus: overrides.confirmationStatus }
							: {}),
						confirmation: {
							requestId: 'req-resolved',
							severity: 'info' as const,
							message: '',
							inputType: 'plan-review' as const,
						},
					},
				],
				children: [],
				timeline: [],
			},
		};
	}

	// Regression: a resolved plan card reloaded after the user approved/denied it
	// has no pending-confirmation row (claim() deleted it), but that absence must
	// NOT relabel the historical card as "Plan (expired)".
	it('does not mark a settled (no longer loading) card expired even with no live row', () => {
		const messages = [makeCardMessage({ isLoading: false })];
		markExpiredConfirmations(messages, new Set());
		expect(messages[0].agentTree!.toolCalls[0].confirmation?.expired).toBeUndefined();
	});

	it.each(['approved', 'denied'] as const)(
		'does not mark a %s card expired even with no live row',
		(confirmationStatus) => {
			const messages = [makeCardMessage({ confirmationStatus })];
			markExpiredConfirmations(messages, new Set());
			expect(messages[0].agentTree!.toolCalls[0].confirmation?.expired).toBeUndefined();
		},
	);

	it('does not collect request IDs for settled cards', () => {
		expect(collectConfirmationRequestIds([makeCardMessage({ isLoading: false })])).toEqual([]);
		expect(
			collectConfirmationRequestIds([makeCardMessage({ confirmationStatus: 'approved' })]),
		).toEqual([]);
	});

	it('still marks a genuinely actionable card expired when its row is gone', () => {
		const messages = [makeCardMessage({ isLoading: true })];
		markExpiredConfirmations(messages, new Set());
		expect(messages[0].agentTree!.toolCalls[0].confirmation?.expired).toBe(true);
	});
});

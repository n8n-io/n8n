import { describe, test, expect } from 'vitest';
import {
	handleEvent,
	findMessageByRunId,
	findAgentNode,
	getRenderHint,
	rebuildRunStateFromTree,
} from '../instanceAi.reducer';
import type { InstanceAiReducerState } from '../instanceAi.reducer';
import type { InstanceAiEvent } from '@n8n/api-types';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeState(overrides?: Partial<InstanceAiReducerState>): InstanceAiReducerState {
	return {
		messages: [],
		activeRunId: null,
		runStateByGroupId: {},
		groupIdByRunId: {},
		...overrides,
	};
}

function makeRunStartEvent(
	runId: string,
	agentId: string,
): Extract<InstanceAiEvent, { type: 'run-start' }> {
	return {
		type: 'run-start',
		runId,
		agentId,
		payload: { messageId: 'msg-1' },
	};
}

function makeRunFinishEvent(
	runId: string,
	agentId: string,
	status: 'completed' | 'cancelled' | 'error',
): Extract<InstanceAiEvent, { type: 'run-finish' }> {
	return {
		type: 'run-finish',
		runId,
		agentId,
		payload: { status },
	};
}

function makeTextDeltaEvent(
	runId: string,
	agentId: string,
	text: string,
): Extract<InstanceAiEvent, { type: 'text-delta' }> {
	return {
		type: 'text-delta',
		runId,
		agentId,
		payload: { text },
	};
}

function makeReasoningDeltaEvent(
	runId: string,
	agentId: string,
	text: string,
): Extract<InstanceAiEvent, { type: 'reasoning-delta' }> {
	return {
		type: 'reasoning-delta',
		runId,
		agentId,
		payload: { text },
	};
}

function makeToolCallEvent(
	runId: string,
	agentId: string,
	toolCallId: string,
	toolName: string,
): Extract<InstanceAiEvent, { type: 'tool-call' }> {
	return {
		type: 'tool-call',
		runId,
		agentId,
		payload: { toolCallId, toolName, args: {} },
	};
}

function makeToolResultEvent(
	runId: string,
	agentId: string,
	toolCallId: string,
	result: unknown,
): Extract<InstanceAiEvent, { type: 'tool-result' }> {
	return {
		type: 'tool-result',
		runId,
		agentId,
		payload: { toolCallId, result },
	};
}

function makeToolErrorEvent(
	runId: string,
	agentId: string,
	toolCallId: string,
	error: string,
): Extract<InstanceAiEvent, { type: 'tool-error' }> {
	return {
		type: 'tool-error',
		runId,
		agentId,
		payload: { toolCallId, error },
	};
}

function makeAgentSpawnedEvent(
	runId: string,
	agentId: string,
	parentId: string,
): Extract<InstanceAiEvent, { type: 'agent-spawned' }> {
	return {
		type: 'agent-spawned',
		runId,
		agentId,
		payload: { parentId, role: 'sub-agent', tools: ['tool-a'] },
	};
}

function makeAgentCompletedEvent(
	runId: string,
	agentId: string,
	result: string,
	error?: string,
): Extract<InstanceAiEvent, { type: 'agent-completed' }> {
	return {
		type: 'agent-completed',
		runId,
		agentId,
		payload: { role: 'sub-agent', result, error },
	};
}

function makeConfirmationRequestEvent(
	runId: string,
	agentId: string,
	toolCallId: string,
): Extract<InstanceAiEvent, { type: 'confirmation-request' }> {
	return {
		type: 'confirmation-request',
		runId,
		agentId,
		payload: {
			requestId: 'req-1',
			toolCallId,
			toolName: 'dangerous-tool',
			args: {},
			severity: 'warning',
			message: 'Are you sure?',
		},
	};
}

function makeErrorEvent(
	runId: string,
	agentId: string,
	content: string,
): Extract<InstanceAiEvent, { type: 'error' }> {
	return {
		type: 'error',
		runId,
		agentId,
		payload: { content },
	};
}

/** Convenience: run-start then return the state with the new activeRunId set. */
function stateWithRun(runId: string, agentId: string): InstanceAiReducerState {
	const state = makeState();
	const newActiveRunId = handleEvent(state, makeRunStartEvent(runId, agentId));
	state.activeRunId = newActiveRunId;
	return state;
}

function expectReducerMapsNotPolluted(state: InstanceAiReducerState): void {
	expect(Object.getPrototypeOf(state.runStateByGroupId)).toBe(Object.prototype);
	expect(Object.getPrototypeOf(state.groupIdByRunId)).toBe(Object.prototype);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('instanceAi.reducer', () => {
	// -----------------------------------------------------------------------
	// Run lifecycle
	// -----------------------------------------------------------------------
	describe('run lifecycle', () => {
		test('run-start creates a new message with agentTree and returns runId as activeRunId', () => {
			const state = makeState();
			const newActiveRunId = handleEvent(state, makeRunStartEvent('run-1', 'agent-root'));

			expect(newActiveRunId).toBe('run-1');
			expect(state.messages).toHaveLength(1);

			const msg = state.messages[0];
			expect(msg.runId).toBe('run-1');
			expect(msg.role).toBe('assistant');
			expect(msg.isStreaming).toBe(true);
			expect(msg.agentTree).toBeDefined();
			expect(msg.agentTree!.agentId).toBe('agent-root');
			expect(msg.agentTree!.status).toBe('active');
		});

		test('run-finish(completed) sets isStreaming=false and returns null as activeRunId', () => {
			const state = stateWithRun('run-1', 'agent-root');
			const newActiveRunId = handleEvent(
				state,
				makeRunFinishEvent('run-1', 'agent-root', 'completed'),
			);

			expect(newActiveRunId).toBeNull();
			expect(state.messages[0].isStreaming).toBe(false);
			expect(state.messages[0].agentTree!.status).toBe('completed');
		});

		test('run-finish(cancelled) sets agentTree status to cancelled', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeRunFinishEvent('run-1', 'agent-root', 'cancelled'));

			expect(state.messages[0].agentTree!.status).toBe('cancelled');
		});

		test('run-finish(error) sets agentTree status to error', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeRunFinishEvent('run-1', 'agent-root', 'error'));

			expect(state.messages[0].agentTree!.status).toBe('error');
		});
	});

	// -----------------------------------------------------------------------
	// Content streaming
	// -----------------------------------------------------------------------
	describe('content streaming', () => {
		test('text-delta for root appends to textContent AND message.content', () => {
			const state = stateWithRun('run-1', 'agent-root');
			const rootNode = state.messages[0].agentTree!;
			handleEvent(state, makeTextDeltaEvent('run-1', 'agent-root', 'Hello'));
			const firstTimelineEntry = rootNode.timeline[0];
			handleEvent(state, makeTextDeltaEvent('run-1', 'agent-root', ' world'));

			const msg = state.messages[0];
			expect(msg.agentTree).toBe(rootNode);
			expect(rootNode.timeline[0]).toBe(firstTimelineEntry);
			expect(msg.agentTree!.textContent).toBe('Hello world');
			expect(msg.content).toBe('Hello world');
		});

		test('text-delta for sub-agent appends to sub-agent textContent only, not msg.content', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeAgentSpawnedEvent('run-1', 'sub-1', 'agent-root'));
			const child = state.messages[0].agentTree!.children[0];
			handleEvent(state, makeTextDeltaEvent('run-1', 'sub-1', 'sub text'));

			const msg = state.messages[0];
			expect(msg.agentTree!.children[0]).toBe(child);
			expect(child.textContent).toBe('sub text');
			expect(msg.content).toBe('');
		});

		test('reasoning-delta for root appends to node reasoning AND message.reasoning', () => {
			const state = stateWithRun('run-1', 'agent-root');
			const rootNode = state.messages[0].agentTree!;
			handleEvent(state, makeReasoningDeltaEvent('run-1', 'agent-root', 'thinking'));

			const msg = state.messages[0];
			expect(msg.agentTree).toBe(rootNode);
			expect(msg.agentTree!.reasoning).toBe('thinking');
			expect(msg.reasoning).toBe('thinking');
		});

		test('reasoning-delta for sub-agent appends to sub-agent reasoning only', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeAgentSpawnedEvent('run-1', 'sub-1', 'agent-root'));
			const child = state.messages[0].agentTree!.children[0];
			handleEvent(state, makeReasoningDeltaEvent('run-1', 'sub-1', 'sub thinking'));

			const msg = state.messages[0];
			expect(msg.agentTree!.children[0]).toBe(child);
			expect(child.reasoning).toBe('sub thinking');
			expect(msg.reasoning).toBe('');
		});
	});

	// -----------------------------------------------------------------------
	// Tool execution
	// -----------------------------------------------------------------------
	describe('tool execution', () => {
		test('tool-call adds entry with isLoading=true and correct renderHint', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeToolCallEvent('run-1', 'agent-root', 'tc-1', 'task-control'));

			const tc = state.messages[0].agentTree!.toolCalls[0];
			expect(tc.toolCallId).toBe('tc-1');
			expect(tc.toolName).toBe('task-control');
			expect(tc.isLoading).toBe(true);
			expect(tc.renderHint).toBe('tasks');
		});

		test('tool-result resolves matching toolCallId with isLoading=false and result set', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeToolCallEvent('run-1', 'agent-root', 'tc-1', 'some-tool'));
			const pendingToolCall = state.messages[0].agentTree!.toolCalls[0];
			handleEvent(state, makeToolResultEvent('run-1', 'agent-root', 'tc-1', { ok: true }));

			const tc = state.messages[0].agentTree!.toolCalls[0];
			expect(tc).not.toBe(pendingToolCall);
			expect(tc.isLoading).toBe(false);
			expect(tc.result).toEqual({ ok: true });
		});

		test('tool-error sets error on matching toolCallId with isLoading=false', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeToolCallEvent('run-1', 'agent-root', 'tc-1', 'some-tool'));
			handleEvent(state, makeToolErrorEvent('run-1', 'agent-root', 'tc-1', 'something broke'));

			const tc = state.messages[0].agentTree!.toolCalls[0];
			expect(tc.isLoading).toBe(false);
			expect(tc.error).toBe('something broke');
		});

		test('tool-result for unknown toolCallId leaves state unchanged', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeToolCallEvent('run-1', 'agent-root', 'tc-1', 'some-tool'));

			const before = { ...state.messages[0].agentTree!.toolCalls[0] };
			handleEvent(state, makeToolResultEvent('run-1', 'agent-root', 'tc-unknown', 'result'));

			const after = state.messages[0].agentTree!.toolCalls[0];
			expect(after.isLoading).toBe(before.isLoading);
			expect(after.result).toBeUndefined();
		});
	});

	// -----------------------------------------------------------------------
	// Agent lifecycle
	// -----------------------------------------------------------------------
	describe('agent lifecycle', () => {
		test('agent-spawned adds child to parent children array', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeAgentSpawnedEvent('run-1', 'sub-1', 'agent-root'));

			const children = state.messages[0].agentTree!.children;
			expect(children).toHaveLength(1);
			expect(children[0].agentId).toBe('sub-1');
			expect(children[0].role).toBe('sub-agent');
			expect(children[0].status).toBe('active');
			expect(children[0].tools).toEqual(['tool-a']);
		});

		test('agent-completed sets status/result/error on node', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeAgentSpawnedEvent('run-1', 'sub-1', 'agent-root'));
			handleEvent(state, makeAgentCompletedEvent('run-1', 'sub-1', 'done', undefined));

			const child = state.messages[0].agentTree!.children[0];
			expect(child.status).toBe('completed');
			expect(child.result).toBe('done');
			expect(child.error).toBeUndefined();
		});
	});

	// -----------------------------------------------------------------------
	// Confirmation
	// -----------------------------------------------------------------------
	describe('confirmation', () => {
		test('confirmation-request sets confirmation on matching toolCallId', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeToolCallEvent('run-1', 'agent-root', 'tc-1', 'dangerous-tool'));
			handleEvent(state, makeConfirmationRequestEvent('run-1', 'agent-root', 'tc-1'));

			const tc = state.messages[0].agentTree!.toolCalls[0];
			expect(tc.confirmation).toEqual({
				requestId: 'req-1',
				severity: 'warning',
				message: 'Are you sure?',
			});
		});

		test('confirmation-request passes through projectId when present', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeToolCallEvent('run-1', 'agent-root', 'tc-1', 'setup-credentials'));
			handleEvent(state, {
				type: 'confirmation-request',
				runId: 'run-1',
				agentId: 'agent-root',
				payload: {
					requestId: 'req-2',
					toolCallId: 'tc-1',
					toolName: 'setup-credentials',
					args: {},
					severity: 'info',
					message: 'Select credentials',
					projectId: 'proj-789',
				},
			});

			const tc = state.messages[0].agentTree!.toolCalls[0];
			expect(tc.confirmation).toEqual({
				requestId: 'req-2',
				severity: 'info',
				message: 'Select credentials',
				projectId: 'proj-789',
			});
		});
	});

	// -----------------------------------------------------------------------
	// Error routing
	// -----------------------------------------------------------------------
	describe('error routing', () => {
		test('routes error to specific agent node by agentId', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeAgentSpawnedEvent('run-1', 'sub-1', 'agent-root'));
			handleEvent(state, makeErrorEvent('run-1', 'sub-1', 'sub failed'));

			const child = state.messages[0].agentTree!.children[0];
			expect(child.error).toContain('sub failed');
		});

		test('falls back to root agentTree when agentId is unknown', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeErrorEvent('run-1', 'unknown-agent', 'root fallback'));

			expect(state.messages[0].agentTree!.error).toContain('root fallback');
		});

		test('falls back to msg.content when no agentTree', () => {
			const state = makeState({
				messages: [
					{
						id: 'run-1',
						runId: 'run-1',
						role: 'assistant',
						createdAt: new Date().toISOString(),
						content: '',
						reasoning: '',
						isStreaming: true,
						// no agentTree
					},
				],
				activeRunId: 'run-1',
			});
			handleEvent(state, makeErrorEvent('run-1', 'any', 'bare error'));

			expect(state.messages[0].content).toContain('bare error');
		});
	});

	// -----------------------------------------------------------------------
	// Mid-run replay guard
	// -----------------------------------------------------------------------
	describe('mid-run replay guard', () => {
		test('event for unknown runId creates placeholder message', () => {
			const state = makeState();
			handleEvent(state, makeTextDeltaEvent('run-99', 'agent-root', 'hello'));

			expect(state.messages).toHaveLength(1);
			expect(state.messages[0].runId).toBe('run-99');
			expect(state.messages[0].isStreaming).toBe(true);
			expect(state.messages[0].agentTree!.agentId).toBe('agent-root');
		});

		test('placeholder uses parentId as root for agent-spawned events', () => {
			const state = makeState();
			handleEvent(state, makeAgentSpawnedEvent('run-99', 'sub-1', 'parent-agent'));

			expect(state.messages).toHaveLength(1);
			expect(state.messages[0].agentTree!.agentId).toBe('parent-agent');
		});
	});

	describe('unsafe identifiers', () => {
		test('run-start with unsafe runId is ignored', () => {
			const state = makeState();

			const activeRunId = handleEvent(state, makeRunStartEvent('__proto__', 'agent-root'));

			expect(activeRunId).toBeNull();
			expect(state.messages).toHaveLength(0);
			expectReducerMapsNotPolluted(state);
		});

		test('run-start with unsafe messageGroupId is ignored', () => {
			const state = makeState();

			handleEvent(state, {
				type: 'run-start',
				runId: 'run-safe',
				agentId: 'agent-root',
				payload: { messageId: 'msg-1', messageGroupId: '__proto__' },
			});

			expect(state.messages).toHaveLength(0);
			expect(state.groupIdByRunId['run-safe']).toBeUndefined();
			expectReducerMapsNotPolluted(state);
		});

		test('non-run-start event with unsafe agentId is ignored', () => {
			const state = stateWithRun('run-1', 'agent-root');

			handleEvent(state, makeTextDeltaEvent('run-1', '__proto__', 'ignored'));

			expect(state.messages).toHaveLength(1);
			expect(state.messages[0].content).toBe('');
			expectReducerMapsNotPolluted(state);
		});

		test('agent-spawned with unsafe parentId is ignored', () => {
			const state = stateWithRun('run-1', 'agent-root');

			handleEvent(state, makeAgentSpawnedEvent('run-1', 'child-1', '__proto__'));

			expect(state.messages[0].agentTree?.children).toHaveLength(0);
			expectReducerMapsNotPolluted(state);
		});

		test('tool-call with unsafe toolCallId is ignored', () => {
			const state = stateWithRun('run-1', 'agent-root');

			handleEvent(state, makeToolCallEvent('run-1', 'agent-root', '__proto__', 'task-control'));

			expect(state.messages[0].agentTree?.toolCalls).toHaveLength(0);
			expectReducerMapsNotPolluted(state);
		});

		test('rebuildRunStateFromTree skips unsafe roots', () => {
			const runState = rebuildRunStateFromTree({
				agentId: '__proto__',
				role: 'orchestrator',
				status: 'completed',
				textContent: '',
				reasoning: '',
				toolCalls: [],
				children: [],
				timeline: [],
			});

			expect(runState).toBeUndefined();
		});

		test('rebuildRunStateFromTree preserves planItems', () => {
			const runState = rebuildRunStateFromTree({
				agentId: 'agent-root',
				role: 'orchestrator',
				status: 'completed',
				textContent: '',
				reasoning: '',
				toolCalls: [],
				children: [],
				timeline: [],
				planItems: [
					{
						id: 'task-1',
						title: 'Build workflow',
						kind: 'build-workflow',
						spec: 'Create the workflow',
						deps: [],
					},
				],
			});

			expect(runState?.agentsById['agent-root']?.planItems).toEqual([
				{
					id: 'task-1',
					title: 'Build workflow',
					kind: 'build-workflow',
					spec: 'Create the workflow',
					deps: [],
				},
			]);
		});
	});

	// -----------------------------------------------------------------------
	// Helpers
	// -----------------------------------------------------------------------
	describe('findMessageByRunId', () => {
		test('finds message by runId', () => {
			const state = stateWithRun('run-1', 'agent-root');
			const msg = findMessageByRunId(state, 'run-1');
			expect(msg).toBeDefined();
			expect(msg!.runId).toBe('run-1');
		});

		test('returns undefined for unknown runId', () => {
			const state = stateWithRun('run-1', 'agent-root');
			expect(findMessageByRunId(state, 'run-unknown')).toBeUndefined();
		});
	});

	describe('findAgentNode', () => {
		test('finds root agent node', () => {
			const state = stateWithRun('run-1', 'agent-root');
			const msg = state.messages[0];
			const node = findAgentNode(msg, 'agent-root');
			expect(node).toBeDefined();
			expect(node!.agentId).toBe('agent-root');
		});

		test('finds child agent node', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeAgentSpawnedEvent('run-1', 'sub-1', 'agent-root'));
			const msg = state.messages[0];
			const node = findAgentNode(msg, 'sub-1');
			expect(node).toBeDefined();
			expect(node!.agentId).toBe('sub-1');
		});

		test('returns undefined for unknown agentId', () => {
			const state = stateWithRun('run-1', 'agent-root');
			const msg = state.messages[0];
			expect(findAgentNode(msg, 'unknown')).toBeUndefined();
		});
	});

	describe('getRenderHint', () => {
		test('returns tasks for "task-control"', () => {
			expect(getRenderHint('task-control')).toBe('tasks');
		});

		test('returns delegate for "delegate"', () => {
			expect(getRenderHint('delegate')).toBe('delegate');
		});

		test('returns builder for workflow builder flow aliases', () => {
			expect(getRenderHint('build-workflow-with-agent')).toBe('builder');
			expect(getRenderHint('workflow-build-flow')).toBe('builder');
		});

		test('returns data-table for data-table flow aliases', () => {
			expect(getRenderHint('manage-data-tables-with-agent')).toBe('data-table');
			expect(getRenderHint('agent-data-table-manager')).toBe('data-table');
		});

		test('returns default for other tool names', () => {
			expect(getRenderHint('some-tool')).toBe('default');
		});
	});

	// -----------------------------------------------------------------------
	// Regression: messageGroupId merging
	// -----------------------------------------------------------------------
	describe('messageGroupId merging', () => {
		test('run-start with messageGroupId creates message with messageGroupId', () => {
			const state = makeState();
			const event: Extract<InstanceAiEvent, { type: 'run-start' }> = {
				type: 'run-start',
				runId: 'run-1',
				agentId: 'agent-root',
				payload: { messageId: 'msg-1', messageGroupId: 'mg-1' },
			};
			handleEvent(state, event);

			expect(state.messages).toHaveLength(1);
			expect(state.messages[0].messageGroupId).toBe('mg-1');
		});

		test('follow-up run-start with same messageGroupId merges into existing message', () => {
			const state = makeState();

			// First run
			handleEvent(state, {
				type: 'run-start',
				runId: 'run-1',
				agentId: 'agent-root',
				payload: { messageId: 'msg-1', messageGroupId: 'mg-1' },
			} as Extract<InstanceAiEvent, { type: 'run-start' }>);

			// Add a background agent child
			handleEvent(state, makeAgentSpawnedEvent('run-1', 'builder-1', 'agent-root'));

			// Finish first run
			handleEvent(state, makeRunFinishEvent('run-1', 'agent-root', 'completed'));

			// Follow-up run with same messageGroupId
			const newActiveRunId = handleEvent(state, {
				type: 'run-start',
				runId: 'run-2',
				agentId: 'agent-root',
				payload: { messageId: 'msg-2', messageGroupId: 'mg-1' },
			} as Extract<InstanceAiEvent, { type: 'run-start' }>);

			// Should NOT create a new message — merged into existing
			expect(state.messages).toHaveLength(1);
			expect(state.messages[0].runId).toBe('run-2');
			expect(state.messages[0].isStreaming).toBe(true);
			expect(newActiveRunId).toBe('run-2');
		});

		test('follow-up merge preserves background agent children', () => {
			const state = makeState();

			// First run spawns a builder
			handleEvent(state, {
				type: 'run-start',
				runId: 'run-1',
				agentId: 'agent-root',
				payload: { messageId: 'msg-1', messageGroupId: 'mg-1' },
			} as Extract<InstanceAiEvent, { type: 'run-start' }>);
			handleEvent(state, makeAgentSpawnedEvent('run-1', 'builder-1', 'agent-root'));
			handleEvent(state, makeToolCallEvent('run-1', 'builder-1', 'tc-1', 'search-nodes'));
			handleEvent(state, makeRunFinishEvent('run-1', 'agent-root', 'completed'));

			// Follow-up merge
			handleEvent(state, {
				type: 'run-start',
				runId: 'run-2',
				agentId: 'agent-root',
				payload: { messageId: 'msg-2', messageGroupId: 'mg-1' },
			} as Extract<InstanceAiEvent, { type: 'run-start' }>);

			// Builder child should still be in the tree
			const tree = state.messages[0].agentTree!;
			expect(tree.children).toHaveLength(1);
			expect(tree.children[0].agentId).toBe('builder-1');
			expect(tree.children[0].toolCalls).toHaveLength(1);
		});

		test('late events from old runId route to merged message via alias', () => {
			const state = makeState();

			handleEvent(state, {
				type: 'run-start',
				runId: 'run-1',
				agentId: 'agent-root',
				payload: { messageId: 'msg-1', messageGroupId: 'mg-1' },
			} as Extract<InstanceAiEvent, { type: 'run-start' }>);
			handleEvent(state, makeAgentSpawnedEvent('run-1', 'builder-1', 'agent-root'));
			handleEvent(state, makeRunFinishEvent('run-1', 'agent-root', 'completed'));

			// Merge follow-up
			handleEvent(state, {
				type: 'run-start',
				runId: 'run-2',
				agentId: 'agent-root',
				payload: { messageId: 'msg-2', messageGroupId: 'mg-1' },
			} as Extract<InstanceAiEvent, { type: 'run-start' }>);

			// Late event from builder using OLD runId
			handleEvent(state, makeAgentCompletedEvent('run-1', 'builder-1', 'built it'));

			// Should NOT create a new message — routed via alias
			expect(state.messages).toHaveLength(1);
			// Builder should be marked completed
			const builder = state.messages[0].agentTree!.children.find((c) => c.agentId === 'builder-1');
			expect(builder?.status).toBe('completed');
			expect(builder?.result).toBe('built it');
		});

		test('three-run chain A→B→C: late event from run A still routes to merged message', () => {
			const state = makeState();

			// Run A
			handleEvent(state, {
				type: 'run-start',
				runId: 'run-A',
				agentId: 'agent-root',
				payload: { messageId: 'msg-1', messageGroupId: 'mg-1' },
			} as Extract<InstanceAiEvent, { type: 'run-start' }>);
			handleEvent(state, makeAgentSpawnedEvent('run-A', 'bg-A', 'agent-root'));
			handleEvent(state, makeRunFinishEvent('run-A', 'agent-root', 'completed'));

			// Run B (follow-up)
			handleEvent(state, {
				type: 'run-start',
				runId: 'run-B',
				agentId: 'agent-root',
				payload: { messageId: 'msg-2', messageGroupId: 'mg-1' },
			} as Extract<InstanceAiEvent, { type: 'run-start' }>);
			handleEvent(state, makeAgentSpawnedEvent('run-B', 'bg-B', 'agent-root'));
			handleEvent(state, makeRunFinishEvent('run-B', 'agent-root', 'completed'));

			// Run C (second follow-up)
			handleEvent(state, {
				type: 'run-start',
				runId: 'run-C',
				agentId: 'agent-root',
				payload: { messageId: 'msg-3', messageGroupId: 'mg-1' },
			} as Extract<InstanceAiEvent, { type: 'run-start' }>);

			// Late event from run A's background agent
			handleEvent(state, makeAgentCompletedEvent('run-A', 'bg-A', 'done from A'));

			// Everything in one message
			expect(state.messages).toHaveLength(1);
			const bgA = state.messages[0].agentTree!.children.find((c) => c.agentId === 'bg-A');
			expect(bgA?.status).toBe('completed');
			expect(bgA?.result).toBe('done from A');
		});

		test('run-start without messageGroupId always creates new message', () => {
			const state = makeState();
			handleEvent(state, makeRunStartEvent('run-1', 'agent-root'));
			handleEvent(state, makeRunFinishEvent('run-1', 'agent-root', 'completed'));
			handleEvent(state, makeRunStartEvent('run-2', 'agent-root'));

			expect(state.messages).toHaveLength(2);
		});
	});

	// -----------------------------------------------------------------------
	// Regression: deep agent lookup (no depth limit)
	// -----------------------------------------------------------------------
	describe('deep agent lookup', () => {
		test('findAgentNode finds deeply nested agents', () => {
			const state = stateWithRun('run-1', 'root');
			handleEvent(state, makeAgentSpawnedEvent('run-1', 'child', 'root'));
			handleEvent(state, makeAgentSpawnedEvent('run-1', 'grandchild', 'child'));
			handleEvent(state, makeTextDeltaEvent('run-1', 'grandchild', 'deep'));

			const msg = state.messages[0];
			// grandchild should be findable
			const node = findAgentNode(msg, 'grandchild');
			expect(node).toBeDefined();
			expect(node!.textContent).toBe('deep');
		});
	});
});

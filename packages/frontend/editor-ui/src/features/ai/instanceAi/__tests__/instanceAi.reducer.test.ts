import { describe, test, expect } from 'vitest';
import {
	handleEvent,
	findMessageByRunId,
	findAgentNode,
	getRenderHint,
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
			handleEvent(state, makeTextDeltaEvent('run-1', 'agent-root', 'Hello'));
			handleEvent(state, makeTextDeltaEvent('run-1', 'agent-root', ' world'));

			const msg = state.messages[0];
			expect(msg.agentTree!.textContent).toBe('Hello world');
			expect(msg.content).toBe('Hello world');
		});

		test('text-delta for sub-agent appends to sub-agent textContent only, not msg.content', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeAgentSpawnedEvent('run-1', 'sub-1', 'agent-root'));
			handleEvent(state, makeTextDeltaEvent('run-1', 'sub-1', 'sub text'));

			const msg = state.messages[0];
			const child = msg.agentTree!.children[0];
			expect(child.textContent).toBe('sub text');
			expect(msg.content).toBe('');
		});

		test('reasoning-delta for root appends to node reasoning AND message.reasoning', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeReasoningDeltaEvent('run-1', 'agent-root', 'thinking'));

			const msg = state.messages[0];
			expect(msg.agentTree!.reasoning).toBe('thinking');
			expect(msg.reasoning).toBe('thinking');
		});

		test('reasoning-delta for sub-agent appends to sub-agent reasoning only', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeAgentSpawnedEvent('run-1', 'sub-1', 'agent-root'));
			handleEvent(state, makeReasoningDeltaEvent('run-1', 'sub-1', 'sub thinking'));

			const msg = state.messages[0];
			const child = msg.agentTree!.children[0];
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
			handleEvent(state, makeToolCallEvent('run-1', 'agent-root', 'tc-1', 'plan'));

			const tc = state.messages[0].agentTree!.toolCalls[0];
			expect(tc.toolCallId).toBe('tc-1');
			expect(tc.toolName).toBe('plan');
			expect(tc.isLoading).toBe(true);
			expect(tc.renderHint).toBe('plan');
		});

		test('tool-result resolves matching toolCallId with isLoading=false and result set', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeToolCallEvent('run-1', 'agent-root', 'tc-1', 'some-tool'));
			handleEvent(state, makeToolResultEvent('run-1', 'agent-root', 'tc-1', { ok: true }));

			const tc = state.messages[0].agentTree!.toolCalls[0];
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
			expect(child.textContent).toContain('sub failed');
		});

		test('falls back to root agentTree when agentId is unknown', () => {
			const state = stateWithRun('run-1', 'agent-root');
			handleEvent(state, makeErrorEvent('run-1', 'unknown-agent', 'root fallback'));

			expect(state.messages[0].agentTree!.textContent).toContain('root fallback');
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
		test('returns plan for "plan"', () => {
			expect(getRenderHint('plan')).toBe('plan');
		});

		test('returns delegate for "delegate"', () => {
			expect(getRenderHint('delegate')).toBe('delegate');
		});

		test('returns default for other tool names', () => {
			expect(getRenderHint('some-tool')).toBe('default');
		});
	});
});

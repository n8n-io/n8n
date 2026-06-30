import { deepCopy } from 'n8n-workflow';

import {
	createInitialState,
	reduceEvent,
	findAgent,
	toAgentTree,
	stateFromAgentTree,
} from '../agent-run-reducer';
import type { AgentRunState } from '../agent-run-reducer';
import type {
	InstanceAiAgentNode,
	InstanceAiEvent,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '../instance-ai.schema';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeRunStart(
	runId: string,
	agentId: string,
): Extract<InstanceAiEvent, { type: 'run-start' }> {
	return { type: 'run-start', runId, agentId, payload: { messageId: 'msg-1' } };
}

function makeRunFinish(
	runId: string,
	agentId: string,
	status: 'completed' | 'cancelled' | 'error',
): Extract<InstanceAiEvent, { type: 'run-finish' }> {
	return { type: 'run-finish', runId, agentId, payload: { status } };
}

function makeTextDelta(
	runId: string,
	agentId: string,
	text: string,
): Extract<InstanceAiEvent, { type: 'text-delta' }> {
	return { type: 'text-delta', runId, agentId, payload: { text } };
}

function makeReasoningDelta(
	runId: string,
	agentId: string,
	text: string,
): Extract<InstanceAiEvent, { type: 'reasoning-delta' }> {
	return { type: 'reasoning-delta', runId, agentId, payload: { text } };
}

function makeToolCall(
	runId: string,
	agentId: string,
	toolCallId: string,
	toolName: string,
): Extract<InstanceAiEvent, { type: 'tool-call' }> {
	return { type: 'tool-call', runId, agentId, payload: { toolCallId, toolName, args: {} } };
}

function makeToolResult(
	runId: string,
	agentId: string,
	toolCallId: string,
	result: unknown,
): Extract<InstanceAiEvent, { type: 'tool-result' }> {
	return { type: 'tool-result', runId, agentId, payload: { toolCallId, result } };
}

function makeToolError(
	runId: string,
	agentId: string,
	toolCallId: string,
	error: string,
): Extract<InstanceAiEvent, { type: 'tool-error' }> {
	return { type: 'tool-error', runId, agentId, payload: { toolCallId, error } };
}

function makeAgentSpawned(
	runId: string,
	agentId: string,
	parentId: string,
	role = 'sub-agent',
	tools = ['tool-a'],
): Extract<InstanceAiEvent, { type: 'agent-spawned' }> {
	return { type: 'agent-spawned', runId, agentId, payload: { parentId, role, tools } };
}

function makeAgentCompleted(
	runId: string,
	agentId: string,
	result: string,
	error?: string,
): Extract<InstanceAiEvent, { type: 'agent-completed' }> {
	return { type: 'agent-completed', runId, agentId, payload: { role: 'sub-agent', result, error } };
}

function makeConfirmationRequest(
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

function makeError(
	runId: string,
	agentId: string,
	content: string,
): Extract<InstanceAiEvent, { type: 'error' }> {
	return { type: 'error', runId, agentId, payload: { content } };
}

function makeTasksUpdate(
	runId: string,
	agentId: string,
): Extract<InstanceAiEvent, { type: 'tasks-update' }> {
	return {
		type: 'tasks-update',
		runId,
		agentId,
		payload: { tasks: { tasks: [{ id: 't1', description: 'Do thing', status: 'todo' }] } },
	};
}

/** Create a state with an active run. */
function stateWithRun(runId: string, agentId: string): AgentRunState {
	const state = createInitialState(agentId);
	reduceEvent(state, makeRunStart(runId, agentId));
	return state;
}

function expectStateMapsNotPolluted(state: AgentRunState): void {
	expect(Object.getPrototypeOf(state.agentsById)).toBe(Object.prototype);
	expect(Object.getPrototypeOf(state.parentByAgentId)).toBe(Object.prototype);
	expect(Object.getPrototypeOf(state.toolCallsById)).toBe(Object.prototype);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('agent-run-reducer', () => {
	describe('createInitialState', () => {
		it('creates state with default root agent', () => {
			const state = createInitialState();
			expect(state.rootAgentId).toBe('agent-001');
			expect(state.agentsById['agent-001']).toBeDefined();
			expect(state.agentsById['agent-001'].role).toBe('orchestrator');
			expect(state.status).toBe('active');
		});

		it('accepts custom root agentId', () => {
			const state = createInitialState('custom-root');
			expect(state.rootAgentId).toBe('custom-root');
			expect(state.agentsById['custom-root']).toBeDefined();
		});
	});

	describe('findAgent', () => {
		it('finds root agent', () => {
			const state = stateWithRun('run-1', 'root');
			expect(findAgent(state, 'root')).toBeDefined();
			expect(findAgent(state, 'root')!.role).toBe('orchestrator');
		});

		it('finds child agent', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));
			expect(findAgent(state, 'sub-1')).toBeDefined();
			expect(findAgent(state, 'sub-1')!.role).toBe('sub-agent');
		});

		it('finds deeply nested agent (grandchild)', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'child', 'root'));
			reduceEvent(state, makeAgentSpawned('run-1', 'grandchild', 'child'));
			expect(findAgent(state, 'grandchild')).toBeDefined();
		});

		it('returns undefined for unknown agentId', () => {
			const state = stateWithRun('run-1', 'root');
			expect(findAgent(state, 'unknown')).toBeUndefined();
		});
	});

	describe('run lifecycle', () => {
		it('run-start initializes state with correct root agent', () => {
			const state = createInitialState();
			reduceEvent(state, makeRunStart('run-1', 'agent-root'));

			expect(state.rootAgentId).toBe('agent-root');
			expect(state.agentsById['agent-root']).toBeDefined();
			expect(state.agentsById['agent-root'].status).toBe('active');
			expect(state.status).toBe('active');
		});

		it('run-finish(completed) sets status to completed', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeRunFinish('run-1', 'root', 'completed'));

			expect(state.status).toBe('completed');
			expect(state.agentsById['root'].status).toBe('completed');
		});

		it('run-finish(cancelled) sets status to cancelled', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeRunFinish('run-1', 'root', 'cancelled'));

			expect(state.status).toBe('cancelled');
			expect(state.agentsById['root'].status).toBe('cancelled');
		});

		it('run-finish(error) sets status to error', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeRunFinish('run-1', 'root', 'error'));

			expect(state.status).toBe('error');
			expect(state.agentsById['root'].status).toBe('error');
		});

		it('run-finish(cancelled) clears isLoading on all tool calls', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeToolCall('run-1', 'root', 'tc-1', 'publish-workflow'));
			reduceEvent(state, makeConfirmationRequest('run-1', 'root', 'tc-1'));

			expect(state.toolCallsById['tc-1'].isLoading).toBe(true);

			reduceEvent(state, makeRunFinish('run-1', 'root', 'cancelled'));

			expect(state.toolCallsById['tc-1'].isLoading).toBe(false);
		});

		it('run-finish(error) clears isLoading on all tool calls', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeToolCall('run-1', 'root', 'tc-1', 'some-tool'));

			reduceEvent(state, makeRunFinish('run-1', 'root', 'error'));

			expect(state.toolCallsById['tc-1'].isLoading).toBe(false);
		});

		it('run-finish(completed) does not clear isLoading on tool calls', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));
			reduceEvent(state, makeToolCall('run-1', 'sub-1', 'tc-1', 'background-tool'));

			reduceEvent(state, makeRunFinish('run-1', 'root', 'completed'));

			// A completed run may still have background tasks with in-flight tool calls
			expect(state.toolCallsById['tc-1'].isLoading).toBe(true);
		});

		it('follow-up run-start preserves a reasoning-only tree', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeReasoningDelta('run-1', 'root', 'deep thoughts'));
			// Turn produced reasoning only — no text, tools, or children.
			reduceEvent(state, makeRunFinish('run-1', 'root', 'completed'));

			reduceEvent(state, makeRunStart('run-2', 'root'));

			expect(state.agentsById['root'].reasoning).toBe('deep thoughts');
			expect(state.status).toBe('active');
			expect(state.agentsById['root'].status).toBe('active');
		});

		it('follow-up run-start preserves root-only status/result/error', () => {
			const state = stateWithRun('run-1', 'root');
			const root = state.agentsById['root'];
			root.statusMessage = 'Recalling conversation...';
			root.result = 'done';
			root.error = 'boom';
			reduceEvent(state, makeRunFinish('run-1', 'root', 'completed'));

			reduceEvent(state, makeRunStart('run-2', 'root'));

			expect(state.agentsById['root'].statusMessage).toBe('Recalling conversation...');
			expect(state.agentsById['root'].result).toBe('done');
			expect(state.agentsById['root'].error).toBe('boom');
			expect(state.agentsById['root'].status).toBe('active');
		});

		it('run-start with unsafe agentId is ignored', () => {
			const state = createInitialState();

			reduceEvent(state, makeRunStart('run-1', '__proto__'));

			expect(state.rootAgentId).toBe('agent-001');
			expect(findAgent(state, '__proto__')).toBeUndefined();
			expectStateMapsNotPolluted(state);
		});
	});

	describe('content streaming', () => {
		it('text-delta appends to agent textContent and timeline', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeTextDelta('run-1', 'root', 'Hello'));
			reduceEvent(state, makeTextDelta('run-1', 'root', ' world'));

			expect(state.agentsById['root'].textContent).toBe('Hello world');
			// Consecutive text should merge into one timeline entry
			expect(state.agentsById['root'].timeline).toHaveLength(1);
			expect(state.agentsById['root'].timeline[0]).toEqual({
				type: 'text',
				content: 'Hello world',
			});
		});

		it('text-delta for sub-agent appends only to sub-agent', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));
			reduceEvent(state, makeTextDelta('run-1', 'sub-1', 'sub text'));

			expect(state.agentsById['sub-1'].textContent).toBe('sub text');
			expect(state.agentsById['root'].textContent).toBe('');
		});

		it('text-delta for unknown agent is silently dropped', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeTextDelta('run-1', 'unknown', 'dropped'));

			expect(state.agentsById['root'].textContent).toBe('');
		});

		it('reasoning-delta appends to agent reasoning', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeReasoningDelta('run-1', 'root', 'thinking'));

			expect(state.agentsById['root'].reasoning).toBe('thinking');
		});

		it('reasoning-delta for sub-agent appends only to sub-agent', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));
			reduceEvent(state, makeReasoningDelta('run-1', 'sub-1', 'sub thinking'));

			expect(state.agentsById['sub-1'].reasoning).toBe('sub thinking');
			expect(state.agentsById['root'].reasoning).toBe('');
		});
	});

	describe('tool execution', () => {
		it('tool-call adds to toolCallsById and timeline', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeToolCall('run-1', 'root', 'tc-1', 'task-control'));

			const tc = state.toolCallsById['tc-1'];
			expect(tc).toBeDefined();
			expect(tc.toolCallId).toBe('tc-1');
			expect(tc.toolName).toBe('task-control');
			expect(tc.isLoading).toBe(true);
			expect(tc.renderHint).toBe('tasks');

			expect(state.agentsById['root'].toolCalls.map((t) => t.toolCallId)).toContain('tc-1');
			expect(state.agentsById['root'].timeline).toContainEqual({
				type: 'tool-call',
				toolCallId: 'tc-1',
			});
		});

		it('applies rich render hints to background agent tools', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeToolCall('run-1', 'root', 'tc-builder', 'build-workflow'));
			reduceEvent(
				state,
				makeToolCall('run-1', 'root', 'tc-legacy-builder', 'build-workflow-with-agent'),
			);
			reduceEvent(state, makeToolCall('run-1', 'root', 'tc-research', 'research-with-agent'));
			reduceEvent(state, makeToolCall('run-1', 'root', 'tc-eval-setup', 'eval-setup-with-agent'));
			reduceEvent(state, makeToolCall('run-1', 'root', 'tc-skill', 'load_skill'));

			expect(state.toolCallsById['tc-builder'].renderHint).toBe('builder');
			expect(state.toolCallsById['tc-legacy-builder'].renderHint).toBe('builder');
			expect(state.toolCallsById['tc-research'].renderHint).toBe('researcher');
			expect(state.toolCallsById['tc-eval-setup'].renderHint).toBe('eval-setup');
			expect(state.toolCallsById['tc-skill'].renderHint).toBe('skill');
		});

		it('tool-result resolves tool call', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeToolCall('run-1', 'root', 'tc-1', 'some-tool'));
			reduceEvent(state, makeToolResult('run-1', 'root', 'tc-1', { ok: true }));

			const tc = state.toolCallsById['tc-1'];
			expect(tc.isLoading).toBe(false);
			expect(tc.result).toEqual({ ok: true });
		});

		it('tool-error sets error on tool call', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeToolCall('run-1', 'root', 'tc-1', 'some-tool'));
			reduceEvent(state, makeToolError('run-1', 'root', 'tc-1', 'something broke'));

			const tc = state.toolCallsById['tc-1'];
			expect(tc.isLoading).toBe(false);
			expect(tc.error).toBe('something broke');
		});

		it('tool-result for unknown toolCallId is silently ignored', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeToolResult('run-1', 'root', 'unknown-tc', 'result'));

			expect(state.toolCallsById['unknown-tc']).toBeUndefined();
		});

		it('unsafe toolCallId events are ignored', () => {
			const state = stateWithRun('run-1', 'root');

			reduceEvent(state, makeToolCall('run-1', 'root', '__proto__', 'some-tool'));
			reduceEvent(state, makeToolResult('run-1', 'root', '__proto__', { ok: true }));
			reduceEvent(state, makeToolError('run-1', 'root', '__proto__', 'something broke'));
			reduceEvent(state, makeConfirmationRequest('run-1', 'root', '__proto__'));

			expect(toAgentTree(state).toolCalls).toHaveLength(0);
			expectStateMapsNotPolluted(state);
		});
	});

	describe('agent lifecycle', () => {
		it('agent-spawned creates child and adds to parent timeline', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));

			expect(state.agentsById['sub-1']).toBeDefined();
			expect(state.agentsById['sub-1'].role).toBe('sub-agent');
			expect(state.agentsById['sub-1'].status).toBe('active');
			expect(state.parentByAgentId['sub-1']).toBe('root');
			expect(state.agentsById['root'].children.map((c) => c.agentId)).toContain('sub-1');
			expect(state.agentsById['root'].timeline).toContainEqual({
				type: 'child',
				agentId: 'sub-1',
			});
		});

		it('agent-spawned with unknown parent is silently dropped', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'orphan', 'unknown-parent'));

			expect(state.agentsById['orphan']).toBeUndefined();
		});

		it('agent-completed sets status and result', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));
			reduceEvent(state, makeAgentCompleted('run-1', 'sub-1', 'done'));

			expect(state.agentsById['sub-1'].status).toBe('completed');
			expect(state.agentsById['sub-1'].result).toBe('done');
			expect(state.agentsById['sub-1'].error).toBeUndefined();
		});

		it('agent-completed with error sets error status', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));
			reduceEvent(state, makeAgentCompleted('run-1', 'sub-1', '', 'failed'));

			expect(state.agentsById['sub-1'].status).toBe('error');
			expect(state.agentsById['sub-1'].error).toBe('failed');
		});

		it('agent-completed clears isLoading on agent tool calls', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));
			reduceEvent(state, makeToolCall('run-1', 'sub-1', 'tc-1', 'some-tool'));
			reduceEvent(state, makeConfirmationRequest('run-1', 'sub-1', 'tc-1'));

			expect(state.toolCallsById['tc-1'].isLoading).toBe(true);

			reduceEvent(state, makeAgentCompleted('run-1', 'sub-1', '', 'Cancelled by user'));

			expect(state.toolCallsById['tc-1'].isLoading).toBe(false);
		});

		it('agent-completed does not clear tool calls of other agents', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-2', 'root'));
			reduceEvent(state, makeToolCall('run-1', 'sub-1', 'tc-1', 'tool-a'));
			reduceEvent(state, makeToolCall('run-1', 'sub-2', 'tc-2', 'tool-b'));

			reduceEvent(state, makeAgentCompleted('run-1', 'sub-1', '', 'Cancelled by user'));

			expect(state.toolCallsById['tc-1'].isLoading).toBe(false);
			expect(state.toolCallsById['tc-2'].isLoading).toBe(true);
		});

		it('agent-spawned with unsafe ids is ignored', () => {
			const state = stateWithRun('run-1', 'root');

			reduceEvent(state, makeAgentSpawned('run-1', '__proto__', 'root'));
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', '__proto__'));

			expect(findAgent(state, '__proto__')).toBeUndefined();
			expect(findAgent(state, 'sub-1')).toBeUndefined();
			expect(toAgentTree(state).children).toHaveLength(0);
			expectStateMapsNotPolluted(state);
		});
	});

	describe('confirmation', () => {
		it('confirmation-request sets confirmation on tool call', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeToolCall('run-1', 'root', 'tc-1', 'dangerous-tool'));
			reduceEvent(state, makeConfirmationRequest('run-1', 'root', 'tc-1'));

			const tc = state.toolCallsById['tc-1'];
			expect(tc.confirmation).toEqual({
				requestId: 'req-1',
				severity: 'warning',
				message: 'Are you sure?',
			});
		});

		it('confirmation-request passes through webSearch metadata when present', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeToolCall('run-1', 'root', 'tc-1', 'research'));
			reduceEvent(state, {
				type: 'confirmation-request',
				runId: 'run-1',
				agentId: 'root',
				payload: {
					requestId: 'req-ws',
					toolCallId: 'tc-1',
					toolName: 'research',
					args: { action: 'web-search', query: 'sanuli' },
					severity: 'info',
					message: 'n8n AI wants to search the web for: sanuli',
					webSearch: { query: 'sanuli' },
				},
			});

			const tc = state.toolCallsById['tc-1'];
			expect(tc.confirmation).toEqual({
				requestId: 'req-ws',
				severity: 'info',
				message: 'n8n AI wants to search the web for: sanuli',
				webSearch: { query: 'sanuli' },
			});
		});

		it('confirmation-request passes through projectId when present', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeToolCall('run-1', 'root', 'tc-1', 'setup-credentials'));
			reduceEvent(state, {
				type: 'confirmation-request',
				runId: 'run-1',
				agentId: 'root',
				payload: {
					requestId: 'req-2',
					toolCallId: 'tc-1',
					toolName: 'setup-credentials',
					args: {},
					severity: 'info',
					message: 'Select credentials',
					projectId: 'proj-456',
				},
			});

			const tc = state.toolCallsById['tc-1'];
			expect(tc.confirmation).toEqual({
				requestId: 'req-2',
				severity: 'info',
				message: 'Select credentials',
				projectId: 'proj-456',
			});
		});
	});

	describe('tasks-update', () => {
		it('sets tasks on agent', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeTasksUpdate('run-1', 'root'));

			expect(state.agentsById['root'].tasks).toBeDefined();
			expect(state.agentsById['root'].tasks!.tasks).toHaveLength(1);
		});
	});

	describe('error routing', () => {
		it('routes error to specific agent', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));
			reduceEvent(state, makeError('run-1', 'sub-1', 'sub failed'));

			expect(state.agentsById['sub-1'].textContent).toContain('sub failed');
		});

		it('falls back to root when agentId is unknown', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeError('run-1', 'unknown', 'root fallback'));

			expect(state.agentsById['root'].textContent).toContain('root fallback');
		});
	});

	describe('deep nesting', () => {
		it('supports agents spawning sub-sub-agents', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'child', 'root'));
			reduceEvent(state, makeAgentSpawned('run-1', 'grandchild', 'child'));
			reduceEvent(state, makeTextDelta('run-1', 'grandchild', 'deep text'));
			reduceEvent(state, makeAgentCompleted('run-1', 'grandchild', 'deep done'));

			expect(state.agentsById['grandchild'].textContent).toBe('deep text');
			expect(state.agentsById['grandchild'].status).toBe('completed');
			expect(state.parentByAgentId['grandchild']).toBe('child');
			expect(state.agentsById['child'].children.map((c) => c.agentId)).toContain('grandchild');
		});
	});

	describe('text between tool calls', () => {
		it('preserves text entries interleaved with tool calls in timeline', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));
			reduceEvent(state, makeTextDelta('run-1', 'sub-1', 'before tool'));
			reduceEvent(state, makeToolCall('run-1', 'sub-1', 'tc-1', 'search'));
			reduceEvent(state, makeToolResult('run-1', 'sub-1', 'tc-1', 'found'));
			reduceEvent(state, makeTextDelta('run-1', 'sub-1', 'after tool'));

			const timeline = state.agentsById['sub-1'].timeline;
			expect(timeline).toHaveLength(3);
			expect(timeline[0]).toEqual({ type: 'text', content: 'before tool' });
			expect(timeline[1]).toEqual({ type: 'tool-call', toolCallId: 'tc-1' });
			expect(timeline[2]).toEqual({ type: 'text', content: 'after tool' });
		});
	});

	describe('toAgentTree', () => {
		it('reconstructs correct nested tree from flat state', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeTextDelta('run-1', 'root', 'hello'));
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root', 'builder', ['build']));
			reduceEvent(state, makeToolCall('run-1', 'sub-1', 'tc-1', 'build-workflow'));
			reduceEvent(state, makeToolResult('run-1', 'sub-1', 'tc-1', 'ok'));
			reduceEvent(state, makeAgentCompleted('run-1', 'sub-1', 'built'));
			reduceEvent(state, makeRunFinish('run-1', 'root', 'completed'));

			const tree = toAgentTree(state);

			expect(tree.agentId).toBe('root');
			expect(tree.role).toBe('orchestrator');
			expect(tree.status).toBe('completed');
			expect(tree.textContent).toBe('hello');
			expect(tree.children).toHaveLength(1);

			const child = tree.children[0];
			expect(child.agentId).toBe('sub-1');
			expect(child.role).toBe('builder');
			expect(child.tools).toEqual(['build']);
			expect(child.status).toBe('completed');
			expect(child.result).toBe('built');
			expect(child.toolCalls).toHaveLength(1);
			expect(child.toolCalls[0].toolCallId).toBe('tc-1');
			expect(child.toolCalls[0].isLoading).toBe(false);
		});

		it('reconstructs deeply nested tree', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'child', 'root'));
			reduceEvent(state, makeAgentSpawned('run-1', 'grandchild', 'child'));

			const tree = toAgentTree(state);
			expect(tree.children).toHaveLength(1);
			expect(tree.children[0].agentId).toBe('child');
			expect(tree.children[0].children).toHaveLength(1);
			expect(tree.children[0].children[0].agentId).toBe('grandchild');
		});

		it('includes timeline entries on child nodes', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));
			reduceEvent(state, makeTextDelta('run-1', 'sub-1', 'text'));
			reduceEvent(state, makeToolCall('run-1', 'sub-1', 'tc-1', 'tool'));

			const tree = toAgentTree(state);
			const child = tree.children[0];
			expect(child.timeline).toHaveLength(2);
			expect(child.timeline[0]).toEqual({ type: 'text', content: 'text' });
			expect(child.timeline[1]).toEqual({ type: 'tool-call', toolCallId: 'tc-1' });
		});

		it('returns valid tree for empty state', () => {
			const state = createInitialState();
			const tree = toAgentTree(state);

			expect(tree.agentId).toBe('agent-001');
			expect(tree.children).toEqual([]);
			expect(tree.toolCalls).toEqual([]);
			expect(tree.timeline).toEqual([]);
		});
	});

	describe('multi-run group replay', () => {
		it('second run-start preserves agents from first run', () => {
			const state = createInitialState('root');
			// Run A: spawn a builder
			reduceEvent(state, makeRunStart('run-A', 'root'));
			reduceEvent(state, makeAgentSpawned('run-A', 'builder-1', 'root'));
			reduceEvent(state, makeToolCall('run-A', 'builder-1', 'tc-1', 'search'));
			reduceEvent(state, makeRunFinish('run-A', 'root', 'completed'));

			// Run B (follow-up): should NOT wipe builder-1
			reduceEvent(state, makeRunStart('run-B', 'root'));
			reduceEvent(state, makeTextDelta('run-B', 'root', 'follow-up text'));

			// builder-1 from run A should still exist
			expect(findAgent(state, 'builder-1')).toBeDefined();
			expect(state.toolCallsById['tc-1']).toBeDefined();
			expect(state.agentsById['root'].children.map((c) => c.agentId)).toContain('builder-1');

			const tree = toAgentTree(state);
			expect(tree.children).toHaveLength(1);
			expect(tree.children[0].agentId).toBe('builder-1');
			expect(tree.textContent).toContain('follow-up text');
		});

		it('three-run chain preserves all agents', () => {
			const state = createInitialState('root');
			reduceEvent(state, makeRunStart('run-A', 'root'));
			reduceEvent(state, makeAgentSpawned('run-A', 'bg-A', 'root'));
			reduceEvent(state, makeRunFinish('run-A', 'root', 'completed'));

			reduceEvent(state, makeRunStart('run-B', 'root'));
			reduceEvent(state, makeAgentSpawned('run-B', 'bg-B', 'root'));
			reduceEvent(state, makeRunFinish('run-B', 'root', 'completed'));

			reduceEvent(state, makeRunStart('run-C', 'root'));
			reduceEvent(state, makeAgentCompleted('run-C', 'bg-A', 'done-A'));

			expect(findAgent(state, 'bg-A')?.result).toBe('done-A');
			expect(findAgent(state, 'bg-B')).toBeDefined();

			const tree = toAgentTree(state);
			expect(tree.children).toHaveLength(2);
		});

		it('first run-start still initializes from scratch', () => {
			const state = createInitialState();
			reduceEvent(state, makeRunStart('run-1', 'custom-root'));

			expect(state.rootAgentId).toBe('custom-root');
			expect(Object.keys(state.agentsById)).toEqual(['custom-root']);
		});
	});

	describe('multiple concurrent builders', () => {
		it('tracks distinct agents with different metadata', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(
				state,
				makeAgentSpawned('run-1', 'builder-1', 'root', 'workflow-builder', ['build']),
			);
			reduceEvent(
				state,
				makeAgentSpawned('run-1', 'builder-2', 'root', 'workflow-builder', ['build']),
			);

			expect(state.agentsById['root'].children.map((c) => c.agentId)).toEqual([
				'builder-1',
				'builder-2',
			]);
			expect(findAgent(state, 'builder-1')).toBeDefined();
			expect(findAgent(state, 'builder-2')).toBeDefined();

			// Each gets independent tool calls
			reduceEvent(state, makeToolCall('run-1', 'builder-1', 'tc-1', 'search-nodes'));
			reduceEvent(state, makeToolCall('run-1', 'builder-2', 'tc-2', 'search-nodes'));

			expect(state.agentsById['builder-1'].toolCalls.map((t) => t.toolCallId)).toEqual(['tc-1']);
			expect(state.agentsById['builder-2'].toolCalls.map((t) => t.toolCallId)).toEqual(['tc-2']);

			const tree = toAgentTree(state);
			expect(tree.children).toHaveLength(2);
			expect(tree.children[0].toolCalls).toHaveLength(1);
			expect(tree.children[1].toolCalls).toHaveLength(1);
		});
	});

	describe('live tree view', () => {
		it('toAgentTree returns the state root node itself (stable identity)', () => {
			const state = stateWithRun('run-1', 'root');
			const tree = toAgentTree(state);

			expect(tree).toBe(state.agentsById['root']);
			expect(toAgentTree(state)).toBe(tree);
		});

		it('mutations after toAgentTree are visible through the returned tree', () => {
			const state = stateWithRun('run-1', 'root');
			const tree = toAgentTree(state);

			reduceEvent(state, makeTextDelta('run-1', 'root', 'streamed'));
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));
			reduceEvent(state, makeToolCall('run-1', 'sub-1', 'tc-1', 'search'));

			expect(tree.textContent).toBe('streamed');
			expect(tree.children).toHaveLength(1);
			expect(tree.children[0]).toBe(state.agentsById['sub-1']);
			expect(tree.children[0].toolCalls[0]).toBe(state.toolCallsById['tc-1']);
		});

		it('duplicate agent-spawned for an existing agent is ignored', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));
			reduceEvent(state, makeTextDelta('run-1', 'sub-1', 'kept'));

			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root'));

			expect(state.agentsById['root'].children).toHaveLength(1);
			expect(state.agentsById['sub-1'].textContent).toBe('kept');
		});
	});

	describe('stateFromAgentTree', () => {
		function buildSnapshotTree() {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeTextDelta('run-1', 'root', 'hello'));
			reduceEvent(state, makeAgentSpawned('run-1', 'sub-1', 'root', 'builder', ['build']));
			reduceEvent(state, makeToolCall('run-1', 'sub-1', 'tc-1', 'build-workflow'));
			reduceEvent(state, makeToolResult('run-1', 'sub-1', 'tc-1', 'ok'));
			reduceEvent(state, makeAgentCompleted('run-1', 'sub-1', 'built'));
			reduceEvent(state, makeRunFinish('run-1', 'root', 'completed'));
			// Deep copy to simulate a backend snapshot (fresh objects).
			return deepCopy(toAgentTree(state));
		}

		it('round-trips a snapshot tree back into an equivalent state', () => {
			const tree = buildSnapshotTree();
			const state = stateFromAgentTree(tree);

			expect(state).toBeDefined();
			expect(state!.rootAgentId).toBe('root');
			expect(state!.status).toBe('completed');
			expect(state!.parentByAgentId['sub-1']).toBe('root');
			expect(state!.toolCallsById['tc-1'].result).toBe('ok');
			expect(toAgentTree(state!)).toEqual(tree);
		});

		it('adopts the given nodes instead of copying them', () => {
			const tree = buildSnapshotTree();
			const state = stateFromAgentTree(tree);

			expect(toAgentTree(state!)).toBe(tree);
			expect(state!.agentsById['sub-1']).toBe(tree.children[0]);
			expect(state!.toolCallsById['tc-1']).toBe(tree.children[0].toolCalls[0]);

			// Live continuation: reducing into the adopted state mutates the original tree
			reduceEvent(state!, makeTextDelta('run-2', 'root', ' again'));
			expect(tree.textContent).toBe('hello again');
		});

		it('preserves an active run status', () => {
			const tree = buildSnapshotTree();
			tree.status = 'active';
			const state = stateFromAgentTree(tree);

			expect(state!.status).toBe('active');
		});

		it('returns undefined for an unsafe root agentId', () => {
			const tree = buildSnapshotTree();
			tree.agentId = '__proto__';

			expect(stateFromAgentTree(tree)).toBeUndefined();
		});

		it('drops children and tool calls with unsafe ids', () => {
			const tree = buildSnapshotTree();
			tree.children.push({
				...tree.children[0],
				agentId: '__proto__',
			});
			tree.toolCalls.push({
				toolCallId: '__proto__',
				toolName: 'evil',
				args: {},
				isLoading: false,
			});
			tree.timeline.push({ type: 'child', agentId: '__proto__' });
			tree.timeline.push({ type: 'tool-call', toolCallId: '__proto__' });

			const state = stateFromAgentTree(tree);

			expect(findAgent(state!, '__proto__')).toBeUndefined();
			expect(tree.children).toHaveLength(1);
			expect(tree.toolCalls).toHaveLength(0);
			expect(tree.timeline.some((e) => e.type === 'child' && e.agentId === '__proto__')).toBe(
				false,
			);
			expect(
				tree.timeline.some((e) => e.type === 'tool-call' && e.toolCallId === '__proto__'),
			).toBe(false);
			expectStateMapsNotPolluted(state!);
		});

		it('normalizes missing or non-array collections instead of throwing', () => {
			// Simulates a truncated/malformed snapshot — run-sync frames and
			// hydrated messages are not schema-validated.
			const child = {
				agentId: 'sub-1',
				role: 'builder',
				status: 'completed',
				textContent: '',
				reasoning: '',
				// children / toolCalls / timeline missing entirely
			} as unknown as InstanceAiAgentNode;
			const tree = {
				agentId: 'root',
				role: 'orchestrator',
				status: 'active',
				textContent: 'hi',
				reasoning: '',
				children: [child],
				toolCalls: 'junk',
				timeline: undefined,
			} as unknown as InstanceAiAgentNode;

			const state = stateFromAgentTree(tree);

			expect(state).toBeDefined();
			expect(tree.toolCalls).toEqual([]);
			expect(tree.timeline).toEqual([]);
			expect(child.children).toEqual([]);
			expect(child.toolCalls).toEqual([]);
			expect(child.timeline).toEqual([]);

			// The repaired node is reducible: appendTimelineText reads timeline.at()
			reduceEvent(state!, makeTextDelta('run-1', 'sub-1', 'live'));
			expect(child.textContent).toBe('live');
			expect(child.timeline).toEqual([{ type: 'text', content: 'live' }]);
		});

		it('drops junk entries inside snapshot collections', () => {
			const tree = buildSnapshotTree();
			tree.children.push(null as unknown as InstanceAiAgentNode);
			tree.children.push({ role: 'no-id' } as unknown as InstanceAiAgentNode);
			tree.toolCalls.push(null as unknown as InstanceAiToolCallState);
			tree.timeline.push(null as unknown as InstanceAiTimelineEntry);

			const state = stateFromAgentTree(tree);

			expect(state).toBeDefined();
			expect(tree.children).toHaveLength(1);
			expect(tree.toolCalls).toHaveLength(0);
			expect(tree.timeline.every((entry) => entry !== null)).toBe(true);
			expect(findAgent(state!, 'undefined')).toBeUndefined();
		});

		it('returns undefined when the root agentId is missing', () => {
			const tree = buildSnapshotTree();
			Reflect.deleteProperty(tree, 'agentId');

			expect(stateFromAgentTree(tree)).toBeUndefined();
		});

		it('drops unsafe ids on nested descendants, not just the root level', () => {
			const tree = buildSnapshotTree();
			const child = tree.children[0];
			child.children.push({
				agentId: '__proto__',
				role: 'evil',
				status: 'active',
				textContent: '',
				reasoning: '',
				toolCalls: [],
				children: [],
				timeline: [],
			});
			child.toolCalls.push({
				toolCallId: 'constructor',
				toolName: 'evil',
				args: {},
				isLoading: true,
			});
			child.timeline.push({ type: 'child', agentId: '__proto__' });

			const state = stateFromAgentTree(tree);

			expect(findAgent(state!, '__proto__')).toBeUndefined();
			// Plain-object lookup would hit Object.prototype.constructor — assert own keys.
			expect(Object.prototype.hasOwnProperty.call(state!.toolCallsById, 'constructor')).toBe(false);
			expect(child.children).toHaveLength(0);
			expect(child.toolCalls.some((tc) => tc.toolCallId === 'constructor')).toBe(false);
			expect(child.timeline.some((e) => e.type === 'child' && e.agentId === '__proto__')).toBe(
				false,
			);
			expectStateMapsNotPolluted(state!);
		});
	});
});

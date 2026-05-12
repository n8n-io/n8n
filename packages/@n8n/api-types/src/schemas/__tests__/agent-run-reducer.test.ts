import { createInitialState, reduceEvent, findAgent, toAgentTree } from '../agent-run-reducer';
import type { AgentRunState } from '../agent-run-reducer';
import type { InstanceAiEvent } from '../instance-ai.schema';

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
	expect(Object.getPrototypeOf(state.childrenByAgentId)).toBe(Object.prototype);
	expect(Object.getPrototypeOf(state.timelineByAgentId)).toBe(Object.prototype);
	expect(Object.getPrototypeOf(state.toolCallsById)).toBe(Object.prototype);
	expect(Object.getPrototypeOf(state.toolCallIdsByAgentId)).toBe(Object.prototype);
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
			expect(state.timelineByAgentId['root']).toHaveLength(1);
			expect(state.timelineByAgentId['root'][0]).toEqual({
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

			expect(state.toolCallIdsByAgentId['root']).toContain('tc-1');
			expect(state.timelineByAgentId['root']).toContainEqual({
				type: 'tool-call',
				toolCallId: 'tc-1',
			});
		});

		it('applies rich render hints to workflow flow aliases', () => {
			const state = stateWithRun('run-1', 'root');
			reduceEvent(state, makeToolCall('run-1', 'root', 'tc-builder', 'workflow-build-flow'));
			reduceEvent(
				state,
				makeToolCall('run-1', 'root', 'tc-data-table', 'agent-data-table-manager'),
			);

			expect(state.toolCallsById['tc-builder'].renderHint).toBe('builder');
			expect(state.toolCallsById['tc-data-table'].renderHint).toBe('data-table');
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
			expect(state.childrenByAgentId['root']).toContain('sub-1');
			expect(state.timelineByAgentId['root']).toContainEqual({
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
			expect(state.childrenByAgentId['child']).toContain('grandchild');
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

			const timeline = state.timelineByAgentId['sub-1'];
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
			expect(state.childrenByAgentId['root']).toContain('builder-1');

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

			expect(state.childrenByAgentId['root']).toEqual(['builder-1', 'builder-2']);
			expect(findAgent(state, 'builder-1')).toBeDefined();
			expect(findAgent(state, 'builder-2')).toBeDefined();

			// Each gets independent tool calls
			reduceEvent(state, makeToolCall('run-1', 'builder-1', 'tc-1', 'search-nodes'));
			reduceEvent(state, makeToolCall('run-1', 'builder-2', 'tc-2', 'search-nodes'));

			expect(state.toolCallIdsByAgentId['builder-1']).toEqual(['tc-1']);
			expect(state.toolCallIdsByAgentId['builder-2']).toEqual(['tc-2']);

			const tree = toAgentTree(state);
			expect(tree.children).toHaveLength(2);
			expect(tree.children[0].toolCalls).toHaveLength(1);
			expect(tree.children[1].toolCalls).toHaveLength(1);
		});
	});
});

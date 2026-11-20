import { createRuntimeSkillSource } from '@n8n/agents';
import type { TelemetryProxy } from '@n8n/backend-services';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionStreamChunk } from '@/modules/agents/system-agents/system-agent.types';

import {
	AssistantContextTurnTelemetry,
	readSuspendedContextTurn,
	SUSPENDED_CONTEXT_TURN_METADATA_KEY,
	writeSuspendedContextTurn,
	type AssistantContextTurnState,
} from '../assistant-context-turn-telemetry';
import { createMemory, THREAD_ID } from './workflow-loop-memory';

const runtimeSkillId = `hub-${'a'.repeat(64)}`;

const context: Omit<AssistantContextTurnState, 'hubSkills'> = {
	injection: {
		state: 'injected',
		isUpdate: false,
		legs: { inventory: 3, events: 2, runs: 1 },
		chars: 400,
	},
	instanceContextEnabled: true,
	nodeUsageEnabled: false,
};

function skillSource() {
	return createRuntimeSkillSource([
		{
			id: runtimeSkillId,
			name: 'Hub skill',
			description: 'From the Hub',
			instructions: 'Secret instructions',
			metadata: { hubSkillId: 'skill-1' },
		},
	]);
}

function loadSkill(toolCallId: string): AgentExecutionStreamChunk[] {
	return [
		{ type: 'tool-call', toolCallId, toolName: 'load_skill', input: { skillId: runtimeSkillId } },
		{
			type: 'tool-result',
			toolCallId,
			toolName: 'load_skill',
			output: { success: true, skillId: runtimeSkillId, content: 'Secret instructions' },
		},
	];
}

function askQuestion(toolCallId: string): AgentExecutionStreamChunk {
	return {
		type: 'tool-call-suspended',
		runId: 'agent-run-1',
		toolCallId,
		toolName: 'ask-user',
		suspendPayload: { requestId: `request-${toolCallId}`, inputType: 'questions', questions: [] },
	};
}

const usage = { promptTokens: 100, completionTokens: 20, totalTokens: 120, cost: 0.01 };

function setup(
	scope: Partial<ConstructorParameters<typeof AssistantContextTurnTelemetry>[1]> = {},
	saved?: AssistantContextTurnState,
) {
	const telemetry = mock<TelemetryProxy>();
	const turn = new AssistantContextTurnTelemetry(
		telemetry,
		{ userId: 'user-1', threadId: THREAD_ID, runId: 'run-1', resumed: false, ...scope },
		saved,
	);
	turn.bind(skillSource());
	const rows = () =>
		telemetry.track.mock.calls.map(([event, properties]) => {
			expect(event).toBe(TELEMETRY_EVENT.INSTANCE_AI.INSTANCE_CONTEXT_TURN);
			expect(
				TELEMETRY_EVENT.INSTANCE_AI.INSTANCE_CONTEXT_TURN.getValidationError(properties),
			).toBeNull();
			return properties as Record<string, unknown>;
		});
	return { turn, rows };
}

describe('AssistantContextTurnTelemetry', () => {
	it('reports a whole turn with its Hub skill use and the Agents runtime', () => {
		const { turn, rows } = setup();
		turn.setContext(context);
		for (const chunk of loadSkill('load-1')) turn.observeChunk(chunk);

		turn.report('completed', usage);

		expect(rows()).toEqual([
			expect.objectContaining({
				runtime: 'agents',
				surface: 'aia',
				user_id: 'user-1',
				thread_id: THREAD_ID,
				run_id: 'run-1',
				segment: 'whole',
				status: 'completed',
				block_state: 'injected',
				block_chars: 400,
				tool_calls: 1,
				asked_clarifying_question: false,
				turn_prompt_tokens: 100,
				turn_completion_tokens: 20,
				turn_total_tokens: 120,
				turn_cost_usd: 0.01,
				hub_skill_snapshot_sequence: 1,
				hub_skill_attempt_count: 1,
				hub_skill_load_count: 1,
				hub_skill_loaded_ids: ['skill-1'],
			}),
		]);
	});

	it('reports nothing without an instance context', () => {
		const { turn, rows } = setup();
		for (const chunk of loadSkill('load-1')) turn.observeChunk(chunk);

		turn.report('errored');

		expect(rows()).toEqual([]);
	});

	it('ignores events of other agents', () => {
		const { turn, rows } = setup();
		turn.setContext(context);
		turn.observeChunk({
			type: 'subagent-chunk',
			chunk: loadSkill('sub-load')[0],
		} as unknown as AgentExecutionStreamChunk);

		turn.report('completed');

		expect(rows()).toEqual([
			expect.objectContaining({ tool_calls: 0, hub_skill_attempt_count: 0 }),
		]);
	});

	it('continues the Hub skill use of a suspended segment in its resume', () => {
		const first = setup();
		first.turn.setContext(context);
		for (const chunk of loadSkill('load-1')) first.turn.observeChunk(chunk);
		first.turn.observeChunk(askQuestion('ask-1'));
		first.turn.report('suspended', usage);
		const saved = first.turn.save();

		const resumed = setup({ resumed: true, openToolCallIds: new Set(['ask-1']) }, saved);
		// The resume sends the open card again. It is not a new question.
		resumed.turn.observeChunk(askQuestion('ask-1'));
		for (const chunk of loadSkill('load-2')) resumed.turn.observeChunk(chunk);
		resumed.turn.report('completed');

		expect(first.rows()).toEqual([
			expect.objectContaining({
				segment: 'suspended',
				status: 'suspended',
				asked_clarifying_question: true,
				hub_skill_snapshot_sequence: 1,
				hub_skill_load_count: 1,
			}),
		]);
		expect(resumed.rows()).toEqual([
			expect.objectContaining({
				segment: 'resumed',
				status: 'completed',
				block_state: 'injected',
				tool_calls: 1,
				asked_clarifying_question: false,
				hub_skill_snapshot_sequence: 2,
				hub_skill_attempt_count: 2,
				hub_skill_load_count: 2,
			}),
		]);
		expect(resumed.rows()[0]).not.toHaveProperty('turn_prompt_tokens');
	});
});

describe('suspended context turn storage', () => {
	const saved: AssistantContextTurnState = {
		...context,
		hubSkills: { sequence: 1, calls: [] },
	};

	it('keeps the context of the suspended run for its resume', async () => {
		const memory = createMemory();

		await writeSuspendedContextTurn(memory, THREAD_ID, 'run-1', saved);

		await expect(readSuspendedContextTurn(memory, THREAD_ID, 'run-1')).resolves.toEqual(saved);
		await expect(readSuspendedContextTurn(memory, THREAD_ID, 'run-2')).resolves.toBeUndefined();
	});

	it('drops the context only when its own run ends', async () => {
		const memory = createMemory();
		await writeSuspendedContextTurn(memory, THREAD_ID, 'run-1', saved);

		await writeSuspendedContextTurn(memory, THREAD_ID, 'run-2', undefined);
		await expect(readSuspendedContextTurn(memory, THREAD_ID, 'run-1')).resolves.toEqual(saved);

		await writeSuspendedContextTurn(memory, THREAD_ID, 'run-1', undefined);
		const thread = await memory.getThread(THREAD_ID);
		expect(thread?.metadata).not.toHaveProperty(SUSPENDED_CONTEXT_TURN_METADATA_KEY);
	});

	it('ignores a stored context that does not parse', async () => {
		const memory = createMemory();
		await writeSuspendedContextTurn(memory, THREAD_ID, 'run-1', {
			...saved,
			injection: { state: 'unknown' },
		} as unknown as AssistantContextTurnState);

		await expect(readSuspendedContextTurn(memory, THREAD_ID, 'run-1')).resolves.toBeUndefined();
	});
});

import { mock } from 'vitest-mock-extended';

import { emitBuilderMetric } from '../../../tracing/builder-metric-event';
import type {
	AgentValidationSummary,
	BuilderTurnStream,
	InstanceAiBuilderDelegate,
	InstanceAiTraceContext,
	OrchestrationContext,
} from '../../../types';
import { emitAgentBuildMetrics, withAgentStreamMetrics } from '../agent-build-metrics';

vi.mock('../../../tracing/builder-metric-event', () => ({
	emitBuilderMetric: vi.fn(async () => await Promise.resolve()),
	canEmitBuilderMetric: vi.fn((tracing: unknown) => tracing !== undefined),
}));

const tracing = {} as InstanceAiTraceContext;

function makeContext(withTracing = true): OrchestrationContext {
	return {
		tracing: withTracing ? tracing : undefined,
		logger: { debug: vi.fn() },
	} as unknown as OrchestrationContext;
}

function makeDelegate() {
	const validateAgent = vi.fn<(agentId: string) => Promise<AgentValidationSummary | undefined>>();
	return { delegate: mock<InstanceAiBuilderDelegate>({ validateAgent }), validateAgent };
}

function makeTurn(chunks: unknown[]): BuilderTurnStream {
	return {
		fullStream: (async function* () {
			yield* chunks;
		})(),
		text: Promise.resolve('done'),
	};
}

async function drain(turn: BuilderTurnStream): Promise<unknown[]> {
	const seen: unknown[] = [];
	for await (const chunk of turn.fullStream) seen.push(chunk);
	return seen;
}

describe('emitAgentBuildMetrics', () => {
	beforeEach(() => {
		vi.mocked(emitBuilderMetric).mockClear();
	});

	it('records the pass outcome and the Publish validation after a config change', async () => {
		const { delegate, validateAgent } = makeDelegate();
		validateAgent.mockResolvedValue({
			valid: true,
			issueCodes: [],
			issueCount: 0,
			capabilityCount: 2,
		});

		await emitAgentBuildMetrics({
			context: makeContext(),
			delegate,
			agentId: 'agent-1',
			activity: 'creating',
			outcome: 'completed',
			configUpdated: true,
			userWaitMs: 1200,
		});

		expect(emitBuilderMetric).toHaveBeenCalledWith(tracing, 'agent_build', {
			success: true,
			outcome: 'completed',
			agent_id: 'agent-1',
			operation: 'create',
			activity: 'creating',
			config_updated: true,
			user_wait_ms: 1200,
		});
		expect(emitBuilderMetric).toHaveBeenCalledWith(tracing, 'agent_verification', {
			success: true,
			valid: true,
			issue_codes: '',
			issue_count: 0,
			capability_count: 2,
			agent_id: 'agent-1',
			operation: 'create',
			activity: 'creating',
		});
	});

	it.each([
		{ name: 'invalid', valid: false, capabilityCount: 2 },
		{ name: 'valid without capabilities', valid: true, capabilityCount: 0 },
	])('does not count an agent that is $name as verified', async ({ valid, capabilityCount }) => {
		const { delegate, validateAgent } = makeDelegate();
		validateAgent.mockResolvedValue({
			valid,
			issueCodes: valid ? [] : ['missing_credential', 'missing_required'],
			issueCount: valid ? 0 : 2,
			capabilityCount,
		});

		await emitAgentBuildMetrics({
			context: makeContext(),
			delegate,
			agentId: 'agent-1',
			activity: 'editing',
			outcome: 'completed',
			configUpdated: true,
		});

		expect(vi.mocked(emitBuilderMetric).mock.calls[0][2].user_wait_ms).toBeUndefined();
		expect(emitBuilderMetric).toHaveBeenCalledWith(
			tracing,
			'agent_verification',
			expect.objectContaining({
				success: false,
				valid,
				operation: 'update',
				issue_codes: valid ? '' : 'missing_credential,missing_required',
			}),
		);
	});

	it.each([
		{
			name: 'the config did not change',
			configUpdated: false,
			withTracing: true,
			outcome: 'failed',
		},
		{ name: 'the pass has no trace', configUpdated: true, withTracing: false, outcome: 'failed' },
		{ name: 'the pass suspended', configUpdated: true, withTracing: true, outcome: 'suspended' },
	] as const)('skips validation when $name', async ({ configUpdated, withTracing, outcome }) => {
		const { delegate, validateAgent } = makeDelegate();

		await emitAgentBuildMetrics({
			context: makeContext(withTracing),
			delegate,
			agentId: 'agent-1',
			activity: 'editing',
			outcome,
			configUpdated,
		});

		expect(validateAgent).not.toHaveBeenCalled();
		expect(emitBuilderMetric).toHaveBeenCalledTimes(1);
		expect(emitBuilderMetric).toHaveBeenCalledWith(
			withTracing ? tracing : undefined,
			'agent_build',
			expect.objectContaining({ success: outcome === 'suspended', outcome }),
		);
	});

	it('records no verification when the agent no longer exists', async () => {
		const { delegate, validateAgent } = makeDelegate();
		validateAgent.mockResolvedValue(undefined);

		await emitAgentBuildMetrics({
			context: makeContext(),
			delegate,
			agentId: 'agent-1',
			activity: 'editing',
			outcome: 'completed',
			configUpdated: true,
		});

		expect(validateAgent).toHaveBeenCalledWith('agent-1');
		expect(emitBuilderMetric).toHaveBeenCalledTimes(1);
		expect(emitBuilderMetric).toHaveBeenCalledWith(tracing, 'agent_build', expect.anything());
	});

	it('still records the pass when validation fails', async () => {
		const { delegate, validateAgent } = makeDelegate();
		validateAgent.mockRejectedValue(new Error('db down'));

		await emitAgentBuildMetrics({
			context: makeContext(),
			delegate,
			agentId: 'agent-1',
			activity: 'editing',
			outcome: 'completed',
			configUpdated: true,
		});

		expect(emitBuilderMetric).toHaveBeenCalledTimes(1);
		expect(emitBuilderMetric).toHaveBeenCalledWith(tracing, 'agent_build', expect.anything());
	});
});

describe('withAgentStreamMetrics', () => {
	const streamOptions = { agentId: 'agent-1', activity: 'creating', alreadyShown: false } as const;

	beforeEach(() => {
		vi.mocked(emitBuilderMetric).mockClear();
	});

	it('records the first config change of the build as agent_shown, once', async () => {
		const chunks = [
			{ type: 'tool-result', toolCallId: 'tc-1', toolName: 'resolve_llm', output: { ok: true } },
			{
				type: 'tool-result',
				toolCallId: 'tc-2',
				toolName: 'write_config',
				output: { configMutated: true },
				isError: true,
			},
			{
				type: 'tool-result',
				toolCallId: 'tc-3',
				toolName: 'write_config',
				output: { configMutated: true },
			},
			{
				type: 'tool-result',
				toolCallId: 'tc-4',
				toolName: 'patch_config',
				output: { configMutated: true },
			},
		];
		const turn = withAgentStreamMetrics(makeContext(), makeTurn(chunks), streamOptions);

		const callsWhenSeen: number[] = [];
		for await (const _chunk of turn.fullStream) {
			callsWhenSeen.push(vi.mocked(emitBuilderMetric).mock.calls.length);
		}

		expect(callsWhenSeen).toEqual([0, 0, 1, 1]);
		expect(vi.mocked(emitBuilderMetric).mock.calls).toEqual([
			[
				tracing,
				'agent_shown',
				{
					success: true,
					agent_id: 'agent-1',
					operation: 'create',
					activity: 'creating',
					tool_name: 'write_config',
				},
			],
		]);
	});

	it('does not record agent_shown when an earlier pass already changed the config', async () => {
		const turn = withAgentStreamMetrics(
			makeContext(),
			makeTurn([
				{
					type: 'tool-result',
					toolCallId: 'tc-1',
					toolName: 'patch_config',
					output: { configMutated: true },
				},
			]),
			{ ...streamOptions, alreadyShown: true },
		);

		await drain(turn);

		expect(emitBuilderMetric).not.toHaveBeenCalled();
	});

	it('records each Preview test result as it streams through, and passes every chunk on', async () => {
		const chunks = [
			{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'call_agent', input: {} },
			{
				type: 'tool-result',
				toolCallId: 'tc-1',
				toolName: 'call_agent',
				output: { status: 'completed' },
			},
			{
				type: 'tool-result',
				toolCallId: 'tc-2',
				toolName: 'call_agent',
				output: { status: 'error', code: 'max_iterations' },
			},
			{
				type: 'tool-result',
				toolCallId: 'tc-3',
				toolName: 'call_agent',
				output: 'boom',
				isError: true,
			},
			{
				type: 'tool-result',
				toolCallId: 'tc-4',
				toolName: 'write_config',
				output: { status: 'ok' },
			},
			{ type: 'text-delta', delta: 'Done.' },
		];
		const turn = withAgentStreamMetrics(makeContext(), makeTurn(chunks), streamOptions);

		const seen: unknown[] = [];
		const callsWhenSeen: number[] = [];
		for await (const chunk of turn.fullStream) {
			seen.push(chunk);
			callsWhenSeen.push(vi.mocked(emitBuilderMetric).mock.calls.length);
		}

		expect(seen).toEqual(chunks);
		// Each event is recorded before its chunk reaches the consumer, not at the end.
		expect(callsWhenSeen).toEqual([0, 1, 2, 3, 3, 3]);
		expect(vi.mocked(emitBuilderMetric).mock.calls).toEqual([
			[
				tracing,
				'agent_test',
				{ success: true, status: 'completed', code: undefined, agent_id: 'agent-1' },
			],
			[
				tracing,
				'agent_test',
				{ success: false, status: 'error', code: 'max_iterations', agent_id: 'agent-1' },
			],
			[
				tracing,
				'agent_test',
				{ success: false, status: 'error', code: undefined, agent_id: 'agent-1' },
			],
		]);
	});

	it('returns the turn unchanged when there is no trace', async () => {
		const turn = makeTurn([
			{
				type: 'tool-result',
				toolCallId: 'tc-1',
				toolName: 'call_agent',
				output: { status: 'completed' },
			},
		]);

		const wrapped = withAgentStreamMetrics(makeContext(false), turn, streamOptions);

		expect(wrapped).toBe(turn);
		await drain(wrapped);
		expect(emitBuilderMetric).not.toHaveBeenCalled();
	});
});

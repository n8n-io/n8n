import { AGENT_BUILDER_TEST_TOOL_NAME } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { emitBuilderMetric } from '../../../tracing/builder-metric-event';
import type {
	AgentValidationSummary,
	InstanceAiBuilderDelegate,
	InstanceAiTraceContext,
	OrchestrationContext,
} from '../../../types';
import {
	recordAgentBuildRunOutcome,
	recordAgentBuilderResumed,
	recordAgentBuilderSuspended,
	recordAgentBuilderToolResult,
	recordAgentSelected,
} from '../agent-build-metrics';

const detached: Array<Promise<void>> = [];

vi.mock('../../../tracing/builder-metric-event', () => ({
	emitBuilderMetric: vi.fn(async () => await Promise.resolve()),
	canEmitBuilderMetric: vi.fn((tracing: unknown) => tracing !== undefined),
	detachBuilderMetricWork: vi.fn((_tracing: unknown, work: () => Promise<void>) => {
		detached.push(work().catch(() => undefined));
	}),
}));

async function flushDetached(): Promise<void> {
	await Promise.all(detached.splice(0));
}

const tracing = {} as InstanceAiTraceContext;

function makeContext(options: { withTracing?: boolean; validation?: AgentValidationSummary } = {}) {
	const validateAgent = vi.fn<(agentId: string) => Promise<AgentValidationSummary | undefined>>();
	validateAgent.mockResolvedValue(
		options.validation ?? { valid: true, issueCodes: [], issueCount: 0, capabilityCount: 2 },
	);
	const context = {
		tracing: options.withTracing === false ? undefined : tracing,
		logger: { debug: vi.fn() },
		domainContext: { builderDelegate: mock<InstanceAiBuilderDelegate>({ validateAgent }) },
	} as unknown as OrchestrationContext;
	return { context, validateAgent };
}

function metricCalls(name: string) {
	return vi
		.mocked(emitBuilderMetric)
		.mock.calls.filter(([, metric]) => metric === name)
		.map(([, , fields]) => fields);
}

const configChange = {
	toolName: 'agent_builder_patch_config',
	isError: false,
	configMutated: true,
};

describe('agent build metrics', () => {
	beforeEach(() => {
		vi.mocked(emitBuilderMetric).mockClear();
		detached.length = 0;
	});

	it('records a created agent with the run outcome and the Publish validation', async () => {
		const { context, validateAgent } = makeContext();
		recordAgentSelected(context, 'agent-1', { created: true });
		recordAgentBuilderToolResult(context, 'agent-1', configChange);

		recordAgentBuildRunOutcome(context, 'completed');
		await flushDetached();

		expect(metricCalls('agent_build')).toEqual([
			{
				success: true,
				outcome: 'completed',
				agent_id: 'agent-1',
				operation: 'create',
				activity: 'creating',
				config_updated: true,
				user_wait_ms: undefined,
			},
		]);
		expect(validateAgent).toHaveBeenCalledWith('agent-1');
		expect(metricCalls('agent_verification')).toEqual([
			{
				success: true,
				valid: true,
				issue_codes: '',
				issue_count: 0,
				capability_count: 2,
				agent_id: 'agent-1',
				operation: 'create',
				activity: 'creating',
			},
		]);
	});

	it.each([
		{ name: 'invalid', valid: false, capabilityCount: 2 },
		{ name: 'valid without capabilities', valid: true, capabilityCount: 0 },
	])('does not count an agent that is $name as verified', async ({ valid, capabilityCount }) => {
		const { context } = makeContext({
			validation: {
				valid,
				issueCodes: valid ? [] : ['missing_credential', 'missing_required'],
				issueCount: valid ? 0 : 2,
				capabilityCount,
			},
		});
		recordAgentBuilderToolResult(context, 'agent-1', configChange);

		recordAgentBuildRunOutcome(context, 'completed');
		await flushDetached();

		expect(metricCalls('agent_verification')).toEqual([
			expect.objectContaining({ success: false, valid, capability_count: capabilityCount }),
		]);
	});

	it.each([
		{ state: 'changed', setup: 'change', activity: 'working' },
		{ state: 'tested', setup: 'test', activity: 'testing' },
		{ state: 'only selected', setup: 'select', activity: 'exploring' },
	] as const)('derives the $activity activity when the agent was $state', async (row) => {
		const { context } = makeContext();
		if (row.setup === 'change') recordAgentBuilderToolResult(context, 'agent-1', configChange);
		if (row.setup === 'test') {
			recordAgentBuilderToolResult(context, 'agent-1', {
				toolName: AGENT_BUILDER_TEST_TOOL_NAME,
				isError: false,
				output: { status: 'completed' },
				configMutated: false,
			});
		}
		if (row.setup === 'select') recordAgentSelected(context, 'agent-1', { created: false });

		recordAgentBuildRunOutcome(context, 'completed');
		await flushDetached();

		expect(metricCalls('agent_build')).toEqual([
			expect.objectContaining({ operation: 'update', activity: row.activity }),
		]);
	});

	it.each([
		{ status: 'errored', outcome: 'failed' },
		{ status: 'cancelled', outcome: 'cancelled' },
	] as const)(
		'records a $status run as $outcome without the validation',
		async ({ status, outcome }) => {
			const { context, validateAgent } = makeContext();
			recordAgentBuilderToolResult(context, 'agent-1', configChange);

			recordAgentBuildRunOutcome(context, status);
			await flushDetached();

			expect(metricCalls('agent_build')).toEqual([
				expect.objectContaining({ success: false, outcome, config_updated: true }),
			]);
			expect(validateAgent).not.toHaveBeenCalled();
			expect(metricCalls('agent_verification')).toEqual([]);
		},
	);

	it('skips the validation when the run did not change the config', async () => {
		const { context, validateAgent } = makeContext();
		recordAgentSelected(context, 'agent-1', { created: false });

		recordAgentBuildRunOutcome(context, 'completed');
		await flushDetached();

		expect(metricCalls('agent_build')).toHaveLength(1);
		expect(validateAgent).not.toHaveBeenCalled();
	});

	it('records one build for each agent of the run, once', async () => {
		const { context } = makeContext();
		recordAgentSelected(context, 'agent-1', { created: false });
		recordAgentSelected(context, 'agent-2', { created: true });

		recordAgentBuildRunOutcome(context, 'completed');
		recordAgentBuildRunOutcome(context, 'completed');
		await flushDetached();

		expect(metricCalls('agent_build').map((fields) => fields.agent_id)).toEqual([
			'agent-1',
			'agent-2',
		]);
	});

	it('records nothing for a run that did not work on an agent', async () => {
		const { context } = makeContext();

		recordAgentBuildRunOutcome(context, 'completed');
		await flushDetached();

		expect(emitBuilderMetric).not.toHaveBeenCalled();
	});

	it('records nothing without a trace', async () => {
		const { context, validateAgent } = makeContext({ withTracing: false });
		recordAgentBuilderToolResult(context, 'agent-1', configChange);

		recordAgentBuildRunOutcome(context, 'completed');
		await flushDetached();

		expect(emitBuilderMetric).not.toHaveBeenCalled();
		expect(validateAgent).not.toHaveBeenCalled();
	});

	it('records the time the user took to answer the builder suspensions', async () => {
		vi.useFakeTimers();
		try {
			const { context } = makeContext();
			recordAgentSelected(context, 'agent-1', { created: false });
			recordAgentBuilderSuspended(context);
			vi.advanceTimersByTime(1200);
			recordAgentBuilderResumed(context);
			recordAgentBuilderSuspended(context);
			vi.advanceTimersByTime(300);
			recordAgentBuilderResumed(context);
			// A resume without a recorded suspension adds nothing.
			recordAgentBuilderResumed(context);

			recordAgentBuildRunOutcome(context, 'completed');
			await flushDetached();

			expect(metricCalls('agent_build')).toEqual([expect.objectContaining({ user_wait_ms: 1500 })]);
		} finally {
			vi.useRealTimers();
		}
	});

	it('records agent_shown on the first config change of each agent only', async () => {
		const { context } = makeContext();
		recordAgentSelected(context, 'agent-1', { created: true });
		recordAgentBuilderToolResult(context, 'agent-1', configChange);
		recordAgentBuilderToolResult(context, 'agent-1', configChange);
		recordAgentBuilderToolResult(context, 'agent-2', {
			...configChange,
			toolName: 'agent_builder_write_config',
		});
		await flushDetached();

		expect(metricCalls('agent_shown')).toEqual([
			{
				success: true,
				agent_id: 'agent-1',
				operation: 'create',
				activity: 'creating',
				tool_name: 'agent_builder_patch_config',
			},
			{
				success: true,
				agent_id: 'agent-2',
				operation: 'update',
				activity: 'working',
				tool_name: 'agent_builder_write_config',
			},
		]);
	});

	it('does not record agent_shown for a call that did not change the config', async () => {
		const { context } = makeContext();
		recordAgentBuilderToolResult(context, 'agent-1', {
			toolName: 'agent_builder_read_config',
			isError: false,
			configMutated: false,
		});
		await flushDetached();

		expect(emitBuilderMetric).not.toHaveBeenCalled();
	});

	it.each([
		{
			name: 'a completed test',
			call: { isError: false, output: { status: 'completed' } },
			expected: { success: true, status: 'completed', code: undefined },
		},
		{
			name: 'a failed test with its code',
			call: { isError: false, output: { status: 'error', code: 'max_iterations' } },
			expected: { success: false, status: 'error', code: 'max_iterations' },
		},
		{
			name: 'a thrown test',
			call: { isError: true },
			expected: { success: false, status: 'error' },
		},
		{
			name: 'an unreadable test result',
			call: { isError: false, output: 'oops' },
			expected: { success: false, status: 'unknown' },
		},
	])('records agent_test for $name', async ({ call, expected }) => {
		const { context } = makeContext();
		recordAgentBuilderToolResult(context, 'agent-1', {
			toolName: AGENT_BUILDER_TEST_TOOL_NAME,
			configMutated: false,
			...call,
		});
		await flushDetached();

		expect(metricCalls('agent_test')).toEqual([{ agent_id: 'agent-1', ...expected }]);
	});
});

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
	carryAgentBuildRunState,
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

	it('records each config change of a created agent with the Publish validation', async () => {
		const { context, validateAgent } = makeContext();
		recordAgentSelected(context, 'agent-1', { created: true });
		recordAgentBuilderToolResult(context, 'agent-1', configChange);
		await flushDetached();

		expect(metricCalls('agent_build')).toEqual([
			{
				success: true,
				outcome: 'completed',
				agent_id: 'agent-1',
				operation: 'create',
				activity: 'creating',
				config_updated: true,
				tool_name: 'agent_builder_patch_config',
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

	it('records one build and one validation for each config change', async () => {
		const { context, validateAgent } = makeContext();
		recordAgentBuilderToolResult(context, 'agent-1', configChange);
		recordAgentBuilderToolResult(context, 'agent-1', configChange);
		await flushDetached();

		expect(metricCalls('agent_build')).toEqual([
			expect.objectContaining({ operation: 'update', activity: 'working' }),
			expect.objectContaining({ operation: 'update', activity: 'working' }),
		]);
		expect(validateAgent).toHaveBeenCalledTimes(2);
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
		await flushDetached();

		expect(metricCalls('agent_verification')).toEqual([
			expect.objectContaining({ success: false, valid, capability_count: capabilityCount }),
		]);
	});

	it('records no build for a call that failed or did not change the config', async () => {
		const { context, validateAgent } = makeContext();
		recordAgentSelected(context, 'agent-1', { created: false });
		recordAgentBuilderToolResult(context, 'agent-1', {
			toolName: 'agent_builder_patch_config',
			isError: true,
			configMutated: false,
		});
		recordAgentBuilderToolResult(context, 'agent-1', {
			toolName: 'agent_builder_read_config',
			isError: false,
			configMutated: false,
		});
		await flushDetached();

		expect(emitBuilderMetric).not.toHaveBeenCalled();
		expect(validateAgent).not.toHaveBeenCalled();
	});

	it('keeps agent_build when the validation fails', async () => {
		const { context, validateAgent } = makeContext();
		validateAgent.mockRejectedValue(new Error('draft missing'));
		recordAgentBuilderToolResult(context, 'agent-1', configChange);
		await flushDetached();

		expect(metricCalls('agent_build')).toHaveLength(1);
		expect(metricCalls('agent_verification')).toEqual([]);
		expect(context.logger.debug).toHaveBeenCalledWith(expect.stringContaining('draft missing'));
	});

	it('records nothing without a trace', async () => {
		const { context, validateAgent } = makeContext({ withTracing: false });
		recordAgentBuilderToolResult(context, 'agent-1', configChange);
		await flushDetached();

		expect(emitBuilderMetric).not.toHaveBeenCalled();
		expect(validateAgent).not.toHaveBeenCalled();
	});

	it('records the user wait of the builder suspensions on the next config change', async () => {
		vi.useFakeTimers();
		try {
			const { context } = makeContext();
			recordAgentBuilderSuspended(context);
			vi.advanceTimersByTime(1200);
			recordAgentBuilderResumed(context);
			recordAgentBuilderSuspended(context);
			vi.advanceTimersByTime(300);
			recordAgentBuilderResumed(context);
			// A resume without a recorded suspension adds nothing.
			recordAgentBuilderResumed(context);

			recordAgentBuilderToolResult(context, 'agent-1', configChange);
			await flushDetached();
			recordAgentBuilderToolResult(context, 'agent-1', configChange);
			await flushDetached();

			expect(metricCalls('agent_build').map((fields) => fields.user_wait_ms)).toEqual([
				1500,
				undefined,
			]);
		} finally {
			vi.useRealTimers();
		}
	});

	it('carries the run state to a context that a resume rebuilt', async () => {
		vi.useFakeTimers();
		try {
			const { context: previous } = makeContext();
			const { context: rebuilt } = makeContext();
			recordAgentSelected(previous, 'agent-1', { created: true });
			recordAgentBuilderToolResult(previous, 'agent-1', configChange);
			await flushDetached();
			recordAgentBuilderSuspended(previous);
			vi.advanceTimersByTime(800);

			carryAgentBuildRunState(previous, rebuilt);
			recordAgentBuilderResumed(rebuilt);
			recordAgentBuilderToolResult(rebuilt, 'agent-1', configChange);
			await flushDetached();

			expect(metricCalls('agent_shown')).toHaveLength(1);
			expect(metricCalls('agent_build').at(-1)).toEqual(
				expect.objectContaining({ operation: 'create', activity: 'creating', user_wait_ms: 800 }),
			);
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

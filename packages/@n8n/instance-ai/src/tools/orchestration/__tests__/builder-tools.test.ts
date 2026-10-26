import type { BuiltTool, InterruptibleToolContext, ToolContext } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import { canEmitBuilderMetric } from '../../../tracing/builder-metric-event';
import type {
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	InstanceAiTraceContext,
	OrchestrationContext,
} from '../../../types';
import {
	recordAgentBuilderResumed,
	recordAgentBuilderSuspended,
	recordAgentBuilderToolResult,
} from '../agent-build-metrics';
import { createAgentBuilderTools } from '../builder-tools';

vi.mock('../agent-build-metrics', () => ({
	recordAgentBuilderResumed: vi.fn(),
	recordAgentBuilderSuspended: vi.fn(),
	recordAgentBuilderToolResult: vi.fn(),
}));

vi.mock('../../../tracing/builder-metric-event', () => ({
	canEmitBuilderMetric: vi.fn(() => true),
}));

const BOUND = { agentId: 'agent-1', projectId: 'project-1', name: 'Support', ref: 'support' };

type BuilderHandler = NonNullable<BuiltTool['handler']>;

function setup(
	toolResult: unknown,
	domainOverrides: Partial<InstanceAiContext> = {},
	options: { toolName?: string; handler?: BuilderHandler } = {},
) {
	const delegate = mock<InstanceAiBuilderDelegate>();
	const handler = vi.fn<BuilderHandler>(options.handler ?? (async () => toolResult));
	const builderTool: BuiltTool = {
		name: options.toolName ?? 'agent_builder_patch_config',
		description: 'Patch config',
		handler,
	};
	delegate.getBuilderTools.mockReturnValue([builderTool]);
	const onArtifactChanged = vi.fn();
	const domainContext = {
		userId: 'user-1',
		threadId: 'thread-1',
		projectId: 'project-1',
		logger: { debug: vi.fn(), warn: vi.fn() },
		agentBuilderTarget: BOUND,
		onArtifactChanged,
		...domainOverrides,
	} as unknown as InstanceAiContext;
	const context = {
		threadId: 'thread-1',
		runId: 'run-1',
		logger: { debug: vi.fn(), warn: vi.fn() },
		tracing: {} as InstanceAiTraceContext,
		domainContext,
	} as unknown as OrchestrationContext;

	const [tool] = createAgentBuilderTools(context, delegate);
	const run = async (ctx: ToolContext | InterruptibleToolContext = {}) =>
		await tool.handler!({ op: 'replace' }, ctx);
	return { context, delegate, domainContext, handler, onArtifactChanged, run, tool };
}

function interruptibleContext(
	overrides: Partial<InterruptibleToolContext> = {},
): InterruptibleToolContext {
	return {
		suspend: vi.fn(async () => await Promise.resolve({ suspended: true } as never)),
		resumeData: undefined,
		...overrides,
	};
}

describe('createAgentBuilderTools', () => {
	beforeEach(() => {
		vi.mocked(canEmitBuilderMetric).mockReturnValue(true);
		vi.mocked(recordAgentBuilderToolResult).mockClear();
		vi.mocked(recordAgentBuilderSuspended).mockClear();
		vi.mocked(recordAgentBuilderResumed).mockClear();
	});

	it('resolves the target agent from the thread binding', async () => {
		const { delegate } = setup({ ok: true });

		const [resolveTarget, session] = delegate.getBuilderTools.mock.calls[0];

		await expect(resolveTarget()).resolves.toBe('agent-1');
		expect(session).toEqual({ threadId: 'thread-1', runId: 'run-1' });
	});

	it('returns a non-mutating result unchanged', async () => {
		const { run, onArtifactChanged } = setup({ ok: true, configHash: 'abc' });

		await expect(run()).resolves.toEqual({ ok: true, configHash: 'abc' });
		expect(onArtifactChanged).not.toHaveBeenCalled();
	});

	it('refreshes the name and shows the artifact after a config change', async () => {
		const { run, delegate, domainContext, onArtifactChanged } = setup({
			ok: true,
			configMutated: true,
			agentId: 'agent-1',
		});
		delegate.resolveAgentName.mockResolvedValue('Support Triage');

		await expect(run()).resolves.toEqual({
			ok: true,
			configMutated: true,
			agentId: 'agent-1',
			agentName: 'Support Triage',
			projectId: 'project-1',
		});
		expect(onArtifactChanged).toHaveBeenCalledWith({
			type: 'agent',
			id: 'agent-1',
			projectId: 'project-1',
			name: 'Support Triage',
		});
		expect(domainContext.agentBuilderTarget).toMatchObject({ name: 'Support Triage' });
	});

	it('labels a config change for an agent that is not selected without rebinding', async () => {
		const { run, delegate, domainContext, onArtifactChanged } = setup({
			ok: true,
			configMutated: true,
			agentId: 'agent-other',
		});
		delegate.resolveAgentName.mockResolvedValue('Billing');

		await expect(run()).resolves.toEqual({
			ok: true,
			configMutated: true,
			agentId: 'agent-other',
			agentName: 'Billing',
			projectId: 'project-1',
		});
		expect(delegate.resolveAgentName).toHaveBeenCalledWith('agent-other');
		expect(onArtifactChanged).toHaveBeenCalledWith({
			type: 'agent',
			id: 'agent-other',
			projectId: 'project-1',
			name: 'Billing',
		});
		expect(domainContext.agentBuilderTarget).toEqual(BOUND);
	});

	it('leaves the result unchanged when the agent is not selected and the thread has no project', async () => {
		const { run, onArtifactChanged } = setup(
			{ ok: true, configMutated: true, agentId: 'agent-other' },
			{ projectId: undefined },
		);

		await expect(run()).resolves.toEqual({
			ok: true,
			configMutated: true,
			agentId: 'agent-other',
		});
		expect(onArtifactChanged).not.toHaveBeenCalled();
	});

	describe('build metrics', () => {
		it('records a config change for the agent it changed', async () => {
			const { run, context } = setup({ ok: true, configMutated: true, agentId: 'agent-other' });

			await run();

			expect(recordAgentBuilderToolResult).toHaveBeenCalledWith(context, 'agent-other', {
				toolName: 'agent_builder_patch_config',
				isError: false,
				output: { ok: true, configMutated: true, agentId: 'agent-other' },
				configMutated: true,
			});
		});

		it('records a call that did not change the config for the selected agent', async () => {
			const output = { status: 'completed', sessionId: 's-1' };
			const { run, context } = setup(output, {}, { toolName: 'agent_builder_call_agent' });

			await run();

			expect(recordAgentBuilderToolResult).toHaveBeenCalledWith(context, 'agent-1', {
				toolName: 'agent_builder_call_agent',
				isError: false,
				output,
				configMutated: false,
			});
		});

		it('records a thrown call as an error and rethrows it', async () => {
			const { run, context } = setup(
				undefined,
				{},
				{
					handler: async () => {
						throw new Error('boom');
					},
				},
			);

			await expect(run()).rejects.toThrow('boom');

			expect(recordAgentBuilderToolResult).toHaveBeenCalledWith(context, 'agent-1', {
				toolName: 'agent_builder_patch_config',
				isError: true,
				output: undefined,
				configMutated: false,
			});
		});

		it('records the suspension, not a result, when the call suspends', async () => {
			const { run, context } = setup(
				undefined,
				{},
				{
					handler: async (_input, ctx) => {
						if (!('suspend' in ctx)) throw new Error('expected an interruptible context');
						return await ctx.suspend({ question: 'Which model?' });
					},
				},
			);
			const ctx = interruptibleContext();

			await expect(run(ctx)).resolves.toEqual({ suspended: true });

			expect(ctx.suspend).toHaveBeenCalledWith({ question: 'Which model?' }, undefined);
			expect(recordAgentBuilderSuspended).toHaveBeenCalledWith(context);
			expect(recordAgentBuilderToolResult).not.toHaveBeenCalled();
		});

		it('records the resume of a suspended call', async () => {
			const { run, context } = setup({ ok: true });

			await run(interruptibleContext({ resumeData: { answer: 'Claude' } }));

			expect(recordAgentBuilderResumed).toHaveBeenCalledWith(context);
			expect(recordAgentBuilderToolResult).toHaveBeenCalled();
		});

		it('records nothing without a trace', async () => {
			vi.mocked(canEmitBuilderMetric).mockReturnValue(false);
			const { run } = setup({ ok: true, configMutated: true, agentId: 'agent-1' });

			await run();

			expect(recordAgentBuilderToolResult).not.toHaveBeenCalled();
		});
	});
});

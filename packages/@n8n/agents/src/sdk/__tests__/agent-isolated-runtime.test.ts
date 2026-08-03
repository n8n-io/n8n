import * as aiModule from 'ai';
import type { Mock } from 'vitest';
import { z } from 'zod';

import type { AgentRuntimeConfig } from '../../runtime/loop/agent-runtime';
import type { AgentEventBus } from '../../runtime/state/event-bus';
import { AgentEvent } from '../../runtime/state/event-bus';
import { createRuntimeSkillRegistry } from '../../skills';
import type { RuntimeSkillSource } from '../../skills';
import type { StreamChunk } from '../../types';
import { Agent } from '../agent';
import { wrapToolForApproval } from '../tool';

vi.mock('@ai-sdk/openai', () => ({
	createOpenAI: () => () => ({ provider: 'openai', modelId: 'mock', specificationVersion: 'v3' }),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type AiImport = typeof import('ai');

vi.mock('ai', async () => {
	const actual = await vi.importActual<AiImport>('ai');
	return {
		...actual,
		generateText: vi.fn(),
	};
});

const { generateText } = aiModule as unknown as {
	generateText: Mock;
};

type ActiveRuntime = {
	bus: AgentEventBus;
};

type AgentInternals = {
	ensureBuilt(): Promise<AgentRuntimeConfig>;
	prepareRuntimeConfig(
		baseConfig: AgentRuntimeConfig,
		executionOptions?: Parameters<Agent['generate']>[1],
	): Promise<AgentRuntimeConfig>;
	createRuntime(config: AgentRuntimeConfig, runId?: string): ActiveRuntime;
	trackStreamRuntime(
		stream: ReadableStream<StreamChunk>,
		active: ActiveRuntime,
	): ReadableStream<StreamChunk>;
	cleanupRuntime(active: ActiveRuntime): Promise<void>;
	activeRuntimes: Set<ActiveRuntime>;
};

function makeGenerateSuccess(text: string) {
	return {
		finishReason: 'stop',
		usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		response: {
			messages: [
				{
					role: 'assistant',
					content: [{ type: 'text', text }],
				},
			],
		},
		toolCalls: [],
	};
}

function makeGenerateWithToolCall(toolCallId: string, toolName: string, input: unknown) {
	return {
		finishReason: 'tool-calls',
		usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
		response: {
			messages: [
				{
					role: 'assistant',
					content: [{ type: 'tool-call', toolCallId, toolName, args: input, input }],
				},
			],
		},
		toolCalls: [{ toolCallId, toolName, input }],
	};
}

function makeRuntimeSkill(id: string) {
	return {
		id,
		name: `${id} name`,
		description: `${id} description`,
		instructions: `${id} instructions`,
	};
}

function makePreparedSkillSource(skill: ReturnType<typeof makeRuntimeSkill>): RuntimeSkillSource {
	const source: RuntimeSkillSource = {
		registry: createRuntimeSkillRegistry([]),
		prepare: vi.fn(async () => {
			source.registry = createRuntimeSkillRegistry([skill]);
			await Promise.resolve();
		}),
		loadSkill: vi.fn(async (skillId) => await Promise.resolve(skillId === skill.id ? skill : null)),
	};
	return source;
}

describe('Agent isolated runtimes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('keeps result state bound to the runtime that produced it', async () => {
		generateText
			.mockResolvedValueOnce(makeGenerateSuccess('first response'))
			.mockResolvedValueOnce(makeGenerateSuccess('second response'));
		const agent = new Agent('agent').model('openai/gpt-4o-mini').instructions('test');

		const first = await agent.generate('first');
		const second = await agent.generate('second');

		expect(first.getState().messageList.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					content: expect.arrayContaining([expect.objectContaining({ text: 'first response' })]),
				}),
			]),
		);
		expect(second.getState().messageList.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					content: expect.arrayContaining([expect.objectContaining({ text: 'second response' })]),
				}),
			]),
		);
	});

	it('isolates concurrent runtime overlays without mutating cached agent state', async () => {
		let modelCalls = 0;
		let markBothCallsStarted = () => {};
		const bothCallsStarted = new Promise<void>((resolve) => {
			markBothCallsStarted = resolve;
		});
		let releaseModelCalls = () => {};
		const modelCallsReleased = new Promise<void>((resolve) => {
			releaseModelCalls = resolve;
		});
		generateText.mockImplementation(async () => {
			modelCalls++;
			if (modelCalls === 2) markBothCallsStarted();
			await modelCallsReleased;
			return makeGenerateSuccess('ok');
		});
		const baseInputSchema = z.object({ base: z.string() });
		const agent = new Agent('agent')
			.model('openai/gpt-4o-mini')
			.instructions('base instructions')
			.tool({
				name: 'lookup',
				description: 'base description',
				inputSchema: baseInputSchema,
				handler: async () => await Promise.resolve('base'),
			});
		const internals = agent as unknown as AgentInternals;
		const baseConfig = await internals.ensureBuilt();
		const createRuntime = vi.spyOn(internals, 'createRuntime');
		const runs = [
			{
				instructions: 'first instructions',
				description: 'first description',
				inputSchema: z.object({ first: z.string() }),
			},
			{
				instructions: 'second instructions',
				description: 'second description',
				inputSchema: z.object({ second: z.string() }),
			},
		];
		const pendingRuns = runs.map(
			async (run) =>
				await agent.generate(run.instructions, {
					runtimeOverlay: {
						instructions: run.instructions,
						toolOverrides: new Map([
							[
								'lookup',
								{
									description: run.description,
									inputSchema: run.inputSchema,
								},
							],
						]),
					},
				}),
		);

		await bothCallsStarted;
		releaseModelCalls();
		await Promise.all(pendingRuns);

		for (const run of runs) {
			const config = createRuntime.mock.calls.find(
				([runtimeConfig]) => runtimeConfig.instructions === run.instructions,
			)?.[0];
			const tool = config?.tools?.find((candidate) => candidate.name === 'lookup');
			expect(tool?.description).toBe(run.description);
			expect(tool?.inputSchema).toBe(run.inputSchema);
		}
		expect(baseConfig.instructions).toBe('base instructions');
		expect(baseConfig.tools?.find((tool) => tool.name === 'lookup')).toMatchObject({
			description: 'base description',
			inputSchema: baseInputSchema,
		});
	});

	it('keeps each prepared run skill catalog paired with its loader without mutating base', async () => {
		const baseSkill = makeRuntimeSkill('base_skill');
		const firstSkill = makeRuntimeSkill('first_skill');
		const secondSkill = makeRuntimeSkill('second_skill');
		const firstSource = makePreparedSkillSource(firstSkill);
		const secondSource = makePreparedSkillSource(secondSkill);
		const agent = new Agent('agent')
			.model('openai/gpt-4o-mini')
			.instructions('base instructions')
			.skills([baseSkill]);
		const internals = agent as unknown as AgentInternals;
		const baseConfig = await internals.ensureBuilt();

		const [firstConfig, secondConfig] = await Promise.all(
			[firstSource, secondSource].map(
				async (skillSource) =>
					await internals.prepareRuntimeConfig(baseConfig, {
						runtimeOverlay: { skillSource },
					}),
			),
		);

		for (const [config, source, skill, otherSkill] of [
			[firstConfig, firstSource, firstSkill, secondSkill],
			[secondConfig, secondSource, secondSkill, firstSkill],
		] as const) {
			expect(source.prepare).toHaveBeenCalledOnce();
			expect(config.instructions).toContain(`name: "${skill.name}"`);
			expect(config.instructions).not.toContain(`name: "${otherSkill.name}"`);
			expect(config.instructions).not.toContain(`name: "${baseSkill.name}"`);
			const loadSkill = config.tools?.find((tool) => tool.name === 'load_skill')?.handler;
			if (!loadSkill) throw new Error('Expected a runtime skill loader');
			await loadSkill({ skillId: skill.id }, {});
			expect(source.loadSkill).toHaveBeenCalledOnce();
			expect(source.loadSkill).toHaveBeenCalledWith(skill.id);
		}
		expect(baseConfig.instructions).toContain(`name: "${baseSkill.name}"`);
		expect(baseConfig.tools?.some((tool) => tool.name === 'load_skill')).toBe(true);
	});

	it('rejects a custom load_skill tool when a run catalog needs the reserved loader', async () => {
		const runtimeSkill = makeRuntimeSkill('runtime_skill');
		const agent = new Agent('agent')
			.model('openai/gpt-4o-mini')
			.instructions('instructions')
			.tool({
				name: 'load_skill',
				description: 'Custom loader',
				inputSchema: z.object({}),
				handler: async () => await Promise.resolve('custom'),
			});
		const internals = agent as unknown as AgentInternals;

		await expect(
			internals.prepareRuntimeConfig(await internals.ensureBuilt(), {
				runtimeOverlay: {
					skillSource: makePreparedSkillSource(runtimeSkill),
				},
			}),
		).rejects.toThrow('Tool name "load_skill" is reserved for runtime skills');
	});

	it('applies event handler changes to active runtimes', async () => {
		const agent = new Agent('agent').model('openai/gpt-4o-mini').instructions('test');
		const internals = agent as unknown as AgentInternals;
		const active = internals.createRuntime(await internals.ensureBuilt());
		const handler = vi.fn();

		agent.on(AgentEvent.AgentEnd, handler);
		active.bus.emit({ type: AgentEvent.AgentEnd, messages: [] });
		agent.off(AgentEvent.AgentEnd, handler);
		active.bus.emit({ type: AgentEvent.AgentEnd, messages: [] });

		expect(handler).toHaveBeenCalledTimes(1);
		await internals.cleanupRuntime(active);
	});

	it('merges default and per-run providerOptions by provider instead of overwriting', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('ok'));
		const agent = new Agent('agent')
			.model('openai/gpt-4o-mini')
			.instructions('test')
			.configuration({ providerOptions: { openai: { promptCacheRetention: '24h' } } });

		await agent.generate('hello', { providerOptions: { openai: { promptCacheKey: 'k' } } });

		const callArgs = generateText.mock.calls[0][0] as { providerOptions: Record<string, unknown> };
		expect(callArgs.providerOptions.openai).toEqual({
			promptCacheRetention: '24h',
			promptCacheKey: 'k',
		});
	});

	it('preserves approval metadata and handlers when applying declarative overrides', async () => {
		const baseHandler = vi.fn().mockResolvedValue('base');
		const approvalTool = wrapToolForApproval(
			{
				name: 'approval_tool',
				description: 'Base description',
				inputSchema: z.object({}),
				handler: baseHandler,
			},
			{ requireApproval: true },
		);
		const agent = new Agent('agent')
			.model('openai/gpt-4o-mini')
			.instructions('base instructions')
			.tool(approvalTool)
			.checkpoint('memory');
		const internals = agent as unknown as AgentInternals;

		const config = await internals.prepareRuntimeConfig(await internals.ensureBuilt(), {
			runtimeOverlay: {
				toolOverrides: new Map([
					[
						'approval_tool',
						{
							description: 'Overlay description',
						},
					],
				]),
			},
		});

		expect(config.tools?.find((tool) => tool.name === 'approval_tool')).toMatchObject({
			description: 'Overlay description',
			approval: approvalTool.approval,
			handler: approvalTool.handler,
		});
	});

	it('forwards the exact runtime context when resuming an interruptible tool', async () => {
		generateText
			.mockResolvedValueOnce(makeGenerateWithToolCall('call-1', 'interruptible_tool', {}))
			.mockResolvedValueOnce(makeGenerateSuccess('resumed'));
		const receivedContexts: unknown[] = [];
		const agent = new Agent('agent')
			.model('openai/gpt-4o-mini')
			.instructions('base instructions')
			.tool({
				name: 'interruptible_tool',
				description: 'Suspends once',
				inputSchema: z.object({}),
				suspendSchema: z.object({ requestId: z.string() }),
				resumeSchema: z.object({ approved: z.boolean() }),
				handler: async (_input, ctx) => {
					receivedContexts.push(ctx.runtimeContext);
					if (!('suspend' in ctx)) throw new Error('Expected interruptible context');
					if (ctx.resumeData === undefined) {
						return await ctx.suspend({ requestId: 'request-1' });
					}
					return await Promise.resolve('resumed');
				},
			})
			.checkpoint('memory');
		const initialContext = { variables: { segment: 'initial' } };
		const resumeContext = { variables: { segment: 'resume' } };

		const initialResult = await agent.generate('run tool', { runtimeContext: initialContext });
		const pending = initialResult.pendingSuspend?.[0];
		expect(pending).toBeDefined();

		await agent.resume(
			'generate',
			{ approved: true },
			{
				runId: pending!.runId,
				toolCallId: pending!.toolCallId,
				runtimeContext: resumeContext,
			},
		);

		expect(receivedContexts).toHaveLength(2);
		expect(receivedContexts[0]).toBe(initialContext);
		expect(receivedContexts[1]).toBe(resumeContext);
	});

	it('maps provider-specific thinking from the Agent SDK into providerOptions', async () => {
		generateText.mockResolvedValue(makeGenerateSuccess('ok'));
		const agent = new Agent('agent')
			.model('openai/gpt-4o-mini')
			.instructions('test')
			.thinking('openai', { reasoningEffort: 'high' });

		await agent.generate('hello');

		const callArgs = generateText.mock.calls[0][0] as { providerOptions: Record<string, unknown> };
		expect(callArgs.providerOptions.openai).toEqual({
			reasoningEffort: 'high',
			reasoningSummary: null,
		});
	});

	it('cleans up the active runtime when a wrapped stream is cancelled', async () => {
		const agent = new Agent('agent').model('openai/gpt-4o-mini').instructions('test');
		const internals = agent as unknown as AgentInternals;
		const active = internals.createRuntime(await internals.ensureBuilt());
		const sourceCancel = vi.fn();
		const stream = internals.trackStreamRuntime(
			new ReadableStream<StreamChunk>({
				start(controller) {
					controller.enqueue({ type: 'start-step' });
				},
				cancel: sourceCancel,
			}),
			active,
		);
		const reader = stream.getReader();

		expect(internals.activeRuntimes.has(active)).toBe(true);
		await reader.read();
		await reader.cancel('client disconnected');
		reader.releaseLock();

		expect(sourceCancel).toHaveBeenCalledWith('client disconnected');
		expect(internals.activeRuntimes.has(active)).toBe(false);
	});
});

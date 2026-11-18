import type { Workspace } from '@n8n/agents';
import type {
	AgentEvalSuiteCase,
	AgentProposalCaseArm,
	AgentProposalEdit,
	AgentProposalEvidence,
	InstanceAiEvalLlmUsage,
} from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	createAgentImprovementAgent,
	createInstanceAiTraceContext,
	streamAgentRun,
	type AgentImprovementHostTools,
	type InstanceAiContext,
	type StreamRunResult,
} from '@n8n/instance-ai';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { AgentEvalProposalService } from '@/modules/agent-evals/agent-eval-proposal.service';
import { AgentContextService } from '@/modules/agents/agent-context.service';
import type { AgentProductionTrace } from '@/modules/agents/agent-context.contracts';
import type { AgentProposalBase } from '@/modules/agents/agent-proposal.contracts';
import { AgentProposalService } from '@/modules/agents/agent-proposal.service';
import { formatAgentSessionTranscriptPage } from '@/modules/agents/format-agent-session-context';

import type { InProcessEventBus } from '../../event-bus/in-process-event-bus';
import type { InstanceAiAdapterService } from '../../instance-ai.adapter.service';
import type { InstanceAiCreditService } from '../../instance-ai-credit.service';
import { InstanceAiErrorReporterService } from '../../instance-ai-error-reporter.service';
import type { InstanceAiModelService } from '../../instance-ai-model.service';
import type { TypeORMAgentMemory } from '../../storage/typeorm-agent-memory';
import {
	SelfHealingAgentInvestigatorService,
	type AgentImprovementRunInput,
	type AgentImprovementRunOptions,
} from '../agents/self-healing-agent-investigator.service';

vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/instance-ai')>()),
	createAgentImprovementAgent: vi.fn(),
	streamAgentRun: vi.fn(),
	createInstanceAiTraceContext: vi.fn(),
}));
vi.mock('@n8n/agents/sandbox', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents/sandbox')>()),
	getWorkspaceRoot: vi.fn().mockResolvedValue('/workspace'),
}));
// The services of other modules are resolved from the container at run time.
vi.mock('@/modules/agent-evals/agent-eval-proposal.service', () => ({
	AgentEvalProposalService: class {},
}));
vi.mock('@/modules/agents/agent-context.service', () => ({ AgentContextService: class {} }));
vi.mock('@/modules/agents/agent-proposal.service', () => ({ AgentProposalService: class {} }));
vi.mock('@/modules/agents/format-agent-session-context', () => ({
	formatAgentSessionTranscriptPage: vi.fn(),
}));

const user = mock<User>({ id: 'actor', disabled: false });
const modelFetch = vi.fn();
const base: AgentProposalBase = {
	agentId: 'agent',
	agentName: 'Support agent',
	versionId: 'version-1',
	publishedAt: new Date('2026-01-01T00:00:00.000Z'),
	model: 'anthropic/claude-sonnet-5',
	instructions: 'Help the customer.',
	tools: [
		{ type: 'node', name: 'Find_Order', description: 'Finds an order.', editable: true },
		{ type: 'workflow', name: 'find-customer', description: 'Finds a customer.', editable: true },
		{ type: 'custom', name: 'refund', description: null, editable: false },
		{ type: 'mcp', name: 'crm', description: null, editable: false },
	],
	skills: [],
	subAgents: ['Billing agent'],
};
const input: AgentImprovementRunInput = {
	user,
	threadId: 'internal-thread',
	investigationId: 'investigation',
	projectId: 'project',
	agentId: 'agent',
	goals: ['quality'],
	base,
	traceWindow: {
		after: new Date('2026-01-01T00:00:00.000Z'),
		until: new Date('2026-01-08T00:00:00.000Z'),
	},
	traceCount: 12,
};
const suiteCases: AgentEvalSuiteCase[] = [
	{
		caseId: 'dataset:1',
		input: 'Where is my order?',
		criteria: 'Gives the order status.',
		expectedOutput: 'Shipped.',
		expectedTools: ['Find_Order'],
	},
	{
		caseId: 'dataset:2',
		input: 'Who am I?',
		criteria: 'Gives the customer name.',
		expectedOutput: null,
		expectedTools: [],
	},
];
const validOutput = {
	outcome: 'proposal',
	summary: 'Clarified the lookup tools.',
	report: 'The tests passed.',
};
const normalizedEdit: AgentProposalEdit = {
	kind: 'instructions',
	before: 'Help the customer.',
	after: 'Help the customer. Find the order first.',
};
const arm = (outcome: 'pass' | 'fail', tool: string): AgentProposalCaseArm => ({
	status: 'success',
	answer: 'Answer',
	verdict: { status: 'completed', outcome, reasoning: `The check gave ${outcome}.` },
	toolCalls: [{ tool, kind: 'node', failed: false }],
	usage: { inputTokens: 1, outputTokens: 1, costUsd: null, durationMs: 10 },
});
const helperUsage: InstanceAiEvalLlmUsage = {
	agent: 'eval-mock-responder',
	model: 'anthropic/claude-haiku-5-5',
	calls: 1,
	uncachedInputTokens: 100,
	cacheReadTokens: 20,
	cacheWriteTokens: 5,
	outputTokens: 30,
};

describe('SelfHealingAgentInvestigatorService', () => {
	const config = mock<GlobalConfig>({
		instanceAi: { thinkingEnabled: false, modelRequestLabels: true },
		ai: {},
	});
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const memory = mock<TypeORMAgentMemory>();
	const adapter = mock<InstanceAiAdapterService>();
	const models = mock<InstanceAiModelService>();
	const credits = mock<InstanceAiCreditService>();
	const events = mock<InProcessEventBus>();
	const moduleRegistry = mock<ModuleRegistry>();
	const agentContext = mock<AgentContextService>();
	const agentProposals = mock<AgentProposalService>();
	const evalProposals = mock<AgentEvalProposalService>();
	const workspace = mock<Workspace>();
	const service = new SelfHealingAgentInvestigatorService(
		config,
		logger,
		memory,
		adapter,
		models,
		credits,
		events,
		new InstanceAiErrorReporterService(logger, mock<ErrorReporter>()),
		moduleRegistry,
	);

	let controller: AbortController;
	let options: AgentImprovementRunOptions;
	let stream: StreamRunResult;
	let context: InstanceAiContext;
	let evidence: AgentProposalEvidence;

	/** Runs `use` with the host tools while the agent stream is open. */
	function duringRun(use: (tools: AgentImprovementHostTools) => Promise<void>) {
		vi.mocked(streamAgentRun).mockImplementationOnce(async () => {
			await use(vi.mocked(createAgentImprovementAgent).mock.calls[0][0].tools);
			return stream;
		});
	}

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(AgentContextService, agentContext);
		Container.set(AgentProposalService, agentProposals);
		Container.set(AgentEvalProposalService, evalProposals);
		moduleRegistry.isActive.mockReturnValue(true);
		Object.assign(moduleRegistry, { settings: new Map() });
		controller = new AbortController();
		options = {
			threadId: input.threadId,
			runId: 'host-run',
			signal: controller.signal,
			sandbox: {
				getOrCreateWorkspace: vi.fn().mockResolvedValue({ workspace }),
				destroySandbox: vi.fn().mockResolvedValue(undefined),
			},
			tracing: {
				registerTraceContext: vi.fn(),
				finalizeRunTracing: vi.fn(),
				finalizeMessageTraceRoot: vi.fn(),
			},
			createProxyRunConfig: vi.fn().mockResolvedValue({}),
			assertCreditsAvailable: vi.fn().mockResolvedValue(undefined),
			onActivity: vi.fn(),
			onFinalizing: vi.fn(),
			onComplete: vi.fn(),
			getAbortReason: () => 'shutdown',
			onFinish: vi.fn(),
		};
		models.resolveAgentModelConfig.mockResolvedValue('test/model');
		models.resolveUtilityModelConfig.mockResolvedValue('test/utility');
		models.getLabeledModelFetch.mockReturnValue(modelFetch);
		models.isProxyEnabled.mockReturnValue(true);
		context = mock<InstanceAiContext>();
		adapter.createContext.mockReturnValue(context);
		credits.claimRunUsage.mockResolvedValue(0.25);
		vi.mocked(createAgentImprovementAgent).mockResolvedValue(
			mock<Awaited<ReturnType<typeof createAgentImprovementAgent>>>(),
		);
		evalProposals.availability.mockReturnValue('ok');
		evalProposals.listCases.mockResolvedValue(suiteCases);
		evidence = {
			ranAt: '2026-01-08T00:00:00.000Z',
			cases: [
				{
					caseKey: 'new:0',
					origin: 'proposal',
					motivating: true,
					input: 'Find order 5.',
					criteria: 'Gives the order.',
					expectedOutput: null,
					expectedTools: ['Find_Order'],
					published: arm('fail', 'find-customer'),
					proposed: arm('pass', 'Find_Order'),
				},
			],
		};
		evalProposals.compare.mockResolvedValue(evidence);
		agentProposals.normalizeEdits.mockResolvedValue({ edits: [normalizedEdit] });
		stream = {
			status: 'completed',
			agentRunId: 'sdk-run',
			structuredOutput: validOutput,
			finishReason: 'stop',
			workSummary: {
				toolCalls: [],
				totalToolCalls: 0,
				totalToolErrors: 0,
				askedClarifyingQuestion: false,
			},
			usage: {
				promptTokens: 10,
				completionTokens: 5,
				totalTokens: 15,
				costUsd: 0,
				usage: [
					{
						type: 'llmTokens',
						model: 'test/model',
						uncachedInput: 10,
						cacheRead: 0,
						cacheWrite: 0,
						output: 5,
					},
				],
			},
		};
		vi.mocked(streamAgentRun).mockImplementation(async () => stream);
	});

	const proposalInput = {
		edits: [{ kind: 'instructions' as const, after: normalizedEdit.after }],
		evalCases: [
			{
				input: 'Find order 5.',
				criteria: 'Gives the order.',
				expectedTools: ['Find_Order', '!find-customer'],
				motivating: true,
			},
		],
		regressionCaseIds: ['dataset:1'],
	};

	it('runs the agent on a hidden thread and reports the result', async () => {
		const result = await service.execute(input, options);

		expect(result).toEqual({
			status: 'completed',
			finishReason: 'stop',
			output: validOutput,
			usage: { credits: 0.25, turns: null, durationSeconds: expect.any(Number) },
			lastTested: null,
		});
		expect(memory.saveThreadWithProject).toHaveBeenCalledWith(
			{
				id: input.threadId,
				resourceId: 'ia-self-healing:actor',
				metadata: {
					agentImprovement: {
						backgroundUserId: 'actor',
						projectId: 'project',
						agentId: 'agent',
						investigationId: 'investigation',
					},
					profileVersion: 'agent-improvement-v1',
				},
			},
			'project',
		);
		expect(memory.saveThreadWithProject.mock.invocationCallOrder[0]).toBeLessThan(
			events.publish.mock.invocationCallOrder[0],
		);
		expect(createInstanceAiTraceContext).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({
					self_healing: true,
					self_healing_agent_id: 'agent',
					self_healing_project_id: 'project',
				}),
			}),
		);
		expect(createAgentImprovementAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				modelId: 'test/model',
				context,
				modelFetch,
				requestLabels: true,
				abortSignal: controller.signal,
			}),
		);
		expect(context.workspace).toBeDefined();
		expect(streamAgentRun).toHaveBeenCalledWith(
			expect.anything(),
			'Investigate the agent and prepare one tested improvement.\n\n' +
				'Agent: "Support agent" (agent)\nGoals: quality\n' +
				'Production session window: start 2026-01-01T00:00:00.000Z, ' +
				'end 2026-01-08T00:00:00.000Z, 12 sessions',
			expect.objectContaining({
				recoverUsageOnAbort: true,
				persistence: expect.objectContaining({
					resourceId: 'ia-self-healing:actor',
					threadId: input.threadId,
					hostRunId: 'host-run',
				}),
			}),
			expect.objectContaining({ signal: controller.signal }),
		);
		expect(credits.claimRunUsage).toHaveBeenCalledExactlyOnceWith(
			user,
			input.threadId,
			'sdk-run',
			stream.usage?.usage,
			'completed',
			'self_healing',
		);
		expect(options.onComplete).toHaveBeenCalledExactlyOnceWith(result, controller.signal);
		expect(options.onFinish).toHaveBeenCalledExactlyOnceWith(
			{ status: 'completed', reason: 'stop' },
			'test/model',
			stream,
		);
		expect(options.sandbox.destroySandbox).toHaveBeenCalledExactlyOnceWith(
			input.threadId,
			'thread_cleanup',
			user.id,
		);
	});

	it('continues without a workspace when the sandbox is unavailable', async () => {
		vi.mocked(options.sandbox.getOrCreateWorkspace).mockResolvedValue(undefined);
		context = { ...context, workspace: undefined };
		adapter.createContext.mockReturnValue(context);

		const result = await service.execute(input, options);

		expect(result.status).toBe('completed');
		expect(context.workspace).toBeUndefined();
		expect(options.sandbox.destroySandbox).not.toHaveBeenCalled();
	});

	it('returns the published definition and the goals', async () => {
		let definition: unknown;
		duringRun(async (tools) => {
			definition = await tools.getAgentDefinition();
		});

		await service.execute(input, options);

		expect(definition).toEqual({
			goals: ['quality'],
			agentName: 'Support agent',
			model: base.model,
			instructions: base.instructions,
			tools: base.tools,
			skills: base.skills,
			subAgents: base.subAgents,
		});
	});

	it('reads the eval suite one time for each run', async () => {
		const lists: unknown[] = [];
		duringRun(async (tools) => {
			lists.push(await tools.listEvalCases(), await tools.listEvalCases());
		});

		await service.execute(input, options);

		expect(lists).toEqual([{ cases: suiteCases }, { cases: suiteCases }]);
		expect(evalProposals.listCases).toHaveBeenCalledExactlyOnceWith(user, 'project', 'agent');
	});

	it('limits session reads to the window', async () => {
		const trace = mock<AgentProductionTrace>({ sessionId: 'thread-1', firstUserMessage: 'Hi' });
		agentContext.listProductionTraces.mockResolvedValue([trace]);
		agentContext.readProductionTrace.mockResolvedValueOnce(trace).mockResolvedValueOnce(null);
		vi.mocked(formatAgentSessionTranscriptPage).mockReturnValue({
			ok: true,
			transcript: 'The transcript',
			nextCursor: null,
		});
		let list: unknown;
		let read: unknown;
		let outside: unknown;
		duringRun(async (tools) => {
			list = await tools.listProductionSessions({ limit: 5, offset: 10 });
			read = await tools.readProductionSession({ sessionId: 'thread-1' });
			outside = await tools.readProductionSession({ sessionId: 'thread-2' });
		});

		await service.execute(input, options);

		expect(list).toEqual({ total: 12, sessions: [trace] });
		expect(agentContext.listProductionTraces).toHaveBeenCalledWith(
			user,
			'project',
			'agent',
			input.traceWindow,
			{ limit: 5, offset: 10 },
		);
		expect(agentContext.readProductionTrace).toHaveBeenCalledWith(
			user,
			'project',
			'agent',
			'thread-1',
			input.traceWindow,
		);
		expect(read).toMatchObject({
			sessionId: 'thread-1',
			transcript: 'The transcript',
			truncated: false,
		});
		expect(read).not.toHaveProperty('session');
		expect(outside).toEqual({ error: expect.any(String) });
	});

	it('tests a proposal and keeps it as the last tested proposal', async () => {
		let tested: unknown;
		duringRun(async (tools) => {
			tested = await tools.testProposal(proposalInput);
		});

		const result = await service.execute(input, options);

		expect(agentProposals.normalizeEdits).toHaveBeenCalledWith(
			user,
			'project',
			'agent',
			'version-1',
			proposalInput.edits,
		);
		const evalCase = {
			input: 'Find order 5.',
			criteria: 'Gives the order.',
			expectedTools: ['Find_Order', '!find-customer'],
		};
		expect(evalProposals.compare).toHaveBeenCalledExactlyOnceWith(user, {
			projectId: 'project',
			agentId: 'agent',
			baseVersionId: 'version-1',
			edits: [normalizedEdit],
			cases: [
				{
					...evalCase,
					caseKey: 'new:0',
					origin: 'proposal',
					motivating: true,
					expectedOutput: null,
				},
				{
					caseKey: 'dataset:1',
					origin: 'suite',
					motivating: false,
					input: suiteCases[0].input,
					criteria: suiteCases[0].criteria,
					expectedOutput: suiteCases[0].expectedOutput,
					expectedTools: suiteCases[0].expectedTools,
				},
			],
			helperModel: 'test/utility',
			onHelperUsage: expect.any(Function),
			abortSignal: controller.signal,
		});
		expect(tested).toEqual({
			ok: true,
			cases: [
				{
					caseKey: 'new:0',
					origin: 'proposal',
					motivating: true,
					published: {
						pass: false,
						runStatus: 'success',
						verdictReasoning: 'The check gave fail.',
						toolsCalled: ['find-customer'],
					},
					proposed: {
						pass: true,
						runStatus: 'success',
						verdictReasoning: 'The check gave pass.',
						toolsCalled: ['Find_Order'],
					},
				},
			],
		});
		expect(result.lastTested).toEqual({
			edits: [normalizedEdit],
			evalCases: [
				{
					...evalCase,
					caseKey: 'new:0',
					change: 'added',
					caseId: null,
					before: null,
					motivating: true,
				},
			],
			evidence,
		});
	});

	it('uses the suite case as the earlier content of an updated case', async () => {
		duringRun(async (tools) => {
			await tools.testProposal({
				edits: [],
				evalCases: [
					{
						caseId: 'dataset:2',
						input: 'Who am I?',
						criteria: 'Gives the full customer name.',
						expectedTools: ['find-customer'],
						motivating: false,
					},
				],
				regressionCaseIds: [],
			});
		});

		const result = await service.execute(input, options);

		expect(agentProposals.normalizeEdits).not.toHaveBeenCalled();
		expect(evalProposals.compare).toHaveBeenCalledWith(
			user,
			expect.objectContaining({
				edits: [],
				cases: [expect.objectContaining({ caseKey: 'dataset:2', origin: 'proposal' })],
			}),
		);
		expect(result.lastTested?.evalCases).toEqual([
			{
				caseKey: 'dataset:2',
				change: 'updated',
				caseId: 'dataset:2',
				input: 'Who am I?',
				criteria: 'Gives the full customer name.',
				expectedTools: ['find-customer'],
				before: { input: 'Who am I?', criteria: 'Gives the customer name.', expectedTools: [] },
				motivating: false,
			},
		]);
	});

	it('refuses a proposal with incorrect case IDs or expected tools', async () => {
		let tested: unknown;
		duringRun(async (tools) => {
			tested = await tools.testProposal({
				edits: [],
				evalCases: [
					{
						caseId: 'dataset:1',
						input: 'Where is my order?',
						criteria: null,
						expectedTools: ['crm', '!Unknown_Tool', 'refund'],
						motivating: false,
					},
					{
						caseId: 'dataset:9',
						input: 'A question',
						criteria: 'A rule',
						expectedTools: [],
						motivating: false,
					},
				],
				regressionCaseIds: ['dataset:1', 'dataset:8'],
			});
		});

		const result = await service.execute(input, options);

		expect(tested).toEqual({
			ok: false,
			errors: [
				expect.stringContaining('"dataset:9" is not in the result of list_eval_cases'),
				expect.stringContaining('"dataset:1" is given more than once'),
				expect.stringContaining('"dataset:8" is not in the result of list_eval_cases'),
				expect.stringContaining('Expected tool "crm"'),
				expect.stringContaining('Expected tool "Unknown_Tool"'),
			],
		});
		expect(evalProposals.compare).not.toHaveBeenCalled();
		expect(result.lastTested).toBeNull();
	});

	it('returns the errors of the edit check and runs nothing', async () => {
		agentProposals.normalizeEdits.mockResolvedValue({ errors: ['The edit changes nothing.'] });
		let tested: unknown;
		duringRun(async (tools) => {
			tested = await tools.testProposal(proposalInput);
		});

		const result = await service.execute(input, options);

		expect(tested).toEqual({ ok: false, errors: ['The edit changes nothing.'] });
		expect(evalProposals.compare).not.toHaveBeenCalled();
		expect(result.lastTested).toBeNull();
	});

	it('keeps the last successful test when a later comparison fails', async () => {
		evalProposals.compare
			.mockResolvedValueOnce(evidence)
			.mockRejectedValueOnce(new Error('The published agent did not run.'));
		let second: unknown;
		duringRun(async (tools) => {
			await tools.testProposal(proposalInput);
			second = await tools.testProposal({ ...proposalInput, regressionCaseIds: [] });
		});

		const result = await service.execute(input, options);

		expect(second).toEqual({ ok: false, errors: ['The published agent did not run.'] });
		expect(result.lastTested?.evidence).toBe(evidence);
	});

	it.each([
		['the agent-evals module is inactive', () => moduleRegistry.isActive.mockReturnValue(false)],
		[
			'the instance is in queue mode',
			() => evalProposals.availability.mockReturnValue('queue_mode'),
		],
	])('refuses a test when %s', async (_name, arrange) => {
		arrange();
		let tested: unknown;
		duringRun(async (tools) => {
			tested = await tools.testProposal(proposalInput);
		});

		await service.execute(input, options);

		expect(tested).toEqual({ ok: false, errors: [expect.any(String)] });
		expect(evalProposals.compare).not.toHaveBeenCalled();
	});

	function reportHelperUsageDuringTest() {
		evalProposals.compare.mockImplementation(async (_user, { onHelperUsage }) => {
			await onHelperUsage?.([helperUsage]);
			await onHelperUsage?.([helperUsage]);
			return evidence;
		});
		duringRun(async (tools) => {
			await tools.testProposal(proposalInput);
		});
	}

	it('claims the helper usage of a test and adds its credits to the total', async () => {
		credits.claimRunUsage.mockResolvedValue(0.05);
		reportHelperUsageDuringTest();

		const result = await service.execute(input, options);

		const helperItems = [
			{
				type: 'llmTokens',
				model: helperUsage.model,
				uncachedInput: 100,
				cacheRead: 20,
				cacheWrite: 5,
				output: 30,
			},
		];
		for (const dedupeId of ['host-run:eval:0', 'host-run:eval:1']) {
			expect(credits.claimRunUsage).toHaveBeenCalledWith(
				user,
				input.threadId,
				dedupeId,
				helperItems,
				'completed',
				'self_healing',
			);
		}
		expect(result.usage).toMatchObject({ credits: expect.closeTo(0.15) });
	});

	it('adds the helper tokens to the token usage without the proxy', async () => {
		models.isProxyEnabled.mockReturnValue(false);
		credits.claimRunUsage.mockResolvedValue(undefined);
		reportHelperUsageDuringTest();

		const result = await service.execute(input, options);

		expect(result.usage).toEqual({
			promptTokens: 10 + 2 * 125,
			completionTokens: 5 + 2 * 30,
			totalTokens: 15 + 2 * 155,
			turns: null,
			durationSeconds: expect.any(Number),
		});
	});

	it('keeps null credits when the run claim fails', async () => {
		credits.claimRunUsage.mockResolvedValue(undefined);

		const result = await service.execute(input, options);

		expect(result.usage).toMatchObject({ credits: null });
	});

	it('reports a suspension as a run without output', async () => {
		stream = { ...stream, status: 'suspended' };

		const result = await service.execute(input, options);

		expect(result).toMatchObject({ status: 'suspended', output: null });
		expect(options.onFinish).toHaveBeenCalledWith(
			{ status: 'suspended', reason: 'unexpected_suspension' },
			'test/model',
			stream,
		);
		expect(options.tracing.finalizeRunTracing).toHaveBeenCalledWith(
			'host-run',
			undefined,
			expect.objectContaining({ status: 'error', reason: 'unexpected_suspension' }),
		);
	});

	it('returns null output when the structured output is invalid', async () => {
		stream = { ...stream, structuredOutput: { outcome: 'proposal' } };

		const result = await service.execute(input, options);

		expect(result).toMatchObject({ status: 'completed', output: null });
	});

	it('reports a setup failure as an errored run and completes it', async () => {
		memory.saveThreadWithProject.mockRejectedValueOnce(new Error('Storage unavailable'));

		const result = await service.execute(input, options);

		expect(result).toMatchObject({ status: 'errored', output: null, lastTested: null });
		expect(streamAgentRun).not.toHaveBeenCalled();
		expect(options.onComplete).toHaveBeenCalledExactlyOnceWith(result, controller.signal);
		expect(options.onFinish).toHaveBeenCalledWith(
			{ status: 'errored', reason: 'Storage unavailable' },
			undefined,
			undefined,
		);
		expect(options.sandbox.destroySandbox).not.toHaveBeenCalled();
	});

	it('drops the output of a cancelled run', async () => {
		vi.mocked(streamAgentRun).mockImplementationOnce(async () => {
			controller.abort();
			return stream;
		});

		const result = await service.execute(input, options);

		expect(result).toMatchObject({ status: 'cancelled', output: null });
		expect(result).not.toHaveProperty('finishReason');
		expect(options.onFinish).toHaveBeenCalledWith(
			{ status: 'cancelled', reason: 'shutdown' },
			'test/model',
			stream,
		);
	});

	it('waits for the completion callback and still cleans up when it fails', async () => {
		vi.mocked(options.onComplete).mockRejectedValue(new Error('Could not save'));

		await expect(service.execute(input, options)).rejects.toThrow('Could not save');

		expect(options.onFinish).toHaveBeenCalledTimes(1);
		expect(options.sandbox.destroySandbox).toHaveBeenCalledTimes(1);
	});
});

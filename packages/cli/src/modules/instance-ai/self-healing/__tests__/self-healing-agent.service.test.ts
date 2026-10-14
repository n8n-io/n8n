import type { Workspace, WorkspaceFilesystem } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { InstanceWriteAccessService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import {
	createInstanceAiTraceContext,
	createSelfHealingAgent,
	streamAgentRun,
	type InstanceAiContext,
	type InstanceAiTraceContext,
	type StreamRunResult,
} from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import type { AiUsageService } from '@/services/ai-usage.service';

import type { InProcessEventBus } from '../../event-bus/in-process-event-bus';
import type { InstanceAiAdapterService } from '../../instance-ai.adapter.service';
import type { InstanceAiCreditService } from '../../instance-ai-credit.service';
import type { InstanceAiModelService } from '../../instance-ai-model.service';
import type { InstanceAiSettingsService } from '../../instance-ai-settings.service';
import type { RuntimeSandboxEntry } from '../../sandbox/instance-ai-sandbox.service';
import type { TypeORMAgentMemory } from '../../storage/typeorm-agent-memory';
import type { WorkflowSuggestionService } from '../../workflow-suggestions/workflow-suggestion.service';
import {
	SelfHealingAgentService,
	type SelfHealingRunInput,
	type SelfHealingRunOptions,
} from '../self-healing-agent.service';
import type { SelfHealingExecutionReferenceService } from '../self-healing-execution-reference.service';
import type { SelfHealingCandidateService } from '../self-healing-candidate.service';

vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/instance-ai')>()),
	createSelfHealingAgent: vi.fn(),
	streamAgentRun: vi.fn(),
	createInstanceAiTraceContext: vi.fn(),
}));
vi.mock('@n8n/agents/sandbox', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents/sandbox')>()),
	getWorkspaceRoot: vi.fn().mockResolvedValue('/workspace'),
}));

const user = mock<User>({ id: 'actor', disabled: false });
const baseline: WorkflowSuggestionBaseline = {
	workflowId: 'workflow',
	projectId: 'project',
	backgroundUserId: user.id,
	expectedBaseline: {
		savedVersionId: 'v1',
		publishedVersionId: 'v1',
		checksum: 'checksum',
		versionCounter: 1,
		latestPublishHistoryEventId: null,
	},
	original: {
		name: 'Captured workflow',
		nodes: [
			{
				id: 'node-id',
				name: 'Original node',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [0, 0],
				parameters: { value: 'original value' },
			},
		],
		connections: {},
		settings: { timezone: 'Europe/Prague' },
	},
};
const input: SelfHealingRunInput = {
	user,
	baseline,
	executionId: '123',
};
const validOutput = {
	outcome: 'fix_ready',
	summary: 'Updated the node.',
	report: 'The check passed.',
	candidateFilePath: 'self-healing/candidate.workflow.ts',
};

describe('SelfHealingAgentService', () => {
	const config = mock<GlobalConfig>({
		instanceAi: { selfHealingEnabled: true, thinkingEnabled: false },
		ai: {},
	});
	const logger = mock<Logger>();
	const suggestions = mock<WorkflowSuggestionService>();
	const executions = mock<SelfHealingExecutionReferenceService>();
	const memory = mock<TypeORMAgentMemory>();
	const adapter = mock<InstanceAiAdapterService>();
	const models = mock<InstanceAiModelService>();
	const settings = mock<InstanceAiSettingsService>();
	const writeAccess = mock<InstanceWriteAccessService>();
	const aiUsage = mock<AiUsageService>();
	const credits = mock<InstanceAiCreditService>();
	const events = mock<InProcessEventBus>();
	const candidates = mock<SelfHealingCandidateService>();
	const filesystem = mock<WorkspaceFilesystem>();
	const workspace = mock<Workspace>({ filesystem });
	const service = new SelfHealingAgentService(
		config,
		logger,
		suggestions,
		executions,
		memory,
		adapter,
		models,
		settings,
		writeAccess,
		aiUsage,
		credits,
		events,
		candidates,
	);
	let controller: AbortController;
	let options: SelfHealingRunOptions;
	let files: Map<string, string | Buffer>;
	let stream: StreamRunResult;

	beforeEach(() => {
		vi.clearAllMocks();
		config.instanceAi.selfHealingEnabled = true;
		controller = new AbortController();
		files = new Map();
		filesystem.writeFile.mockImplementation(async (path, content) => {
			files.set(path, typeof content === 'string' ? content : Buffer.from(content));
		});
		filesystem.readFile.mockImplementation(async (path) => files.get(path) ?? '');
		vi.mocked(getWorkspaceRoot).mockResolvedValue('/workspace');
		options = {
			threadId: 'internal-thread',
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
			getAbortReason: () => 'shutdown',
			onFinish: vi.fn(),
		};
		suggestions.requireEditor.mockResolvedValue(user);
		suggestions.requireCurrentBaseline.mockResolvedValue(user);
		executions.getReference.mockResolvedValue({ status: 'available', id: '123' });
		models.resolveAgentModelConfig.mockResolvedValue('test/model');
		adapter.createContext.mockReturnValue(mock<InstanceAiContext>());
		aiUsage.isParameterValueSharingAllowed.mockResolvedValue(true);
		credits.claimRunUsage.mockResolvedValue(0.25);
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

	it('prepares the captured baseline, binds verification, and returns a readable candidate', async () => {
		vi.mocked(createSelfHealingAgent).mockImplementationOnce(async (factoryOptions) => {
			await factoryOptions.verifyCandidate({ filePath: validOutput.candidateFilePath });
			return mock<Awaited<ReturnType<typeof createSelfHealingAgent>>>();
		});
		const result = await service.execute(input, options);

		expect(result).toMatchObject({
			status: 'completed',
			finishReason: 'stop',
			output: validOutput,
		});
		expect(result.usage).toEqual({
			credits: 0.25,
			turns: null,
			durationSeconds: expect.any(Number),
		});
		expect(await result.candidate?.read()).toContain('node-id');
		expect(await result.candidate?.read()).toContain('original value');
		expect(candidates.verify).toHaveBeenCalledWith(
			expect.objectContaining({
				user,
				baseline,
				context: expect.objectContaining({ threadId: options.threadId, runId: options.runId }),
				abortSignal: controller.signal,
			}),
		);
		expect(memory.saveThreadWithProject).toHaveBeenCalledWith(
			expect.objectContaining({
				resourceId: 'ia-self-healing:actor',
				metadata: expect.objectContaining({ profileVersion: 'self-healing-v1' }),
			}),
			'project',
		);
		expect(memory.saveThreadWithProject.mock.invocationCallOrder[0]).toBeLessThan(
			events.publish.mock.invocationCallOrder[0],
		);
		expect(credits.claimRunUsage).toHaveBeenCalledExactlyOnceWith(
			user,
			options.threadId,
			'sdk-run',
			stream.usage?.usage,
			'completed',
		);
		expect(options.sandbox.destroySandbox).not.toHaveBeenCalled();
		expect(adapter.createContext).toHaveBeenCalledWith(
			user,
			expect.objectContaining({ builderDelegateEnabled: false }),
		);
		expect(createSelfHealingAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				context: expect.objectContaining({ threadId: options.threadId, runId: options.runId }),
			}),
		);
		expect(streamAgentRun).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringContaining(validOutput.candidateFilePath),
			expect.objectContaining({
				recoverUsageOnAbort: true,
				maxIterations: 100,
				persistence: expect.objectContaining({
					resourceId: 'ia-self-healing:actor',
					hostRunId: 'host-run',
				}),
			}),
			expect.objectContaining({ captureStreamErrors: true }),
		);
	});

	it('applies parameter redaction to the captured candidate', async () => {
		aiUsage.isParameterValueSharingAllowed.mockResolvedValue(false);
		const result = await service.execute(input, options);
		expect(await result.candidate?.read()).not.toContain('original value');
		expect(await result.candidate?.read()).toContain('node-id');
	});

	it.each([undefined, { outcome: 'fix_ready', summary: 'Missing report' }])(
		'reports invalid output and still claims measured work',
		async (output) => {
			stream.structuredOutput = output;
			const result = await service.execute(input, options);
			expect(result.output).toBeUndefined();
			expect(result.candidate).toBeUndefined();
			expect(result.validationError).toBeTruthy();
			expect(result.status).toBe('completed');
			expect(credits.claimRunUsage).toHaveBeenCalledTimes(1);
		},
	);

	it.each(['could_not_fix', 'needs_you'])(
		'omits the reader when %s has no candidate',
		async (outcome) => {
			const output = {
				outcome,
				summary: 'The investigation needs follow-up.',
				report: 'No candidate is ready.',
			};
			stream.structuredOutput = output;
			const result = await service.execute(input, options);

			expect(result.output).toEqual(output);
			expect(result.candidate).toBeUndefined();
		},
	);

	it('returns the explicit partial candidate from needs_you output', async () => {
		const filePath = 'self-healing/partial.workflow.ts';
		files.set(`/workspace/${filePath}`, 'partial source');
		stream.structuredOutput = {
			...validOutput,
			outcome: 'needs_you',
			candidateFilePath: filePath,
		};
		const result = await service.execute(input, options);

		expect(result.candidate?.filePath).toBe(filePath);
		expect(await result.candidate?.read()).toBe('partial source');
	});

	it('preserves valid output when accounting throws', async () => {
		const failure = new Error('Accounting unavailable');
		credits.claimRunUsage.mockRejectedValueOnce(failure);
		const result = await service.execute(input, options);
		expect(result.output).toEqual(validOutput);
		expect(result.usage.credits).toBeNull();
		expect(credits.claimRunUsage).toHaveBeenCalledTimes(1);
	});

	it('keeps credit usage unknown when the claim returns no delta', async () => {
		stream.usage = undefined;
		credits.claimRunUsage.mockResolvedValueOnce(undefined);
		const result = await service.execute(input, options);
		expect(result.usage).toMatchObject({
			credits: null,
			turns: null,
		});
	});

	it('preserves output and closes both traces when completion reporting fails', async () => {
		const tracing = mock<InstanceAiTraceContext>();
		tracing.withActiveSpan.mockImplementation(async (_span, fn) => await fn());
		vi.mocked(createInstanceAiTraceContext).mockResolvedValueOnce(tracing);
		vi.mocked(options.onFinish).mockImplementationOnce(() => {
			throw new Error('Metric unavailable');
		});
		const result = await service.execute(input, options);
		expect(result.output).toEqual(validOutput);
		expect(options.tracing.finalizeRunTracing).toHaveBeenCalledTimes(1);
		expect(options.tracing.finalizeMessageTraceRoot).toHaveBeenCalledTimes(1);
		expect(credits.claimRunUsage).toHaveBeenCalledTimes(1);
	});

	it('claims usage after cancellation', async () => {
		stream.status = 'cancelled';
		stream.finishReason = 'other';
		const result = await service.execute(input, options);
		expect(result).toMatchObject({
			status: 'cancelled',
			reason: 'shutdown',
			usage: { credits: 0.25 },
		});
		expect(result.candidate?.filePath).toBe(validOutput.candidateFilePath);
		expect(credits.claimRunUsage).toHaveBeenCalledExactlyOnceWith(
			user,
			options.threadId,
			'sdk-run',
			stream.usage?.usage,
			'cancelled',
		);
	});

	it('retains output and credits when the iteration cap is reached', async () => {
		stream.finishReason = 'max-iterations';
		const result = await service.execute(input, options);
		expect(result.finishReason).toBe('max-iterations');
		expect(result.output).toEqual(validOutput);
		expect(result.usage.credits).toBe(0.25);
	});

	it('reports unexpected suspension without creating a confirmation', async () => {
		stream.status = 'suspended';
		stream.structuredOutput = undefined;
		const result = await service.execute(input, options);
		expect(result).toMatchObject({ status: 'suspended', reason: 'unexpected_suspension' });
		expect(result.candidate).toBeUndefined();
		expect(options.onFinish).toHaveBeenCalledWith(
			expect.objectContaining({ reason: 'unexpected_suspension' }),
			'test/model',
			stream,
		);
	});

	it('stops after setup cancellation and releases a partial workspace', async () => {
		vi.mocked(options.sandbox.getOrCreateWorkspace).mockImplementationOnce(async () => {
			controller.abort();
			return mock<RuntimeSandboxEntry>({ workspace });
		});
		const result = await service.execute(input, options);
		expect(result).toMatchObject({ status: 'cancelled', reason: 'shutdown' });
		expect(createSelfHealingAgent).not.toHaveBeenCalled();
		expect(options.sandbox.destroySandbox).toHaveBeenCalledWith('internal-thread', 'actor');
	});

	it('returns setup errors without inventing an investigation outcome', async () => {
		models.resolveAgentModelConfig.mockRejectedValueOnce(new Error('Model unavailable'));
		const result = await service.execute(input, options);
		expect(result.status).toBe('errored');
		expect(result.output).toBeUndefined();
		expect(options.onFinish).toHaveBeenCalledTimes(1);
	});

	it('reads the captured graph after later workflow changes and rejects other targets', async () => {
		const context = mock<InstanceAiContext>({
			workflowService: {
				get: vi.fn().mockResolvedValue({ name: 'Later edit', versionId: 'v2', nodes: [] }),
			},
		});
		adapter.createContext.mockReturnValueOnce(context);
		await service.execute(input, options);
		expect(await context.workflowService.get('workflow')).toMatchObject({
			name: baseline.original.name,
			versionId: 'v1',
			nodes: baseline.original.nodes,
		});
		expect(await context.workflowService.getAsWorkflowJSON('workflow')).toMatchObject({
			name: baseline.original.name,
			nodes: [expect.objectContaining({ id: 'node-id', parameters: { value: 'original value' } })],
		});
		await expect(context.workflowService.get('another-workflow')).rejects.toThrow('assigned');
		await expect(context.workflowService.getAsWorkflowJSON('workflow', 'v2')).rejects.toThrow(
			'baseline',
		);
	});

	it('rejects a disabled gate at admission', () => {
		config.instanceAi.selfHealingEnabled = false;
		expect(() => service.assertEnabled()).toThrow('disabled');
		expect(models.resolveAgentModelConfig).not.toHaveBeenCalled();
	});

	it.each([
		['disabled actor', { ...input, user: mock<User>({ id: 'actor', disabled: true }) }],
		['mismatched actor', { ...input, user: mock<User>({ id: 'someone-else' }) }],
	])('rejects %s before model work', async (_label, invalid) => {
		await expect(service.execute(invalid, options)).rejects.toThrow();
		expect(models.resolveAgentModelConfig).not.toHaveBeenCalled();
	});

	it('rejects lost edit access, baseline changes, and unavailable execution input', async () => {
		suggestions.requireCurrentBaseline.mockRejectedValueOnce(new Error('No edit access'));
		await expect(service.execute(input, options)).rejects.toThrow('edit access');
		suggestions.requireCurrentBaseline.mockRejectedValueOnce(new Error('Stale baseline'));
		await expect(service.execute(input, options)).rejects.toThrow('Stale baseline');
		executions.getReference.mockResolvedValueOnce({ status: 'unavailable' });
		await expect(service.execute(input, options)).rejects.toThrow('execution');
		expect(models.resolveAgentModelConfig).not.toHaveBeenCalled();
	});
});

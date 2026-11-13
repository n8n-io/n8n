import type { Workspace } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { DEFAULT_INSTANCE_AI_PERMISSIONS, type WorkflowSuggestionBaseline } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { InstanceWriteAccessService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import type { User, WorkflowDependencyRepository } from '@n8n/db';
import { ConflictError, ForbiddenError } from '@n8n/errors';
import type { ErrorReporter } from 'n8n-core';
import {
	createInstanceAiTraceContext,
	createSelfHealingAgent,
	OutsideThreadProjectError,
	streamAgentRun,
	type InstanceAiContext,
	type InstanceAiTraceContext,
	type StreamRunResult,
} from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import type { AiUsageService } from '@/services/ai-usage.service';

import type { InProcessEventBus } from '../../event-bus/in-process-event-bus';
import type { InstanceAiAdapterService } from '../../instance-ai.adapter.service';
import type { InstanceAiCreditService } from '../../instance-ai-credit.service';
import { InstanceAiErrorReporterService } from '../../instance-ai-error-reporter.service';
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
import type { CandidateWorkflowResult } from '../candidate-workflow';
import type { SelfHealingConfigurationService } from '../self-healing-configuration.service';

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
const modelFetch = vi.fn();
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
const subWorkflow: WorkflowSuggestionBaseline = {
	...baseline,
	workflowId: 'sub-workflow',
	original: {
		name: 'Captured sub-workflow',
		nodes: [{ ...baseline.original.nodes[0], id: 'sub-node-id', name: 'Sub-workflow node' }],
		connections: {},
	},
};
const input: SelfHealingRunInput = {
	user,
	baseline,
	configurationId: 1,
	includeSubWorkflows: false,
	executionId: '123',
};
const triggeringFile = 'src/workflows/captured-workflow.workflow.ts';
const subWorkflowFile = 'src/workflows/captured-sub-workflow.workflow.ts';
const validOutput = {
	outcome: 'fix_ready',
	summary: 'Updated the node.',
	report: 'The check passed.',
	candidateWorkflowIds: [baseline.workflowId],
};

describe('SelfHealingAgentService', () => {
	const config = mock<GlobalConfig>({
		instanceAi: {
			workflowSuggestionsEnabled: true,
			thinkingEnabled: false,
			modelRequestLabels: true,
		},
		ai: {},
	});
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const errorReporter = mock<ErrorReporter>();
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
	const configurations = mock<SelfHealingConfigurationService>();
	const dependencies = mock<WorkflowDependencyRepository>();
	const workspace = mock<Workspace>();
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
		new InstanceAiErrorReporterService(logger, errorReporter),
		configurations,
		dependencies,
	);
	const subWorkflowInput = { ...input, includeSubWorkflows: true };
	const verifyFirst = (...workflowIds: string[]) =>
		vi
			.mocked(createSelfHealingAgent)
			.mockImplementationOnce(async ({ context, verifyCandidate }) => {
				for (const workflowId of workflowIds) {
					await context.workflowService.get(workflowId);
					await verifyCandidate({
						workflowId,
						filePath: workflowId === subWorkflow.workflowId ? subWorkflowFile : triggeringFile,
					});
				}
				return mock<Awaited<ReturnType<typeof createSelfHealingAgent>>>();
			});
	let controller: AbortController;
	let options: SelfHealingRunOptions;
	let stream: StreamRunResult;

	beforeEach(() => {
		vi.clearAllMocks();
		configurations.hasReviewerWhoCanEditAll.mockResolvedValue(true);
		configurations.canActOn.mockResolvedValue(true);
		dependencies.isCalledBy.mockImplementation(
			async (workflowId) => workflowId === subWorkflow.workflowId,
		);
		suggestions.captureBaseline.mockResolvedValue(subWorkflow);
		suggestions.getPendingResultId.mockResolvedValue(undefined);
		config.instanceAi.workflowSuggestionsEnabled = true;
		controller = new AbortController();
		candidates.verify.mockResolvedValue({
			filePath: triggeringFile,
			validation: { success: true, warnings: [] },
		} as never);
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
			onFinalizing: vi.fn(),
			onComplete: vi.fn(),
			getAbortReason: () => 'shutdown',
			onFinish: vi.fn(),
		};
		suggestions.requireEditor.mockResolvedValue(user);
		suggestions.requireCurrentBaseline.mockResolvedValue(user);
		executions.validateReference.mockResolvedValue(undefined);
		settings.getPermissions.mockReturnValue({ ...DEFAULT_INSTANCE_AI_PERMISSIONS });
		models.resolveAgentModelConfig.mockResolvedValue('test/model');
		models.getLabeledModelFetch.mockReturnValue(modelFetch);
		adapter.createContext.mockReturnValue(
			mock<InstanceAiContext>({ workflowService: mock<InstanceAiContext['workflowService']>() }),
		);
		aiUsage.isParameterValueSharingAllowed.mockResolvedValue(true);
		credits.claimRunUsage.mockResolvedValue(0.25);
		models.isProxyEnabled.mockReturnValue(true);
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

	it.each(['require_approval', 'blocked', 'always_allow'] as const)(
		'respects blocked research and handles %s without interactive approval',
		async (permission) => {
			const permissions = {
				...DEFAULT_INSTANCE_AI_PERMISSIONS,
				fetchUrl: permission,
				webSearch: permission,
			};
			settings.getPermissions.mockReturnValueOnce(permissions);

			await service.execute(input, options);

			expect(createSelfHealingAgent).toHaveBeenCalledWith(
				expect.objectContaining({
					context: expect.objectContaining({
						permissions: {
							...permissions,
							fetchUrl: permission === 'blocked' ? 'blocked' : 'always_allow',
							webSearch: permission === 'blocked' ? 'blocked' : 'always_allow',
						},
					}),
				}),
			);
			expect(permissions.fetchUrl).toBe(permission);
			expect(permissions.webSearch).toBe(permission);
		},
	);

	it('names the triggering workflow and binds verification', async () => {
		verifyFirst(baseline.workflowId);
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
		expect(candidates.verify).toHaveBeenCalledWith(
			expect.objectContaining({
				workflowId: baseline.workflowId,
				filePath: triggeringFile,
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
		expect(createInstanceAiTraceContext).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({
					self_healing: true,
					self_healing_workflow_id: baseline.workflowId,
					self_healing_execution_id: input.executionId,
					self_healing_project_id: baseline.projectId,
				}),
			}),
		);
		expect(credits.claimRunUsage).toHaveBeenCalledExactlyOnceWith(
			user,
			options.threadId,
			'sdk-run',
			stream.usage?.usage,
			'completed',
			'self_healing',
		);
		expect(options.sandbox.destroySandbox).toHaveBeenCalledExactlyOnceWith(
			options.threadId,
			'thread_cleanup',
			user.id,
		);
		expect(createSelfHealingAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				context: expect.objectContaining({ threadId: options.threadId, runId: options.runId }),
				modelFetch,
				requestLabels: true,
			}),
		);
		expect(streamAgentRun).toHaveBeenCalledWith(
			expect.anything(),
			'Investigate the failed execution using the execution tools.\n\n' +
				'Triggering workflow: "Captured workflow" (workflow)\nFailed execution: 123\n' +
				'You can change only the triggering workflow.',
			expect.objectContaining({
				recoverUsageOnAbort: true,
				maxIterations: 100,
				persistence: expect.objectContaining({
					resourceId: 'ia-self-healing:actor',
					hostRunId: 'host-run',
				}),
			}),
			expect.objectContaining({ signal: controller.signal }),
		);
	});

	it('applies parameter redaction to reads of the captured baseline', async () => {
		const context = mock<InstanceAiContext>();
		adapter.createContext.mockReturnValueOnce(context);
		aiUsage.isParameterValueSharingAllowed.mockResolvedValue(false);
		await service.execute(input, options);
		const workflow = await context.workflowService.getAsWorkflowJSON(baseline.workflowId);
		expect(JSON.stringify(workflow)).not.toContain('original value');
		expect(workflow.nodes).toEqual([expect.objectContaining({ id: 'node-id' })]);
	});

	it('waits for result storage with final usage and the original candidate context', async () => {
		const entered = createDeferredPromise();
		const persisted = createDeferredPromise();
		const currentUser = mock<User>({ id: user.id });
		const candidate: CandidateWorkflowResult = {
			success: true,
			workflow: baseline.original,
			warnings: [],
			credentialResolution: {
				mockedNodeNames: [],
				mockedCredentialTypes: [],
				mockedCredentialsByNode: {},
				heldForNewCredentialTypes: [],
				resolvedCredentialsByNode: {},
			},
		};
		candidates.compile.mockResolvedValue(candidate);
		verifyFirst(baseline.workflowId);
		options.onComplete = vi.fn(async (result) => {
			expect(result.usage).toMatchObject({ credits: 0.25 });
			suggestions.requireEditor.mockResolvedValueOnce(currentUser);
			expect(await result.candidates?.[0].compile()).toEqual(candidate);
			entered.resolve();
			await persisted.promise;
		});
		const pending = service.execute(input, options);
		await entered.promise;
		expect(options.onFinish).not.toHaveBeenCalled();
		expect(options.sandbox.destroySandbox).not.toHaveBeenCalled();
		expect(candidates.compile).toHaveBeenCalledWith(
			expect.objectContaining({
				baseline,
				filePath: triggeringFile,
				context: expect.objectContaining({ workspace: expect.anything() }),
			}),
			currentUser,
		);
		persisted.resolve();
		await pending;
		expect(options.onComplete).toHaveBeenCalledTimes(1);
		expect(options.onFinish).toHaveBeenCalledTimes(1);
		expect(options.sandbox.destroySandbox).toHaveBeenCalledTimes(1);
	});

	it('preserves the completed result when sandbox cleanup fails', async () => {
		vi.mocked(options.sandbox.destroySandbox).mockRejectedValueOnce(new Error('Cleanup failed'));

		await expect(service.execute(input, options)).resolves.toMatchObject({
			status: 'completed',
			output: validOutput,
		});
		expect(options.onComplete).toHaveBeenCalledTimes(1);
	});

	it('preserves runtime completion when result storage fails', async () => {
		options.onComplete = vi.fn().mockRejectedValue(new Error('Storage unavailable'));
		await expect(service.execute(input, options)).rejects.toThrow('Storage unavailable');
		expect(options.sandbox.destroySandbox).toHaveBeenCalledTimes(1);
		expect(options.onFinish).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'completed', finishReason: 'stop', output: validOutput }),
			'test/model',
			stream,
		);
	});

	it('enters finalization before claiming usage and accepting output', async () => {
		credits.claimRunUsage.mockImplementationOnce(async () => {
			expect(options.onFinalizing).toHaveBeenCalledTimes(1);
			expect(options.onComplete).not.toHaveBeenCalled();
			return 0.25;
		});

		const result = await service.execute(input, options);

		expect(result).toMatchObject({
			status: 'completed',
			output: validOutput,
			usage: { credits: 0.25 },
		});
		expect(credits.claimRunUsage).toHaveBeenCalledTimes(1);
		expect(options.onComplete).toHaveBeenCalledExactlyOnceWith(result, controller.signal);
	});

	it('reports cancellation before acceptance when accounting outlasts the run', async () => {
		credits.claimRunUsage.mockImplementationOnce(async () => {
			controller.abort('service_shutdown');
			return 0.25;
		});
		options.getAbortReason = () => 'service_shutdown';
		options.onComplete = vi.fn();

		const result = await service.execute(input, options);

		expect(result).toMatchObject({
			status: 'cancelled',
			reason: 'service_shutdown',
			usage: { credits: 0.25 },
		});
		expect(result.output).toBeUndefined();
		expect(result.candidates).toBeUndefined();
		expect(result.finishReason).toBeUndefined();
		expect(options.onComplete).toHaveBeenCalledExactlyOnceWith(result, controller.signal);
		expect(options.onFinish).toHaveBeenCalledWith(result, 'test/model', stream);
	});

	it('keeps a committed result completed when cancellation arrives during commit', async () => {
		options.onComplete = vi.fn(async () => {
			// The transaction has accepted the result and its commit succeeds.
			controller.abort('service_shutdown');
		});
		const result = await service.execute(input, options);
		expect(result).toMatchObject({ status: 'completed', output: validOutput });
		expect(options.onFinish).toHaveBeenCalledWith(result, 'test/model', stream);
	});

	it('keeps cancellation that occurs while accepting output in the run lifecycle', async () => {
		options.onComplete = vi.fn(async (_result, signal) => {
			controller.abort(new Error('Run cancelled'));
			signal.throwIfAborted();
		});
		await expect(service.execute(input, options)).rejects.toThrow('Run cancelled');
		expect(options.onFinish).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'cancelled', reason: 'shutdown' }),
			'test/model',
			stream,
		);
		const finished = vi.mocked(options.onFinish).mock.calls[0][0];
		expect(finished).not.toHaveProperty('output');
		expect(finished).not.toHaveProperty('candidates');
		expect(finished.finishReason).toBeUndefined();
	});

	it.each([undefined, { outcome: 'fix_ready', summary: 'Missing report' }])(
		'reports invalid output and still claims measured work',
		async (output) => {
			stream.structuredOutput = output;
			const result = await service.execute(input, options);
			expect(result.output).toBeUndefined();
			expect(result.candidates).toBeUndefined();
			expect(result.validationError).toBeTruthy();
			expect(result.status).toBe('completed');
			expect(credits.claimRunUsage).toHaveBeenCalledTimes(1);
		},
	);

	it.each(['could_not_fix', 'needs_you'])(
		'omits the candidate when %s has no candidate file',
		async (outcome) => {
			const output = {
				outcome,
				summary: 'The investigation needs follow-up.',
				report: 'No candidate is ready.',
				candidateWorkflowIds: [],
			};
			stream.structuredOutput = output;
			const result = await service.execute(input, options);

			expect(result.output).toEqual(output);
			expect(result.candidates).toBeUndefined();
		},
	);

	it('returns the explicit partial candidate from needs_you output', async () => {
		stream.structuredOutput = { ...validOutput, outcome: 'needs_you' };
		verifyFirst(baseline.workflowId);
		const result = await service.execute(input, options);

		expect(result.candidates).toHaveLength(1);
		await result.candidates?.[0].compile();
		expect(candidates.compile).toHaveBeenCalledWith(
			expect.objectContaining({ filePath: triggeringFile }),
			user,
		);
	});

	it('preserves valid output when accounting throws', async () => {
		const failure = new Error('Accounting unavailable');
		credits.claimRunUsage.mockRejectedValueOnce(failure);
		const result = await service.execute(input, options);
		expect(result.output).toEqual(validOutput);
		expect(result.usage).toMatchObject({ credits: null });
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

	it.each(['completed', 'cancelled', 'errored'] as const)(
		'returns token usage and delegates accounting for a %s direct-provider run',
		async (status) => {
			models.isProxyEnabled.mockReturnValue(false);
			credits.claimRunUsage.mockResolvedValueOnce(undefined);
			stream.status = status;
			stream.stepCount = 4;

			const result = await service.execute(input, options);

			expect(result.usage).toEqual({
				promptTokens: 10,
				completionTokens: 5,
				totalTokens: 15,
				turns: 4,
				durationSeconds: expect.any(Number),
			});
			expect(credits.claimRunUsage).toHaveBeenCalledExactlyOnceWith(
				user,
				options.threadId,
				'sdk-run',
				stream.usage?.usage,
				status,
				'self_healing',
			);
		},
	);

	it.each([null, 0])('preserves token measurements of %s', async (tokens) => {
		models.isProxyEnabled.mockReturnValue(false);
		stream.usage =
			tokens === null
				? undefined
				: {
						promptTokens: tokens,
						completionTokens: tokens,
						totalTokens: tokens,
						costUsd: 0,
					};

		const result = await service.execute(input, options);

		expect(result.usage).toMatchObject({
			promptTokens: tokens,
			completionTokens: tokens,
			totalTokens: tokens,
		});
	});

	it.each([true, false])(
		'retains the initial usage shape when setup fails (proxy=%s)',
		async (proxyEnabled) => {
			models.isProxyEnabled.mockReturnValue(proxyEnabled);
			suggestions.requireCurrentBaseline.mockImplementationOnce(async () => {
				models.isProxyEnabled.mockReturnValue(!proxyEnabled);
				throw new Error('Setup failed');
			});
			credits.claimRunUsage.mockResolvedValueOnce(undefined);

			const result = await service.execute(input, options);

			expect(result.status).toBe('errored');
			expect(result.usage).toEqual({
				...(proxyEnabled
					? { credits: null }
					: {
							promptTokens: null,
							completionTokens: null,
							totalTokens: null,
						}),
				turns: null,
				durationSeconds: expect.any(Number),
			});
		},
	);

	it('uses the observed runtime turn count', async () => {
		stream.stepCount = 4;
		const result = await service.execute(input, options);
		expect(result.usage.turns).toBe(4);
	});

	it('preserves completion and closes both traces when diagnostics fail', async () => {
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
		expect(result.output).toBeUndefined();
		expect(result.candidates).toBeUndefined();
		expect(result.finishReason).toBeUndefined();
		expect(result.validationError).toBeUndefined();
		expect(credits.claimRunUsage).toHaveBeenCalledExactlyOnceWith(
			user,
			options.threadId,
			'sdk-run',
			stream.usage?.usage,
			'cancelled',
			'self_healing',
		);
	});

	it('retains output and credits when the iteration cap is reached', async () => {
		stream.finishReason = 'max-iterations';
		const result = await service.execute(input, options);
		expect(result.finishReason).toBe('max-iterations');
		expect(result.output).toEqual(validOutput);
		expect(result.usage).toMatchObject({ credits: 0.25 });
	});

	it('reports unexpected suspension without creating a confirmation', async () => {
		stream.status = 'suspended';
		stream.structuredOutput = undefined;
		const result = await service.execute(input, options);
		expect(result).toMatchObject({ status: 'suspended', reason: 'unexpected_suspension' });
		expect(result.candidates).toBeUndefined();
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
		expect(errorReporter.error).not.toHaveBeenCalled();
		expect(logger.error).not.toHaveBeenCalled();
		expect(options.sandbox.destroySandbox).toHaveBeenCalledWith(
			'internal-thread',
			'thread_cleanup',
			'actor',
		);
	});

	it.each(['thrown', 'returned'] as const)(
		'reports a %s stream error once with self-healing context',
		async (kind) => {
			const failure = new Error(
				'Request failed: https://example.test/path?signature=private-value',
			);
			if (kind === 'thrown') vi.mocked(streamAgentRun).mockRejectedValueOnce(failure);
			else stream = { ...stream, status: 'errored', error: failure };

			const result = await service.execute(input, options);

			expect(result.status).toBe('errored');
			expect(errorReporter.error).toHaveBeenCalledExactlyOnceWith(
				failure,
				expect.objectContaining({
					tags: expect.objectContaining({
						component: 'instance-ai-self-healing',
						role: 'self-healing',
						threadId: options.threadId,
						runId: options.runId,
					}),
				}),
			);
			expect(logger.error).toHaveBeenCalledTimes(1);
			if (kind === 'thrown') {
				expect(result.reason).toBe('Request failed: https://example.test/path');
			}
		},
	);

	it('finalizes a stream read failure and releases its incomplete workspace', async () => {
		const failure = new Error('Connection closed');
		vi.mocked(streamAgentRun).mockRejectedValueOnce(failure);
		credits.claimRunUsage.mockResolvedValueOnce(undefined);

		const result = await service.execute(input, options);

		expect(result).toMatchObject({
			status: 'errored',
			error: failure,
			usage: { credits: null, turns: null },
		});
		expect(result.output).toBeUndefined();
		expect(result.candidates).toBeUndefined();
		expect(credits.claimRunUsage).toHaveBeenCalledExactlyOnceWith(
			user,
			options.threadId,
			options.runId,
			[],
			'errored',
			'self_healing',
		);
		expect(options.onComplete).toHaveBeenCalledExactlyOnceWith(result, controller.signal);
		expect(options.onFinish).toHaveBeenCalledWith(result, 'test/model', undefined);
		expect(options.tracing.finalizeRunTracing).toHaveBeenCalledWith(
			options.runId,
			undefined,
			expect.objectContaining({ status: 'error' }),
		);
		expect(options.sandbox.destroySandbox).toHaveBeenCalledExactlyOnceWith(
			options.threadId,
			'thread_cleanup',
			user.id,
		);
	});

	it('returns setup errors without inventing an investigation outcome', async () => {
		models.resolveAgentModelConfig.mockRejectedValueOnce(new Error('Model unavailable'));
		const result = await service.execute(input, options);
		expect(result.status).toBe('errored');
		expect(result.output).toBeUndefined();
		expect(options.onFinish).toHaveBeenCalledTimes(1);
	});

	it('reports transport errors during agent setup as setup failures', async () => {
		vi.mocked(createSelfHealingAgent).mockRejectedValueOnce(
			Object.assign(new TypeError('terminated'), {
				cause: Object.assign(new Error('closed'), { code: 'ECONNRESET' }),
			}),
		);
		await service.execute(input, options);
		expect(errorReporter.error).toHaveBeenCalledTimes(1);
		expect(streamAgentRun).not.toHaveBeenCalled();
	});

	it('reads the captured target graph and delegates other workflow reads to the adapter', async () => {
		const otherWorkflow = { name: 'Sub-workflow', nodes: [] };
		const context = mock<InstanceAiContext>({
			workflowService: {
				get: vi.fn().mockResolvedValue({ name: 'Later edit', versionId: 'v2', nodes: [] }),
				getAsWorkflowJSON: vi.fn().mockResolvedValue(otherWorkflow),
				getVersion: vi.fn().mockResolvedValue({ versionId: 'v1', nodes: [] }),
			},
		});
		const originalService = context.workflowService;
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
		expect(await context.workflowService.get('another-workflow')).toMatchObject({
			name: 'Later edit',
			nodes: [],
		});
		expect(await context.workflowService.getAsWorkflowJSON('another-workflow', 'v2')).toBe(
			otherWorkflow,
		);
		expect(originalService.getAsWorkflowJSON).toHaveBeenCalledWith('another-workflow', 'v2');
		expect(await context.workflowService.getVersion?.('another-workflow', 'v2')).toEqual({
			versionId: 'v1',
			nodes: [],
		});
		expect(originalService.getVersion).toHaveBeenCalledWith('another-workflow', 'v2');
		expect(suggestions.requireEditor).not.toHaveBeenCalledWith(user.id, 'another-workflow');
		await expect(context.workflowService.getAsWorkflowJSON('workflow', 'v2')).rejects.toThrow(
			'baseline',
		);
		expect(await context.workflowService.getVersion?.('workflow', 'v1')).toMatchObject({
			nodes: baseline.original.nodes,
			connections: baseline.original.connections,
		});
		await expect(context.workflowService.getVersion?.('workflow', 'v2')).rejects.toThrow(
			'baseline',
		);
	});

	it.each(['get', 'getAsWorkflowJSON', 'getVersion'] as const)(
		'preserves adapter access rejection for other workflow reads through %s',
		async (method) => {
			const context = mock<InstanceAiContext>();
			const error = new ForbiddenError('Read access required');
			context.workflowService[method] = vi.fn().mockRejectedValue(error);
			adapter.createContext.mockReturnValueOnce(context);
			await service.execute(input, options);
			await expect(context.workflowService[method]?.('another-workflow', 'v2')).rejects.toBe(error);
		},
	);

	describe('sub-workflow admission', () => {
		const subBaseline = (workflowId: string, projectId = baseline.projectId) => ({
			...subWorkflow,
			workflowId,
			projectId,
			original: { ...subWorkflow.original, name: workflowId },
		});
		const live = { name: 'Live workflow', versionId: 'v2', nodes: [] };
		const run = async (runInput: SelfHealingRunInput) => {
			const context = mock<InstanceAiContext>({
				workflowService: {
					get: vi.fn().mockResolvedValue(live),
					getAsWorkflowJSON: vi.fn().mockResolvedValue(live),
					getVersion: vi.fn().mockResolvedValue(live),
				},
			});
			const original = context.workflowService;
			adapter.createContext.mockReturnValueOnce(context);
			await service.execute(runInput, options);
			const assertWritable = async (id: string) =>
				await context.assertInThreadProject?.({ kind: 'workflow', id });
			return { workflows: context.workflowService, original, assertWritable };
		};
		const refusal = (reason: string) =>
			expect.objectContaining({
				message: expect.stringContaining(reason),
				cause: expect.any(OutsideThreadProjectError),
			});

		it('admits a called sub-workflow on its first current read and serves its baseline', async () => {
			const { workflows, assertWritable } = await run(subWorkflowInput);

			const [detail, json] = await Promise.all([
				workflows.get(subWorkflow.workflowId),
				workflows.getAsWorkflowJSON(subWorkflow.workflowId),
			]);

			expect(detail).toMatchObject({ name: 'Captured sub-workflow', versionId: 'v1' });
			expect(json).toMatchObject({
				id: subWorkflow.workflowId,
				nodes: [expect.objectContaining({ id: 'sub-node-id' })],
			});
			expect(await workflows.get(subWorkflow.workflowId)).toEqual(detail);
			expect(dependencies.isCalledBy).toHaveBeenCalledExactlyOnceWith(subWorkflow.workflowId, [
				'v1',
			]);
			expect(suggestions.getPendingResultId).toHaveBeenCalledWith(subWorkflow.workflowId);
			expect(configurations.canActOn).toHaveBeenCalledWith(user, subWorkflow.workflowId);
			expect(configurations.hasReviewerWhoCanEditAll).toHaveBeenCalledExactlyOnceWith(
				{ id: input.configurationId, projectId: baseline.projectId },
				[baseline.workflowId, subWorkflow.workflowId],
			);
			expect(suggestions.captureBaseline).toHaveBeenCalledExactlyOnceWith(
				subWorkflow.workflowId,
				user.id,
			);
			await expect(assertWritable(baseline.workflowId)).resolves.toBeUndefined();
			await expect(assertWritable(subWorkflow.workflowId)).resolves.toBeUndefined();
		});

		it('does not admit sub-workflows when the setting is off', async () => {
			const { workflows, assertWritable } = await run(input);

			expect(await workflows.get(subWorkflow.workflowId)).toBe(live);
			await expect(assertWritable(subWorkflow.workflowId)).rejects.toEqual(
				refusal('only the triggering workflow'),
			);
			expect(dependencies.isCalledBy).not.toHaveBeenCalled();
			expect(suggestions.captureBaseline).not.toHaveBeenCalled();
		});

		it('does not admit a workflow from a historical version read', async () => {
			const { workflows, original } = await run(subWorkflowInput);

			expect(await workflows.getAsWorkflowJSON(subWorkflow.workflowId, 'v1')).toBe(live);
			expect(await workflows.getVersion?.(subWorkflow.workflowId, 'v1')).toBe(live);
			expect(original.getAsWorkflowJSON).toHaveBeenCalledWith(subWorkflow.workflowId, 'v1');
			expect(suggestions.captureBaseline).not.toHaveBeenCalled();
		});

		it.each([
			[
				'is not called by a target',
				() => dependencies.isCalledBy.mockResolvedValue(false),
				'No published version',
			],
			[
				'has a pending suggestion',
				() => suggestions.getPendingResultId.mockResolvedValue('pending-result'),
				'pending suggestion',
			],
			[
				'lacks actor access',
				() => configurations.canActOn.mockResolvedValue(false),
				'read its executions',
			],
			[
				'has no reviewer for the group',
				() => configurations.hasReviewerWhoCanEditAll.mockResolvedValue(false),
				'No reviewer',
			],
			[
				'has unpublished changes',
				() => suggestions.captureBaseline.mockRejectedValue(new ConflictError('Unpublished')),
				'Unpublished',
			],
			[
				'is not editable',
				() => suggestions.captureBaseline.mockRejectedValue(new ForbiddenError('No access')),
				'No access',
			],
			[
				'is in another project',
				() => suggestions.captureBaseline.mockResolvedValue(subBaseline('sub-workflow', 'other')),
				'different project',
			],
		])('keeps a workflow that %s read-only', async (_label, arrange, reason) => {
			arrange();
			const { workflows, assertWritable } = await run(subWorkflowInput);

			expect(await workflows.get(subWorkflow.workflowId)).toBe(live);
			await expect(assertWritable(subWorkflow.workflowId)).rejects.toEqual(refusal(reason));
		});

		it('admits a nested sub-workflow that was read before its caller', async () => {
			dependencies.isCalledBy.mockImplementation(
				async (workflowId, versionIds) => workflowId === 'child' || versionIds.length > 1,
			);
			suggestions.captureBaseline.mockImplementation(async (workflowId) => subBaseline(workflowId));
			const { workflows } = await run(subWorkflowInput);

			expect(await workflows.get('grandchild')).toBe(live);
			expect(await workflows.get('child')).toMatchObject({ name: 'child' });
			expect(await workflows.get('grandchild')).toMatchObject({ name: 'grandchild' });
		});

		it('limits the number of admitted sub-workflows under concurrent reads', async () => {
			const ids = Array.from({ length: 11 }, (_, index) => `${index}`);
			dependencies.isCalledBy.mockResolvedValue(true);
			suggestions.captureBaseline.mockImplementation(async (workflowId) => subBaseline(workflowId));
			const { workflows } = await run(subWorkflowInput);

			const reads = await Promise.all(ids.map(async (id) => await workflows.get(id)));

			expect(reads.filter(({ name }) => name === live.name)).toHaveLength(1);
			expect(suggestions.captureBaseline).toHaveBeenCalledTimes(10);
		});

		it('stops admission after cancellation', async () => {
			const { workflows } = await run(subWorkflowInput);
			controller.abort();

			await expect(workflows.get(subWorkflow.workflowId)).rejects.toThrow();
			expect(suggestions.captureBaseline).not.toHaveBeenCalled();
		});
	});

	it('verifies a candidate against the baseline of its workflow and rejects other workflows', async () => {
		let unknown: unknown;
		vi.mocked(createSelfHealingAgent).mockImplementationOnce(async ({ verifyCandidate }) => {
			unknown = await verifyCandidate({ workflowId: 'other-workflow', filePath: subWorkflowFile });
			await verifyCandidate({ workflowId: subWorkflow.workflowId, filePath: subWorkflowFile });
			return mock<Awaited<ReturnType<typeof createSelfHealingAgent>>>();
		});

		await service.execute(subWorkflowInput, options);

		expect(candidates.verify).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ filePath: subWorkflowFile, baseline: subWorkflow }),
		);
		expect(unknown).toMatchObject({
			filePath: subWorkflowFile,
			validation: {
				success: false,
				errors: [expect.stringContaining('cannot change this workflow. No published version')],
			},
			verification: { status: 'not_run' },
		});
	});

	it('returns a candidate for each verified workflow', async () => {
		stream.structuredOutput = {
			...validOutput,
			candidateWorkflowIds: [subWorkflow.workflowId, baseline.workflowId, subWorkflow.workflowId],
		};
		verifyFirst(baseline.workflowId, subWorkflow.workflowId);

		const result = await service.execute(subWorkflowInput, options);

		expect(result.candidates?.map(({ baseline }) => baseline)).toEqual([subWorkflow, baseline]);
		await result.candidates?.[0].compile();
		expect(candidates.compile).toHaveBeenCalledWith(
			expect.objectContaining({ filePath: subWorkflowFile, baseline: subWorkflow }),
			user,
		);
	});

	it.each([
		[['other-workflow']],
		[[baseline.workflowId, 'other-workflow']],
		[[subWorkflow.workflowId]],
	])('returns no candidates when the output names %j', async (candidateWorkflowIds) => {
		stream.structuredOutput = { ...validOutput, candidateWorkflowIds };
		verifyFirst(baseline.workflowId);

		const result = await service.execute(subWorkflowInput, options);

		expect(result.output).toMatchObject({ candidateWorkflowIds });
		expect(result.candidates).toBeUndefined();
	});

	it('does not return a candidate whose verification failed', async () => {
		candidates.verify.mockResolvedValue({
			filePath: triggeringFile,
			validation: { success: false, reason: 'candidate_invalid', errors: ['Invalid'] },
			verification: { status: 'not_run' },
		} as never);
		verifyFirst(baseline.workflowId);

		const result = await service.execute(input, options);

		expect(result.candidates).toBeUndefined();
	});

	it('rejects a disabled gate at admission', () => {
		config.instanceAi.workflowSuggestionsEnabled = false;
		expect(() => service.assertEnabled()).toThrow('disabled');
		expect(models.resolveAgentModelConfig).not.toHaveBeenCalled();
	});

	it.each([
		['disabled actor', { ...input, user: mock<User>({ id: 'actor', disabled: true }) }],
		['mismatched actor', { ...input, user: mock<User>({ id: 'someone-else' }) }],
	])('rejects %s before model work', async (_label, invalid) => {
		await expect(service.execute(invalid, options)).resolves.toMatchObject({ status: 'errored' });
		expect(options.onFinish).toHaveBeenCalledOnce();
		expect(models.resolveAgentModelConfig).not.toHaveBeenCalled();
	});

	it('rejects lost edit access, baseline changes, and invalid execution input', async () => {
		suggestions.requireCurrentBaseline.mockRejectedValueOnce(new Error('No edit access'));
		await expect(service.execute(input, options)).resolves.toMatchObject({
			status: 'errored',
			reason: 'No edit access',
		});
		suggestions.requireCurrentBaseline.mockRejectedValueOnce(new Error('Stale baseline'));
		await expect(service.execute(input, options)).resolves.toMatchObject({
			status: 'errored',
			reason: 'Stale baseline',
		});
		executions.validateReference.mockRejectedValueOnce(new Error('Invalid execution input'));
		await expect(service.execute(input, options)).resolves.toMatchObject({
			status: 'errored',
			reason: 'Invalid execution input',
		});
		expect(models.resolveAgentModelConfig).not.toHaveBeenCalled();
	});
	it('finishes early validation failures after creating their private thread', async () => {
		suggestions.requireCurrentBaseline.mockRejectedValueOnce(new Error('Baseline changed.'));
		const result = await service.execute(input, options);

		expect(result).toMatchObject({ status: 'errored', reason: 'Baseline changed.' });
		expect(memory.saveThreadWithProject.mock.invocationCallOrder[0]).toBeLessThan(
			suggestions.requireCurrentBaseline.mock.invocationCallOrder[0],
		);
		expect(events.publish).toHaveBeenCalledWith(
			options.threadId,
			expect.objectContaining({ type: 'run-start' }),
		);
		expect(options.onFinish).toHaveBeenCalledExactlyOnceWith(result, undefined, undefined);
		expect(streamAgentRun).not.toHaveBeenCalled();
	});

	it('finalizes thread creation failures without starting the model', async () => {
		memory.saveThreadWithProject.mockRejectedValueOnce(new Error('Thread storage unavailable.'));
		const result = await service.execute(input, options);
		expect(result).toMatchObject({ status: 'errored', reason: 'Thread storage unavailable.' });
		expect(options.onFinish).toHaveBeenCalledOnce();
		expect(streamAgentRun).not.toHaveBeenCalled();
	});

	it('uses the existing execution adapter for investigation reads', async () => {
		const executionService = mock<InstanceAiContext['executionService']>();
		const context = mock<InstanceAiContext>({ executionService });
		adapter.createContext.mockReturnValueOnce(context);
		await service.execute(input, options);
		const { context: agentContext } = vi.mocked(createSelfHealingAgent).mock.calls[0][0];

		await agentContext.executionService.list({ workflowId: 'related-workflow' });
		await agentContext.executionService.getResult('related-execution');
		expect(executionService.list).toHaveBeenCalledExactlyOnceWith({
			workflowId: 'related-workflow',
		});
		expect(executionService.getResult).toHaveBeenCalledExactlyOnceWith('related-execution');
		// Only the original failed execution needs to match the investigation baseline.
		expect(executions.validateReference).toHaveBeenCalledExactlyOnceWith(
			user,
			baseline.workflowId,
			input.executionId,
		);
	});
});

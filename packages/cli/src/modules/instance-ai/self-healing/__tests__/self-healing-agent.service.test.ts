import type { Workspace, WorkspaceFilesystem } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { DEFAULT_INSTANCE_AI_PERMISSIONS, type WorkflowSuggestionBaseline } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { InstanceWriteAccessService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import type { ErrorReporter } from 'n8n-core';
import {
	createInstanceAiTraceContext,
	createSelfHealingAgent,
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
		instanceAi: { workflowSuggestionsEnabled: true, thinkingEnabled: false },
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
		new InstanceAiErrorReporterService(logger, errorReporter),
	);
	let controller: AbortController;
	let options: SelfHealingRunOptions;
	let files: Map<string, string | Buffer>;
	let stream: StreamRunResult;

	beforeEach(() => {
		vi.clearAllMocks();
		config.instanceAi.workflowSuggestionsEnabled = true;
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
		models.getModelFetch.mockReturnValue(modelFetch);
		adapter.createContext.mockReturnValue(mock<InstanceAiContext>());
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

	it('prepares the captured baseline and binds verification', async () => {
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
		expect(files.get(`/workspace/${validOutput.candidateFilePath}`)).toContain('node-id');
		expect(files.get(`/workspace/${validOutput.candidateFilePath}`)).toContain('original value');
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
			expect.objectContaining({ signal: controller.signal }),
		);
	});

	it('applies parameter redaction to the captured candidate', async () => {
		aiUsage.isParameterValueSharingAllowed.mockResolvedValue(false);
		await service.execute(input, options);
		expect(files.get(`/workspace/${validOutput.candidateFilePath}`)).not.toContain(
			'original value',
		);
		expect(files.get(`/workspace/${validOutput.candidateFilePath}`)).toContain('node-id');
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
		options.onComplete = vi.fn(async (result) => {
			expect(result.usage).toMatchObject({ credits: 0.25 });
			suggestions.requireEditor.mockResolvedValueOnce(currentUser);
			expect(await result.candidate?.compile()).toEqual(candidate);
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
				filePath: validOutput.candidateFilePath,
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
		expect(result.candidate).toBeUndefined();
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
		expect(finished).not.toHaveProperty('candidate');
		expect(finished.finishReason).toBeUndefined();
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
		'omits the candidate when %s has no candidate file',
		async (outcome) => {
			const output = {
				outcome,
				summary: 'The investigation needs follow-up.',
				report: 'No candidate is ready.',
				candidateFilePath: null,
			};
			stream.structuredOutput = output;
			const result = await service.execute(input, options);

			expect(result.output).toEqual(output);
			expect(result.candidate).toBeUndefined();
		},
	);

	it('returns the explicit partial candidate from needs_you output', async () => {
		const filePath = 'self-healing/partial.workflow.ts';
		stream.structuredOutput = {
			...validOutput,
			outcome: 'needs_you',
			candidateFilePath: filePath,
		};
		const result = await service.execute(input, options);

		expect(result.candidate?.filePath).toBe(filePath);
		await result.candidate?.compile();
		expect(candidates.compile).toHaveBeenCalledWith(expect.objectContaining({ filePath }), user);
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
		expect(result.candidate).toBeUndefined();
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
		expect(result.candidate).toBeUndefined();
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

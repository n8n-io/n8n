import { ModelStreamStallError } from '@n8n/agents';
import { ASSISTANT_TRACE_EVENT, ASSISTANT_WORKFLOWS_ARCHIVED_EVENT } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import { UserError } from '@n8n/errors';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type {
	SystemAgentResumeTurn,
	SystemAgentStartTurn,
} from '@/modules/agents/system-agents/system-agent.types';

import type { InstanceAiCreditService } from '../../instance-ai-credit.service';
import { InstanceAiErrorReporterService } from '../../instance-ai-error-reporter.service';
import type { InstanceAiSettingsService } from '../../instance-ai-settings.service';
import type { InstanceAiAdapterService } from '../../instance-ai.adapter.service';
import type { AssistantAgentFactory } from '../../turn-setup/assistant-agent.factory';
import type {
	AssistantTurnEnvironment,
	AssistantTurnEnvironmentFactory,
} from '../../turn-setup/assistant-turn-environment.factory';
import type {
	AssistantTurnInput,
	AssistantTurnInputBuilder,
} from '../../turn-setup/assistant-turn-input.builder';
import type { AssistantTurnRuntime } from '../../turn-setup/assistant-turn-runtime';
import { QuotaExhaustedStreamError } from '../../turn-setup/assistant-credits';
import { AssistantTurnOverrides } from '../../turn-setup/assistant-turn-overrides';
import { QUOTA_EXHAUSTED_USER_MESSAGE } from '../../user-facing-errors';
import { AssistantAgentProvider, FILES_ONLY_MESSAGE } from '../assistant-agent.provider';
import type { AssistantThreadTabsService } from '../assistant-thread-tabs.service';
import type { AssistantTurnTrace, AssistantTurnTracer } from '../assistant-turn-trace';
import type {
	AssistantSandboxLease,
	AssistantSandboxWorkspaceSource,
} from '../assistant-workspace-source';

vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	hasGlobalScope: vi.fn(),
}));

const user = { id: 'user-1' } as User;
const thread = { id: 'thread-1', projectId: 'project-1' } as SystemAgentStartTurn['thread'];

function setup() {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const workspace = mock<AssistantSandboxWorkspaceSource>();
	const settingsService = mock<InstanceAiSettingsService>();
	settingsService.isAgentEnabled.mockReturnValue(true);
	settingsService.getSandboxStatus.mockReturnValue({
		provider: 'n8n-sandbox',
	} as ReturnType<InstanceAiSettingsService['getSandboxStatus']>);
	const adapterService = mock<InstanceAiAdapterService>();
	adapterService.resolveExperimentGates.mockResolvedValue({
		nodeContextEnabled: false,
	} as Awaited<ReturnType<InstanceAiAdapterService['resolveExperimentGates']>>);
	const creditService = mock<InstanceAiCreditService>();
	const archiveIfAiTemporary = vi.fn(async () => true);
	const environment = {
		context: { workflowService: { archiveIfAiTemporary } },
		orchestrationContext: {},
		modelId: 'anthropic/claude-sonnet',
		skillScope: { profile: { mode: 'default' } },
	} as unknown as AssistantTurnEnvironment;
	const turnEnvironment = mock<AssistantTurnEnvironmentFactory>();
	turnEnvironment.create.mockResolvedValue(environment);
	turnEnvironment.createProxyRunConfig.mockResolvedValue({});
	const turnInput = mock<AssistantTurnInputBuilder>();
	const input = {
		fullMessage: 'Build a digest',
		nonStructuredAttachments: [],
		turnHadFileAttachments: false,
	} as unknown as AssistantTurnInput;
	turnInput.buildInput.mockResolvedValue(input);
	turnInput.onInputAccepted.mockResolvedValue(undefined);
	const agent = { name: 'assistant' };
	const agentFactory = mock<AssistantAgentFactory>();
	agentFactory.createAgent.mockResolvedValue(
		agent as unknown as Awaited<ReturnType<AssistantAgentFactory['createAgent']>>,
	);
	const tracer = mock<AssistantTurnTracer>();
	tracer.startForTurn.mockResolvedValue(undefined);
	const threadTabs = mock<AssistantThreadTabsService>();
	// The real reporter, so that the tests see its filters. Sentry is the mock.
	const sentry = mock<ErrorReporter>();
	const errorReporter = new InstanceAiErrorReporterService(logger, sentry);
	// The real default, so that the tests see "no override" unless a test sets one.
	const turnOverrides = new AssistantTurnOverrides();
	const provider = new AssistantAgentProvider(
		logger,
		mock<GlobalConfig>({ ai: {} }),
		workspace,
		settingsService,
		adapterService,
		creditService,
		turnEnvironment,
		turnInput,
		agentFactory,
		tracer,
		threadTabs,
		errorReporter,
		turnOverrides,
	);
	return {
		provider,
		turnOverrides,
		sentry,
		errorReporter,
		adapterService,
		logger,
		tracer,
		threadTabs,
		workspace,
		settingsService,
		creditService,
		turnEnvironment,
		turnInput,
		agentFactory,
		environment,
		input,
		agent,
		archiveIfAiTemporary,
	};
}

function startTurn(
	overrides: Partial<SystemAgentStartTurn<AssistantSandboxLease>> = {},
): SystemAgentStartTurn<AssistantSandboxLease> {
	return {
		type: 'start',
		user,
		thread,
		resourceId: 'system-chat:user-1',
		abortSignal: new AbortController().signal,
		emitHostEvent: vi.fn(),
		memory: mock<SystemAgentStartTurn['memory']>(),
		checkpointStore: mock<SystemAgentStartTurn['checkpointStore']>(),
		sessionGrants: mock<SystemAgentStartTurn['sessionGrants']>(),
		readAttachment: vi.fn(async () => undefined),
		readFile: vi.fn(async () => undefined),
		executionId: 'exec-1',
		message: 'Build a digest',
		attachments: [],
		options: {
			runId: 'run-1',
			messageGroupId: 'mg-1',
			request: {
				pushRef: 'push-1',
				timeZone: 'Europe/Helsinki',
				attachments: [
					{ type: 'workflow', id: 'wf-1', name: 'Digest' },
					{
						type: 'nodes',
						workflowId: 'wf-1',
						sets: [{ nodes: [{ id: 'node-1', name: 'Slack' }] }],
					},
				],
			},
		},
		...overrides,
	};
}

describe('AssistantAgentProvider', () => {
	describe('authorize', () => {
		it('requires the Assistant message scope and an enabled Assistant', async () => {
			const { provider, settingsService } = setup();
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await expect(provider.authorize(user)).resolves.toBe(true);
			expect(hasGlobalScope).toHaveBeenCalledWith(user, 'instanceAi:message');

			settingsService.isAgentEnabled.mockReturnValue(false);
			await expect(provider.authorize(user)).resolves.toBe(false);
		});

		it('refuses a user without the Assistant message scope', async () => {
			const { provider } = setup();
			vi.mocked(hasGlobalScope).mockReturnValue(false);

			await expect(provider.authorize(user)).resolves.toBe(false);
		});
	});

	it('stores the client context with new run ids as turn options', async () => {
		const { provider } = setup();

		const options = await provider.chatTurnOptions(user, thread, {
			timeZone: 'UTC',
			// The turn overrides supply these settings, so the client cannot set them.
			mode: 'progressive',
			promptVersion: 'default@1',
			observerThresholdTokens: 5_000,
		});

		expect(options).toEqual({
			runId: expect.stringMatching(/^run_/),
			messageGroupId: expect.stringMatching(/^mg_/),
			request: { timeZone: 'UTC' },
		});
	});

	it('turns a card confirmation into the resume data of the tool', () => {
		const { provider } = setup();

		expect(provider.normalizeResumeData({ kind: 'approval', approved: true })).toEqual({
			approved: true,
		});
		expect(provider.normalizeResumeData({ other: 'shape' })).toEqual({ other: 'shape' });
	});

	describe('prepareTurn', () => {
		it('stores the tab of an artifact that the turn changes', async () => {
			const { provider, turnEnvironment, threadTabs } = setup();
			const turn = startTurn();
			await provider.prepareTurn(turn);

			const runtime: AssistantTurnRuntime = turnEnvironment.create.mock.calls[0][1];
			await runtime.onArtifactChanged?.({ type: 'workflow', id: 'wf-1', name: 'Digest' });

			expect(threadTabs.showArtifactTab).toHaveBeenCalledWith(turn.memory, 'thread-1', {
				type: 'workflow',
				id: 'wf-1',
				name: 'Digest',
			});
		});

		it('logs and continues when the artifact tab cannot be stored', async () => {
			const { provider, turnEnvironment, threadTabs, logger } = setup();
			threadTabs.showArtifactTab.mockRejectedValue(new Error('db down'));
			await provider.prepareTurn(startTurn());

			const runtime: AssistantTurnRuntime = turnEnvironment.create.mock.calls[0][1];
			await expect(
				runtime.onArtifactChanged?.({ type: 'workflow', id: 'wf-1' }),
			).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith('Failed to show an Assistant artifact tab', {
				threadId: 'thread-1',
				error: 'db down',
			});
		});

		it('builds a start turn with the runtime state of the Agents turn', async () => {
			const { provider, turnEnvironment, turnInput, agentFactory, agent } = setup();
			const turn = startTurn();

			const handle = await provider.prepareTurn(turn);

			expect(turnEnvironment.create).toHaveBeenCalledWith(
				expect.objectContaining({
					user,
					threadId: 'thread-1',
					runId: 'run-1',
					messageGroupId: 'mg-1',
					pushRef: 'push-1',
				}),
				expect.anything(),
			);
			const runtime = turnEnvironment.create.mock.calls[0][1];
			expect(runtime.memory).toBe(turn.memory);
			expect(runtime.checkpointStore).toBe(turn.checkpointStore);
			expect(runtime.resourceId).toBe('system-chat:user-1');
			await expect(runtime.getProjectId()).resolves.toBe('project-1');
			expect(runtime.sessionGrants).toBe(turn.sessionGrants);
			expect(runtime.cancelBackgroundTask).toBeUndefined();

			expect(turnInput.buildInput).toHaveBeenCalledWith(
				expect.anything(),
				runtime,
				expect.objectContaining({
					message: 'Build a digest',
					timeZone: 'Europe/Helsinki',
					// Node attachments need their gate, which is off here.
					contextAttachments: [{ type: 'workflow', id: 'wf-1', name: 'Digest' }],
					// The agents runtime titles the thread after the turn.
					titledByRuntime: true,
				}),
			);
			expect(agentFactory.createAgent).toHaveBeenCalledWith(expect.anything(), runtime, {
				user,
				threadId: 'thread-1',
				runId: 'run-1',
				generateTitle: true,
			});
			expect(handle.agent).toBe(agent);
			expect(handle.input).toBe('Build a digest');
			// The title describes the user's words, not the context blocks of the input.
			expect(handle.runOptions?.titleText).toBe('Build a digest');
			expect(handle.hostMetadata).toMatchObject({
				assistantTurn: { runId: 'run-1', messageGroupId: 'mg-1' },
				buildMode: 'default',
			});
		});

		it('reads no thread settings from the turn overrides by default', async () => {
			const { provider, turnEnvironment } = setup();
			const turn = startTurn({
				options: {
					...startTurn().options,
					// Stored options of an older turn can still carry these fields.
					request: {
						mode: 'progressive',
						promptVersion: 'default@1',
						observerThresholdTokens: 5_000,
					},
				},
			});

			const handle = await provider.prepareTurn(turn);

			const { turnState } = turnEnvironment.create.mock.calls[0][1];
			expect(turnState.getBuildMode()).toBeUndefined();
			expect(turnState.getPromptVersion()).toBeUndefined();
			expect(turnState.getObserverThresholdTokens()).toBeUndefined();
			expect(handle.hostMetadata).toMatchObject({ promptVersion: null });
		});

		it('reads the thread settings of the turn from the turn overrides', async () => {
			const { provider, turnEnvironment, turnOverrides } = setup();
			vi.spyOn(turnOverrides, 'getBuildMode').mockReturnValue('progressive');
			vi.spyOn(turnOverrides, 'getPromptVersion').mockReturnValue('progressive@1');

			const handle = await provider.prepareTurn(startTurn());

			const { turnState } = turnEnvironment.create.mock.calls[0][1];
			expect(turnState.getBuildMode()).toBe('progressive');
			expect(turnState.getPromptVersion()).toBe('progressive@1');
			// The Assistant agent has no threshold override.
			expect(turnState.getObserverThresholdTokens()).toBeUndefined();
			expect(turnOverrides.getBuildMode).toHaveBeenCalledWith('thread-1');
			expect(turnOverrides.getPromptVersion).toHaveBeenCalledWith('thread-1');
			expect(handle.hostMetadata).toMatchObject({ promptVersion: 'progressive@1' });
		});

		it('keeps the element a user picked in an app preview, whatever the node gate says', async () => {
			const { provider, turnInput } = setup();
			const element = { type: 'element', appId: 'app-1', tagName: 'button', text: 'Save' };
			const turn = startTurn({
				options: { ...startTurn().options, request: { attachments: [element] } },
			});

			await provider.prepareTurn(turn);

			expect(turnInput.buildInput).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				expect.objectContaining({ contextAttachments: [element] }),
			);
		});

		it('gives parse-file the stored files of the thread, and keeps the input as text', async () => {
			const { provider, turnInput, environment } = setup();
			const ref = { id: 'att-1', fileName: 'notes.csv', mimeType: 'text/csv', sizeBytes: 3 };
			const stored = {
				fileName: 'notes.csv',
				mimeType: 'text/csv',
				sizeBytes: 3,
				readContent: vi.fn(async () => Buffer.from('a,b')),
			};
			const turn = startTurn({
				attachments: [ref],
				readFile: vi.fn(async (fileId: string) => (fileId === 'att-1' ? stored : undefined)),
			});

			const handle = await provider.prepareTurn(turn);

			// No file content is loaded up front, so parse-file is not tied to this message.
			expect(turn.readAttachment).not.toHaveBeenCalled();
			expect(turnInput.applyTurnScope).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ fileAttachments: [] }),
			);
			expect(turnInput.buildInput).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				expect.objectContaining({ fileAttachments: [] }),
			);
			await expect(environment.context.storedFiles?.read('att-1')).resolves.toBe(stored);
			await expect(environment.context.storedFiles?.read('other')).resolves.toBeUndefined();
			expect(handle.input).toBe('Build a digest');
		});

		it('asks the model to inspect the files of a message without text', async () => {
			const { provider, turnInput } = setup();
			const ref = { id: 'att-1', fileName: 'notes.csv', mimeType: 'text/csv', sizeBytes: 3 };

			await provider.prepareTurn(startTurn({ message: '', attachments: [ref] }));

			expect(turnInput.buildInput).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				expect.objectContaining({ message: FILES_ONLY_MESSAGE }),
			);
		});

		it('gives parse-file the stored files on a resumed turn', async () => {
			const { provider, environment } = setup();
			const start = startTurn();
			const stored = {
				fileName: 'notes.csv',
				mimeType: 'text/csv',
				sizeBytes: 3,
				readContent: vi.fn(async () => Buffer.from('a,b')),
			};
			const turn: SystemAgentResumeTurn<AssistantSandboxLease> = {
				type: 'resume',
				user,
				thread,
				resourceId: start.resourceId,
				abortSignal: start.abortSignal,
				emitHostEvent: start.emitHostEvent,
				memory: start.memory,
				checkpointStore: start.checkpointStore,
				sessionGrants: start.sessionGrants,
				readFile: vi.fn(async () => stored),
				runId: 'agent-run-1',
				toolCallId: 'tool-call-1',
				checkpointHostMetadata: { assistantTurn: { runId: 'run-1', messageGroupId: 'mg-1' } },
				resumeData: { approved: true },
			};

			await provider.prepareTurn(turn);

			await expect(environment.context.storedFiles?.read('att-1')).resolves.toBe(stored);
			expect(turn.readFile).toHaveBeenCalledWith('att-1');
		});

		describe('attached agent', () => {
			type ThreadPatchArgs = {
				threadId: string;
				update: (current: {
					id: string;
					metadata?: Record<string, unknown>;
				}) => { metadata?: Record<string, unknown> } | null | undefined;
			};

			/** A turn whose memory behaves like `N8nMemory`: a patch replaces the metadata,
			 *  and it returns `null` when the thread row does not exist yet. */
			function agentTurn(
				agent: Record<string, unknown>,
				metadata: Record<string, unknown> | undefined = undefined,
			) {
				const memory = mock<SystemAgentStartTurn['memory']>();
				const written: { metadata?: Record<string, unknown> } = {};
				const patchThread = vi.fn(async ({ threadId, update }: ThreadPatchArgs) => {
					if (!metadata) return null;
					const patch = update({ id: threadId, metadata: { ...metadata } });
					if (patch?.metadata) written.metadata = patch.metadata;
					return { id: threadId, metadata: written.metadata ?? metadata };
				});
				Object.assign(memory, { patchThread });
				const base = startTurn();
				const turn = startTurn({
					memory,
					options: {
						...base.options,
						request: { attachments: [{ type: 'agent', projectId: 'project-1', ...agent }] },
					},
				});
				return { turn, written };
			}

			it('binds a saved agent to a new thread', async () => {
				const { provider } = setup();
				const { turn } = agentTurn({ id: 'agent-1', name: 'Triage' });

				await provider.prepareTurn(turn);

				expect(turn.memory.saveThread).toHaveBeenCalledWith({
					id: 'thread-1',
					resourceId: 'system-chat:user-1',
					metadata: {
						instanceAiAgentBuilderTarget: {
							agentId: 'agent-1',
							projectId: 'project-1',
							name: 'Triage',
						},
						instanceAiAgentBuilderTargets: {},
					},
				});
			});

			it('marks a pending agent, so the build reuses its id', async () => {
				const { provider } = setup();
				const { turn, written } = agentTurn({ id: 'agent-new', pending: true }, { emoji: '🤖' });

				await provider.prepareTurn(turn);

				expect(written.metadata).toEqual({
					emoji: '🤖',
					instanceAiPendingAgentTarget: { projectId: 'project-1', agentId: 'agent-new' },
				});
				expect(turn.memory.saveThread).not.toHaveBeenCalled();
			});

			it('replaces the pending marker with the binding once the editor saved the agent', async () => {
				const { provider } = setup();
				const { turn, written } = agentTurn(
					{ id: 'agent-new' },
					{
						emoji: '🤖',
						instanceAiPendingAgentTarget: { projectId: 'project-1', agentId: 'agent-new' },
					},
				);

				await provider.prepareTurn(turn);

				// The whole metadata is written, so the pending marker is gone.
				expect(written.metadata).toEqual({
					emoji: '🤖',
					instanceAiAgentBuilderTarget: { agentId: 'agent-new', projectId: 'project-1' },
					instanceAiAgentBuilderTargets: {},
				});
				expect(turn.memory.saveThread).not.toHaveBeenCalled();
			});

			it.each([
				[
					'the thread already targets an agent',
					{ id: 'agent-2' },
					{ instanceAiAgentBuilderTarget: { agentId: 'agent-1', projectId: 'project-1' } },
				],
				[
					'the thread already has another pending agent',
					{ id: 'agent-2' },
					{ instanceAiPendingAgentTarget: { agentId: 'agent-1', projectId: 'project-1' } },
				],
				[
					'the pending agent is still unsaved',
					{ id: 'agent-1', pending: true },
					{ instanceAiPendingAgentTarget: { agentId: 'agent-1', projectId: 'project-1' } },
				],
				['the agent is in another project', { id: 'agent-2', projectId: 'project-2' }, undefined],
			])('keeps the thread metadata when %s', async (_case, agent, metadata) => {
				const { provider } = setup();
				const { turn, written } = agentTurn(agent, metadata);

				await provider.prepareTurn(turn);

				expect(written.metadata).toBeUndefined();
				expect(turn.memory.saveThread).not.toHaveBeenCalled();
			});
		});

		it('records the accepted input once, on the first chunk', async () => {
			const { provider, turnInput, input } = setup();

			const handle = await provider.prepareTurn(startTurn());
			handle.onChunk?.({ type: 'text-delta', delta: 'Hi' } as never);
			handle.onChunk?.({ type: 'text-delta', delta: '!' } as never);

			expect(turnInput.onInputAccepted).toHaveBeenCalledTimes(1);
			expect(turnInput.onInputAccepted).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				input,
				{ user, threadId: 'thread-1', runId: 'run-1' },
			);
		});

		it('finishes recording the accepted input before the turn settles', async () => {
			const { provider, turnInput } = setup();
			let finishRecording = () => {};
			turnInput.onInputAccepted.mockReturnValue(
				new Promise<void>((resolve) => {
					finishRecording = resolve;
				}),
			);

			const handle = await provider.prepareTurn(startTurn());
			handle.onChunk?.({ type: 'text-delta', delta: 'Hi' } as never);
			let settled = false;
			const settling = handle
				.onSettled?.({ executionId: 'exec-1', status: 'completed' })
				.then(() => {
					settled = true;
				});
			await new Promise((resolve) => setImmediate(resolve));
			expect(settled).toBe(false);

			finishRecording();
			await settling;
			expect(settled).toBe(true);
		});

		it('settles the turn when recording the accepted input fails', async () => {
			const { provider, turnInput, creditService } = setup();
			turnInput.onInputAccepted.mockRejectedValue(new Error('metadata write failed'));

			const handle = await provider.prepareTurn(startTurn());
			handle.onChunk?.({
				type: 'finish',
				finishReason: 'stop',
				model: 'anthropic/claude-sonnet',
				usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
			} as never);
			await handle.onSettled?.({ executionId: 'exec-1', status: 'completed' });

			expect(creditService.claimRunUsage).toHaveBeenCalled();
		});

		it('claims the model usage of the turn when it settles', async () => {
			const { provider, creditService } = setup();

			const handle = await provider.prepareTurn(startTurn());
			handle.onChunk?.({
				type: 'finish',
				finishReason: 'stop',
				model: 'anthropic/claude-sonnet',
				usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
			} as never);
			await handle.onSettled?.({ executionId: 'exec-1', status: 'completed' });

			expect(creditService.claimRunUsage).toHaveBeenCalledWith(
				user,
				'thread-1',
				'exec-1',
				expect.any(Array),
				'completed',
			);
		});

		describe('side-call usage', () => {
			const usage = { promptTokens: 50, completionTokens: 5, totalTokens: 55 };

			it.each(['title', 'episodic'] as const)(
				'claims the %s call against the credits',
				async (task) => {
					const { provider, creditService } = setup();

					const handle = await provider.prepareTurn(startTurn());
					await handle.onSideCallUsage?.({
						task,
						model: 'anthropic/claude-haiku-4-5',
						usage,
						reportId: 'report-1',
					});

					expect(creditService.claimRunUsage).toHaveBeenCalledWith(
						user,
						'thread-1',
						`run-1:${task}:report-1`,
						expect.arrayContaining([expect.anything()]),
						'completed',
					);
				},
			);

			it.each(['observer', 'reflector'] as const)(
				'does not claim the %s call, which the memory options claim',
				async (task) => {
					const { provider, creditService } = setup();

					const handle = await provider.prepareTurn(startTurn());
					await handle.onSideCallUsage?.({
						task,
						model: 'anthropic/claude-haiku-4-5',
						usage,
						reportId: 'report-1',
					});

					expect(creditService.claimRunUsage).not.toHaveBeenCalled();
				},
			);

			it('keeps the turn going when the claim fails', async () => {
				const { provider, creditService } = setup();
				creditService.claimRunUsage.mockRejectedValueOnce(new Error('billing down'));

				const handle = await provider.prepareTurn(startTurn());

				await expect(
					handle.onSideCallUsage?.({
						task: 'title',
						model: 'anthropic/claude-haiku-4-5',
						usage,
						reportId: 'report-1',
					}),
				).resolves.toBeUndefined();
			});
		});

		describe('temporary workflows', () => {
			function turnWithMarkedWorkflows() {
				return startTurn({
					memory: mock<SystemAgentStartTurn['memory']>({
						getThread: vi.fn(async () => ({
							id: 'thread-1',
							resourceId: 'system-chat:user-1',
							metadata: { assistantTemporaryWorkflowIds: ['wf-1', 'wf-2'] },
						})) as never,
					}),
				});
			}

			it('archives the workflows that the thread still marks when the turn ends', async () => {
				const { provider, archiveIfAiTemporary } = setup();

				const handle = await provider.prepareTurn(turnWithMarkedWorkflows());
				await handle.onSettled?.({ executionId: 'exec-1', status: 'completed' });

				expect(archiveIfAiTemporary).toHaveBeenCalledWith('wf-1');
				expect(archiveIfAiTemporary).toHaveBeenCalledWith('wf-2');
			});

			it('tells the chat which workflows it archived', async () => {
				const { provider, archiveIfAiTemporary } = setup();
				archiveIfAiTemporary.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
				const turn = turnWithMarkedWorkflows();

				const handle = await provider.prepareTurn(turn);
				await handle.onSettled?.({ executionId: 'exec-1', status: 'completed' });

				expect(turn.emitHostEvent).toHaveBeenCalledWith(
					ASSISTANT_WORKFLOWS_ARCHIVED_EVENT,
					{ workflowIds: ['wf-1'] },
					{ key: 'turn' },
				);
			});

			it('sends no archived event when it archived nothing', async () => {
				const { provider, archiveIfAiTemporary } = setup();
				archiveIfAiTemporary.mockResolvedValue(false);
				const turn = turnWithMarkedWorkflows();

				const handle = await provider.prepareTurn(turn);
				await handle.onSettled?.({ executionId: 'exec-1', status: 'completed' });

				expect(turn.emitHostEvent).not.toHaveBeenCalledWith(
					ASSISTANT_WORKFLOWS_ARCHIVED_EVENT,
					expect.anything(),
					expect.anything(),
				);
			});

			it('keeps them while the turn waits for the user', async () => {
				const { provider, archiveIfAiTemporary } = setup();
				const turn = turnWithMarkedWorkflows();

				const handle = await provider.prepareTurn(turn);
				await handle.onSettled?.({ executionId: 'exec-1', status: 'suspended' });

				expect(archiveIfAiTemporary).not.toHaveBeenCalled();
				expect(turn.emitHostEvent).not.toHaveBeenCalled();
			});

			it('drops the marker of a workflow that it cannot archive', async () => {
				const { provider, archiveIfAiTemporary } = setup();
				archiveIfAiTemporary.mockResolvedValueOnce(false);
				const turn = turnWithMarkedWorkflows();

				const handle = await provider.prepareTurn(turn);
				await handle.onSettled?.({ executionId: 'exec-1', status: 'completed' });

				// The store patches through the memory's own `patchThread`, which the type leaves out.
				const { patchThread } = turn.memory as unknown as {
					patchThread: ReturnType<typeof vi.fn>;
				};
				expect(patchThread).toHaveBeenCalledTimes(1);
				const [{ update }] = patchThread.mock.calls[0] as [
					{ update: (thread: unknown) => unknown },
				];
				expect(
					update({
						id: 'thread-1',
						resourceId: 'system-chat:user-1',
						metadata: { assistantTemporaryWorkflowIds: ['wf-1', 'wf-2'] },
					}),
				).toEqual({ metadata: { assistantTemporaryWorkflowIds: ['wf-2'] } });
			});

			it('continues with the next workflow when one archive fails', async () => {
				const { provider, archiveIfAiTemporary } = setup();
				archiveIfAiTemporary.mockRejectedValueOnce(new Error('gone'));

				const handle = await provider.prepareTurn(turnWithMarkedWorkflows());
				await handle.onSettled?.({ executionId: 'exec-1', status: 'errored' });

				expect(archiveIfAiTemporary).toHaveBeenCalledTimes(2);
			});
		});

		describe('formatError', () => {
			it('shows the user-facing text of an error', async () => {
				const { provider } = setup();
				const handle = await provider.prepareTurn(startTurn());

				await expect(handle.formatError?.(new UserError('Pick a project first.'))).resolves.toEqual(
					{
						message: 'Pick a project first.',
					},
				);
			});

			it('shows a credit error with its code', async () => {
				const { provider } = setup();
				const handle = await provider.prepareTurn(startTurn());

				await expect(
					handle.formatError?.(new QuotaExhaustedStreamError(new Error('402'))),
				).resolves.toEqual({
					message: QUOTA_EXHAUSTED_USER_MESSAGE,
					code: 'quota_exhausted',
				});
			});

			it('tells the user to start a new chat when the provider refuses a file', async () => {
				const { provider } = setup();
				const handle = await provider.prepareTurn(startTurn());

				const formatted = await handle.formatError?.(
					new Error('messages.0.content.1.image: image exceeds 10 MB maximum'),
				);

				expect(formatted?.message.toLowerCase()).toContain('new chat');
				expect(formatted?.message.toLowerCase()).not.toContain('left it out');
			});

			it('shows a masked stream failure as a credit error when the credits are used up', async () => {
				const { provider, turnEnvironment } = setup();
				turnEnvironment.assertAssistantCreditsAvailable.mockRejectedValue(
					new QuotaExhaustedStreamError(new Error('Assistant credits exhausted')),
				);
				const handle = await provider.prepareTurn(startTurn());
				const masked = Object.assign(new Error('No output generated'), {
					name: 'AI_NoOutputGeneratedError',
				});

				await expect(handle.formatError?.(masked)).resolves.toMatchObject({
					code: 'quota_exhausted',
				});

				// The turn checks the credits once for each error.
				turnEnvironment.assertAssistantCreditsAvailable.mockResolvedValue(undefined);
				const nextMasked = Object.assign(new Error('No output generated'), {
					name: 'AI_NoOutputGeneratedError',
				});
				await expect(handle.formatError?.(nextMasked)).resolves.not.toHaveProperty('code');
			});

			it('gives a credit error from the turn setup its text and code', async () => {
				const { provider } = setup();

				await expect(
					provider.formatSetupError(
						user,
						new QuotaExhaustedStreamError(new Error('Assistant credits exhausted')),
					),
				).resolves.toEqual({ message: QUOTA_EXHAUSTED_USER_MESSAGE, code: 'quota_exhausted' });
			});
		});

		it('builds a resume turn from the options in the checkpoint, without new input', async () => {
			const { provider, turnEnvironment, turnInput } = setup();
			const start = startTurn();
			const turn: SystemAgentResumeTurn<AssistantSandboxLease> = {
				type: 'resume',
				user,
				thread,
				resourceId: start.resourceId,
				abortSignal: start.abortSignal,
				emitHostEvent: start.emitHostEvent,
				memory: start.memory,
				checkpointStore: start.checkpointStore,
				sessionGrants: start.sessionGrants,
				readFile: start.readFile,
				runId: 'agent-run-1',
				toolCallId: 'tool-call-1',
				checkpointHostMetadata: { assistantTurn: { runId: 'run-1', messageGroupId: 'mg-1' } },
				resumeData: { approved: true },
			};

			const handle = await provider.prepareTurn(turn);

			expect(turnEnvironment.create).toHaveBeenCalledWith(
				expect.objectContaining({ runId: 'run-1', messageGroupId: 'mg-1' }),
				expect.anything(),
			);
			expect(turnInput.buildInput).not.toHaveBeenCalled();
			expect(handle.input).toBeUndefined();
			expect(handle.runOptions).not.toHaveProperty('titleText');
		});

		describe('tracing', () => {
			function traceMock() {
				const onMemoryTaskEvent = vi.fn();
				const context = { onMemoryTaskEvent } as unknown as AssistantTurnTrace['context'];
				const trace = mock<AssistantTurnTrace>({
					context,
					payload: {
						traceId: 'otel-1',
						langsmithTraceId: 'ls-trace-1',
						langsmithRunId: 'ls-run-1',
					},
				});
				trace.hostMetadata.mockReturnValue({
					assistantTrace: {
						langsmithTraceId: 'ls-trace-1',
						rootRunId: 'ls-run-1',
						actorRunId: 'actor-1',
					},
				});
				trace.tracePromptBuild.mockImplementation(async (_inputs, build) => await build());
				trace.withContext.mockImplementation(async (run) => await run());
				trace.finish.mockResolvedValue(undefined);
				return { trace, context, onMemoryTaskEvent };
			}

			it('runs the turn without a trace when tracing is off', async () => {
				const { provider, agentFactory } = setup();
				const turn = startTurn();

				const handle = await provider.prepareTurn(turn);

				expect(handle.withTurnContext).toBeUndefined();
				expect(handle.hostMetadata).not.toHaveProperty('assistantTrace');
				expect(agentFactory.createAgent.mock.calls[0][2]).not.toHaveProperty('tracing');
				expect(turn.emitHostEvent).not.toHaveBeenCalledWith(
					ASSISTANT_TRACE_EVENT,
					expect.anything(),
					expect.anything(),
				);
			});

			it('traces a start turn through the proxy', async () => {
				const { provider, tracer, turnEnvironment, agentFactory, environment } = setup();
				const proxyConfig = { apiUrl: 'https://proxy/langsmith', getAuthHeaders: vi.fn() };
				const proxyRunConfig = { tracingProxyConfig: proxyConfig };
				turnEnvironment.createProxyRunConfig.mockResolvedValue(proxyRunConfig);
				const { trace, context, onMemoryTaskEvent } = traceMock();
				tracer.startForTurn.mockResolvedValue(trace);
				const turn = startTurn();

				const handle = await provider.prepareTurn(turn);

				expect(tracer.startForTurn).toHaveBeenCalledWith(turn, {
					runId: 'run-1',
					messageGroupId: 'mg-1',
					proxyConfig,
					fileAttachments: [],
					// The node attachment needs its gate, which is off.
					contextAttachments: [{ type: 'workflow', id: 'wf-1', name: 'Digest' }],
					threadArtifacts: undefined,
				});
				// The run and the trace share one proxy token manager.
				expect(turnEnvironment.create.mock.calls[0][0].proxyRunConfig).toBe(proxyRunConfig);
				expect(trace.tracePromptBuild).toHaveBeenCalled();
				expect(trace.startOrchestratorRun).toHaveBeenCalled();
				expect(agentFactory.createAgent.mock.calls[0][2]).toMatchObject({ tracing: context });
				const runtime = turnEnvironment.create.mock.calls[0][1];
				expect(runtime.onMemoryTaskEvent).toBe(onMemoryTaskEvent);
				expect(handle.hostMetadata).toMatchObject({
					assistantTrace: { langsmithTraceId: 'ls-trace-1', actorRunId: 'actor-1' },
				});

				const run = vi.fn(async () => 'done');
				await expect(handle.withTurnContext?.(run)).resolves.toBe('done');
				expect(trace.withContext).toHaveBeenCalledWith(run);

				const chunk = { type: 'text-delta', id: 't-1', delta: 'Hi' } as const;
				handle.onChunk?.(chunk);
				expect(trace.observeChunk).toHaveBeenCalledWith(chunk);

				const outcome = { status: 'completed', executionId: 'exec-1' } as const;
				await handle.onSettled?.(outcome);
				expect(trace.finish).toHaveBeenCalledWith(outcome, environment.modelId);
			});

			it('collects the visible events of the Assistant tools', async () => {
				const { provider, tracer, turnEnvironment } = setup();
				const { trace } = traceMock();
				tracer.startForTurn.mockResolvedValue(trace);

				await provider.prepareTurn(startTurn());
				const runtime = turnEnvironment.create.mock.calls[0][1];
				const event = {
					type: 'tasks-update',
					runId: 'run-1',
					agentId: 'agent-1',
					payload: { tasks: { tasks: [] } },
				} as unknown as Parameters<AssistantTurnTrace['observeEvent']>[0];
				runtime.eventBus.publish('thread-1', event);

				expect(trace.observeEvent).toHaveBeenCalledWith(event);
			});

			it('finishes the trace when the turn setup fails', async () => {
				const { provider, tracer, agentFactory } = setup();
				const { trace } = traceMock();
				tracer.startForTurn.mockResolvedValue(trace);
				const error = new Error('No model');
				agentFactory.createAgent.mockRejectedValue(error);

				await expect(provider.prepareTurn(startTurn())).rejects.toBe(error);

				expect(trace.finish).toHaveBeenCalledWith({ status: 'errored', error });
			});

			it('does not build the prompt of a resumed turn', async () => {
				const { provider, tracer } = setup();
				const { trace } = traceMock();
				tracer.startForTurn.mockResolvedValue(trace);
				const start = startTurn();
				const turn: SystemAgentResumeTurn<AssistantSandboxLease> = {
					type: 'resume',
					user,
					thread,
					resourceId: start.resourceId,
					abortSignal: start.abortSignal,
					emitHostEvent: start.emitHostEvent,
					memory: start.memory,
					checkpointStore: start.checkpointStore,
					sessionGrants: start.sessionGrants,
					readFile: start.readFile,
					runId: 'agent-run-1',
					toolCallId: 'tool-call-1',
					checkpointHostMetadata: { assistantTurn: { runId: 'run-1', messageGroupId: 'mg-1' } },
					resumeData: { approved: true },
				};

				await provider.prepareTurn(turn);

				expect(tracer.startForTurn).toHaveBeenCalledWith(
					turn,
					expect.objectContaining({ runId: 'run-1', messageGroupId: 'mg-1' }),
				);
				expect(trace.tracePromptBuild).not.toHaveBeenCalled();
				expect(trace.startOrchestratorRun).toHaveBeenCalled();
			});

			describe('attached agent snapshot', () => {
				const agentAttachment = {
					type: 'agent',
					id: 'agent-1',
					projectId: 'project-1',
					name: 'Triage',
				} as const;
				const config = { name: 'Triage', instructions: 'Sort the tickets' };

				function snapshotSetup() {
					const setupResult = setup();
					const { tracer, agentFactory, environment, agent } = setupResult;
					const { trace, context } = traceMock();
					tracer.startForTurn.mockResolvedValue(trace);
					const orchestratorRun = { id: 'orchestrator-run' };
					const snapshotRun = { id: 'snapshot-run' };
					Object.assign(context, {
						actorRun: { id: 'root-run' },
						startChildRun: vi.fn(async () => snapshotRun),
						finishRun: vi.fn(async () => {}),
					});
					trace.startOrchestratorRun.mockImplementation(async () => {
						context.actorRun = orchestratorRun as typeof context.actorRun;
					});
					// Like the real factory, which gives the turn's trace to the domain tools.
					agentFactory.createAgent.mockImplementation(async (env, _runtime, params) => {
						env.orchestrationContext.tracing = params.tracing;
						return agent as unknown as Awaited<ReturnType<AssistantAgentFactory['createAgent']>>;
					});
					const readAgentArtifact = vi.fn(async () => ({
						config,
						skills: {},
						configHash: 'hash-1',
					}));
					environment.orchestrationContext.domainContext = {
						builderDelegate: { readAgentArtifact },
					} as unknown as AssistantTurnEnvironment['orchestrationContext']['domainContext'];
					return { ...setupResult, context, orchestratorRun, snapshotRun, readAgentArtifact };
				}

				it('records the attached agent under the orchestrator span', async () => {
					const { provider, context, orchestratorRun, snapshotRun, readAgentArtifact } =
						snapshotSetup();
					const base = startTurn();

					await provider.prepareTurn(
						startTurn({
							options: {
								...base.options,
								request: {
									attachments: [agentAttachment, { type: 'workflow', id: 'wf-1', name: 'Digest' }],
								},
							},
						}),
					);

					expect(readAgentArtifact).toHaveBeenCalledTimes(1);
					expect(readAgentArtifact).toHaveBeenCalledWith('agent-1');
					expect(context.startChildRun).toHaveBeenCalledWith(
						orchestratorRun,
						expect.objectContaining({
							name: 'agent-snapshot',
							metadata: expect.objectContaining({
								agent_id: 'agent-1',
								snapshot_reason: 'attached',
							}),
						}),
					);
					expect(context.finishRun).toHaveBeenCalledWith(snapshotRun, {
						outputs: {
							agentId: 'agent-1',
							projectId: 'project-1',
							configHash: 'hash-1',
							reason: 'attached',
							config,
							skills: {},
						},
						rawOutputs: true,
					});
				});

				it('does not record the attached agent again when a turn resumes', async () => {
					const { provider, readAgentArtifact } = snapshotSetup();
					const start = startTurn();

					await provider.prepareTurn({
						type: 'resume',
						user,
						thread,
						resourceId: start.resourceId,
						abortSignal: start.abortSignal,
						emitHostEvent: start.emitHostEvent,
						memory: start.memory,
						checkpointStore: start.checkpointStore,
						sessionGrants: start.sessionGrants,
						readFile: start.readFile,
						runId: 'agent-run-1',
						toolCallId: 'tool-call-1',
						checkpointHostMetadata: {
							assistantTurn: {
								runId: 'run-1',
								messageGroupId: 'mg-1',
								request: { attachments: [agentAttachment] },
							},
						},
						resumeData: { approved: true },
					});

					expect(readAgentArtifact).not.toHaveBeenCalled();
				});
			});
		});

		it('gives the turn the sandbox of its workspace lease', async () => {
			const { provider, turnEnvironment, workspace } = setup();
			const lease: AssistantSandboxLease = {
				config: { enabled: true, provider: 'n8n-sandbox' } as AssistantSandboxLease['config'],
				threadId: 'thread-1',
				user,
			};
			const sandboxWorkspace = { id: 'workspace-1' };
			workspace.getWorkspace.mockResolvedValue(sandboxWorkspace as never);

			await provider.prepareTurn(startTurn({ workspace: lease }));
			const runtime: AssistantTurnRuntime = turnEnvironment.create.mock.calls[0][1];

			await expect(runtime.sandbox.resolveConfig()).resolves.toBe(lease.config);
			await expect(runtime.sandbox.getOrCreateWorkspace({} as never)).resolves.toBe(
				sandboxWorkspace,
			);
		});
	});

	describe('error reports', () => {
		function tracedSetup() {
			const ctx = setup();
			const context = {
				rootRun: { traceId: 'ls-trace-1', otelTraceId: 'otel-1' },
			} as unknown as AssistantTurnTrace['context'];
			const trace = mock<AssistantTurnTrace>({ context });
			trace.tracePromptBuild.mockImplementation(async (_inputs, build) => await build());
			trace.hostMetadata.mockReturnValue({});
			ctx.tracer.startForTurn.mockResolvedValue(trace);
			return { ...ctx, trace };
		}

		const reportedIds = {
			source: 'instance-ai',
			threadId: 'thread-1',
			runId: 'run-1',
			projectId: 'project-1',
			userId: 'user-1',
			agentId: 'orchestrator-run-1',
			messageGroupId: 'mg-1',
			traceId: 'otel-1',
			langsmithTraceId: 'ls-trace-1',
		};

		it('reports a turn that the model stream failed, with the trace ids', async () => {
			const { provider, sentry } = tracedSetup();
			const handle = await provider.prepareTurn(startTurn());
			const error = new Error('overloaded');

			handle.onChunk?.({ type: 'error', error });
			await handle.onSettled?.({ executionId: 'exec-1', status: 'errored', error });

			expect(sentry.error).toHaveBeenCalledTimes(1);
			expect(sentry.error).toHaveBeenCalledWith(error, {
				tags: { component: 'instance-ai-stream', ...reportedIds },
				extra: reportedIds,
				shouldIsolate: true,
			});
		});

		it('reports an error that the run threw as a run failure', async () => {
			const { provider, sentry } = tracedSetup();
			const handle = await provider.prepareTurn(startTurn());
			const error = new Error('tool crashed');

			await handle.onSettled?.({ executionId: 'exec-1', status: 'errored', error });

			expect(sentry.error).toHaveBeenCalledWith(
				error,
				expect.objectContaining({
					tags: expect.objectContaining({
						component: 'instance-ai-run',
						langsmithTraceId: 'ls-trace-1',
					}),
				}),
			);
		});

		it('claims the turn usage when the report fails', async () => {
			const { provider, sentry, creditService, trace } = tracedSetup();
			sentry.error.mockImplementation(() => {
				throw new Error('sentry down');
			});
			const handle = await provider.prepareTurn(startTurn());
			handle.onChunk?.({
				type: 'finish',
				finishReason: 'error',
				model: 'anthropic/claude-sonnet',
				usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
			} as never);
			const outcome = { executionId: 'exec-1', status: 'errored', error: new Error('x') } as const;

			await handle.onSettled?.(outcome);

			expect(sentry.error).toHaveBeenCalled();
			expect(creditService.claimRunUsage).toHaveBeenCalled();
			expect(trace.finish).toHaveBeenCalledWith(outcome, expect.anything());
		});

		it('reports the turn without trace ids when tracing is off', async () => {
			const { provider, sentry } = setup();
			const handle = await provider.prepareTurn(startTurn());
			const error = new Error('tool crashed');

			await handle.onSettled?.({ executionId: 'exec-1', status: 'errored', error });

			const [, context] = sentry.error.mock.calls[0];
			expect(context?.tags).toMatchObject({ component: 'instance-ai-run', runId: 'run-1' });
			expect(context?.tags).not.toHaveProperty('langsmithTraceId');
		});

		it.each(['completed', 'suspended', 'cancelled'] as const)(
			'does not report a %s turn',
			async (status) => {
				const { provider, sentry } = tracedSetup();
				const handle = await provider.prepareTurn(startTurn());

				await handle.onSettled?.({ executionId: 'exec-1', status });

				expect(sentry.error).not.toHaveBeenCalled();
			},
		);

		it('does not report a stream transport failure', async () => {
			const { provider, sentry } = tracedSetup();
			const handle = await provider.prepareTurn(startTurn());
			const error = new ModelStreamStallError(90_000);

			handle.onChunk?.({ type: 'error', error });
			await handle.onSettled?.({ executionId: 'exec-1', status: 'errored', error });

			expect(sentry.error).not.toHaveBeenCalled();
		});

		it('does not report a masked stream failure when the credits are used up', async () => {
			const { provider, sentry, turnEnvironment } = tracedSetup();
			turnEnvironment.assertAssistantCreditsAvailable.mockRejectedValue(
				new QuotaExhaustedStreamError(new Error('Assistant credits exhausted')),
			);
			const handle = await provider.prepareTurn(startTurn());
			const masked = Object.assign(new Error('No output generated'), {
				name: 'AI_NoOutputGeneratedError',
			});

			handle.onChunk?.({ type: 'error', error: masked });
			await expect(handle.formatError?.(masked)).resolves.toMatchObject({
				code: 'quota_exhausted',
			});
			await handle.onSettled?.({ executionId: 'exec-1', status: 'errored', error: masked });

			expect(sentry.error).not.toHaveBeenCalled();
			// The error text and the report share one credit check.
			expect(turnEnvironment.assertAssistantCreditsAvailable).toHaveBeenCalledTimes(1);
		});

		it('reports an error only once for each turn', async () => {
			const { provider, sentry, errorReporter } = tracedSetup();
			const handle = await provider.prepareTurn(startTurn());
			const error = new Error('overloaded');
			// A report from the turn setup that saw the same error first.
			errorReporter.report(error, {
				component: 'instance-ai-observer',
				threadId: 'thread-1',
				runId: 'run-1',
			});

			await handle.onSettled?.({ executionId: 'exec-1', status: 'errored', error });

			expect(sentry.error).toHaveBeenCalledTimes(1);

			// The turn ended, so the next turn of the run reports the error again.
			const next = await provider.prepareTurn(startTurn());
			await next.onSettled?.({ executionId: 'exec-2', status: 'errored', error });
			expect(sentry.error).toHaveBeenCalledTimes(2);
		});

		it('reports a failure of the turn setup, with the trace ids', async () => {
			const { provider, sentry, agentFactory } = tracedSetup();
			const error = new Error('No model');
			agentFactory.createAgent.mockRejectedValue(error);

			await expect(provider.prepareTurn(startTurn())).rejects.toBe(error);

			expect(sentry.error).toHaveBeenCalledWith(error, {
				tags: { component: 'instance-ai-run', ...reportedIds },
				extra: reportedIds,
				shouldIsolate: true,
			});
		});

		it('keeps the setup error and ends the turn when the report fails', async () => {
			const { provider, sentry, agentFactory, errorReporter, trace } = tracedSetup();
			sentry.error.mockImplementation(() => {
				throw new Error('sentry down');
			});
			const endRun = vi.spyOn(errorReporter, 'endRun');
			const error = new Error('No model');
			agentFactory.createAgent.mockRejectedValue(error);

			await expect(provider.prepareTurn(startTurn())).rejects.toBe(error);

			expect(endRun).toHaveBeenCalledWith('run-1', expect.any(Symbol));
			expect(trace.finish).toHaveBeenCalledWith({ status: 'errored', error });
		});

		it('reports a failure of the turn setup before the trace starts', async () => {
			const { provider, sentry, adapterService } = setup();
			const error = new Error('flags down');
			adapterService.resolveExperimentGates.mockRejectedValue(error);

			await expect(provider.prepareTurn(startTurn())).rejects.toBe(error);

			expect(sentry.error).toHaveBeenCalledWith(
				error,
				expect.objectContaining({
					tags: expect.objectContaining({ component: 'instance-ai-run', runId: 'run-1' }),
				}),
			);
		});

		it('does not report a turn setup that the user stopped', async () => {
			const { provider, sentry, agentFactory } = tracedSetup();
			const controller = new AbortController();
			agentFactory.createAgent.mockImplementation(async () => {
				controller.abort();
				throw new Error('aborted');
			});

			await expect(
				provider.prepareTurn(startTurn({ abortSignal: controller.signal })),
			).rejects.toThrow('aborted');

			expect(sentry.error).not.toHaveBeenCalled();
		});

		it('does not report a setup credit error', async () => {
			const { provider, sentry, turnEnvironment } = tracedSetup();
			turnEnvironment.create.mockRejectedValue(
				new QuotaExhaustedStreamError(new Error('Assistant credits exhausted')),
			);

			await expect(provider.prepareTurn(startTurn())).rejects.toThrow();

			expect(sentry.error).not.toHaveBeenCalled();
		});

		it('gives the trace of the turn to the turn setup', async () => {
			const { provider, turnEnvironment, trace } = tracedSetup();

			await provider.prepareTurn(startTurn());

			expect(turnEnvironment.create.mock.calls[0][0].tracing).toBe(trace.context);
		});
	});
});

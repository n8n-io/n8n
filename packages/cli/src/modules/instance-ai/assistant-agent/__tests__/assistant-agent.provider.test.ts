import { ASSISTANT_WORKFLOWS_ARCHIVED_EVENT } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type {
	SystemAgentResumeTurn,
	SystemAgentStartTurn,
} from '@/modules/agents/system-agents/system-agent.types';

import type { InstanceAiCreditService } from '../../instance-ai-credit.service';
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
import { QUOTA_EXHAUSTED_USER_MESSAGE } from '../../user-facing-errors';
import { AssistantAgentProvider } from '../assistant-agent.provider';
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
	);
	return {
		provider,
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
			mode: 'progressive',
		});

		expect(options).toEqual({
			runId: expect.stringMatching(/^run_/),
			messageGroupId: expect.stringMatching(/^mg_/),
			request: { timeZone: 'UTC', mode: 'progressive' },
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

		it('gives the file tools the content of the turn files, and keeps the input as text', async () => {
			const { provider, turnInput } = setup();
			const ref = { id: 'att-1', fileName: 'notes.csv', mimeType: 'text/csv', sizeBytes: 3 };
			const turn = startTurn({
				attachments: [ref, { ...ref, id: 'att-gone' }],
				readAttachment: vi.fn(async (attachment) =>
					attachment.id === 'att-1' ? Buffer.from('a,b') : undefined,
				),
			});

			const handle = await provider.prepareTurn(turn);

			const file = {
				type: 'file',
				data: Buffer.from('a,b').toString('base64'),
				mimeType: 'text/csv',
				fileName: 'notes.csv',
			};
			expect(turnInput.applyTurnScope).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ fileAttachments: [file] }),
			);
			expect(turnInput.buildInput).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				expect.objectContaining({ fileAttachments: [file] }),
			);
			expect(handle.input).toBe('Build a digest');
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

				turnEnvironment.assertAssistantCreditsAvailable.mockResolvedValue(undefined);
				await expect(handle.formatError?.(masked)).resolves.not.toHaveProperty('code');
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
});

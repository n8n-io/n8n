import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
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
	const environment = {
		context: {},
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
		mock<GlobalConfig>({ instanceAi: { model: 'anthropic/claude-sonnet' }, ai: {} }),
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
			expect(runtime.cancelBackgroundTask).toBeUndefined();
			expect(runtime.schedulePlannedTasks).toBeUndefined();

			expect(turnInput.buildInput).toHaveBeenCalledWith(
				expect.anything(),
				runtime,
				expect.objectContaining({
					message: 'Build a digest',
					timeZone: 'Europe/Helsinki',
					// Node attachments need their gate, which is off here.
					contextAttachments: [{ type: 'workflow', id: 'wf-1', name: 'Digest' }],
				}),
			);
			expect(agentFactory.createAgent).toHaveBeenCalledWith(expect.anything(), runtime, {
				user,
				threadId: 'thread-1',
				runId: 'run-1',
			});
			expect(handle.agent).toBe(agent);
			expect(handle.input).toBe('Build a digest');
			expect(handle.hostMetadata).toMatchObject({
				assistantTurn: { runId: 'run-1', messageGroupId: 'mg-1' },
				buildMode: 'default',
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

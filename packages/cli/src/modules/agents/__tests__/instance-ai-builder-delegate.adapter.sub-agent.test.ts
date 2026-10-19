import type {
	BuiltTelemetry,
	BuiltTool,
	CredentialProvider,
	SerializableAgentState,
	StreamChunk,
} from '@n8n/agents';
import type { Settings, SettingsRepository, User } from '@n8n/db';
import type { InstanceAiCredentialService } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@n8n/errors';
import * as checkAccess from '@/permissions.ee/check-access';

import type { AgentsService } from '../agents.service';
import { AgentsSettingsService } from '../agents-settings.service';
import type { AgentsBuilderService } from '../builder/agents-builder.service';
import type { AgentsBuilderToolsService } from '../builder/agents-builder-tools.service';
import {
	INSTANCE_AI_BUILDER_ADDENDUM,
	InstanceAiBuilderDelegateAdapterService,
} from '../instance-ai-builder-delegate.adapter';
import type { AgentConfigService } from '../agent-config.service';
import type { AgentSkillRefsService } from '../agent-skill-refs.service';
import type { AgentSkillsService } from '../agent-skills.service';
import type { AgentValidationService } from '../agent-validation.service';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentThreadRepository } from '../repositories/agent-thread.repository';

function setup(options: { useEvalModelCatalog?: boolean } = {}) {
	const agentsService = mock<AgentsService>();
	const agentsBuilderService = mock<AgentsBuilderService>();
	const n8nMemory = mock<N8nMemory>();
	const agentThreadRepository = mock<AgentThreadRepository>();
	const agentConfig = mock<AgentConfigService>();
	const agentSkills = mock<AgentSkillsService>();
	const credentialService = mock<InstanceAiCredentialService>();
	const settingsRepository = mock<SettingsRepository>();
	const agentsSettingsService = new AgentsSettingsService(
		settingsRepository,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
	);

	const service = new InstanceAiBuilderDelegateAdapterService(
		agentsService,
		mock<AgentsBuilderToolsService>(),
		agentsBuilderService,
		n8nMemory,
		agentThreadRepository,
		agentConfig,
		agentSkills,
		agentsSettingsService,
		mock<AgentValidationService>(),
		mock<AgentSkillRefsService>(),
	);

	const user = mock<User>({ id: 'user-1' });
	const credentialProvider = mock<CredentialProvider>();
	const credentialProviderFor = vi.fn().mockReturnValue(credentialProvider);
	const delegate = service.createDelegate(
		user,
		'project-1',
		credentialProviderFor,
		credentialService,
		options,
	);

	return {
		service,
		delegate,
		user,
		agentsService,
		agentsBuilderService,
		n8nMemory,
		agentThreadRepository,
		agentConfig,
		agentSkills,
		credentialProvider,
		credentialProviderFor,
		credentialService,
		settingsRepository,
	};
}

async function* asAsyncGenerator<T>(values: T[]): AsyncGenerator<T> {
	for (const value of values) yield value;
}

const abortSignal = new AbortController().signal;

function fakeMcpTools(): Map<string, BuiltTool> {
	const notionSearch: BuiltTool = {
		name: 'notion_search',
		description: 'Search connected Notion content',
	};
	return new Map([[notionSearch.name, notionSearch]]);
}

describe('InstanceAiBuilderDelegateAdapterService sub-agent methods', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('streamBuild', () => {
		it('accumulates text-delta chunks into the text promise and forwards all chunks', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);

			const chunks: StreamChunk[] = [
				{ type: 'text-delta', id: '1', delta: 'Hello ' },
				{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'agent-context', input: {} },
				{ type: 'text-delta', id: '2', delta: 'world' },
			];
			agentsBuilderService.buildAgent.mockReturnValue(asAsyncGenerator(chunks));

			const turn = await delegate.streamBuild('agent-1', 'hi', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
				abortSignal,
			});

			const seen: unknown[] = [];
			for await (const chunk of turn.fullStream) seen.push(chunk);

			expect(seen).toHaveLength(3);
			await expect(turn.text).resolves.toBe('Hello world');
		});

		it('builds the sub-agent session from the delegate session: thread ids, run id, model config, and addendum', async () => {
			const { delegate, agentsBuilderService, user, credentialProvider, credentialService } =
				setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.buildAgent.mockReturnValue(asAsyncGenerator<StreamChunk>([]));
			const sentinel = { functionId: 'host' } as unknown as BuiltTelemetry;
			const mcpTools = fakeMcpTools();

			await delegate.streamBuild('agent-1', 'hi', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
				abortSignal,
				telemetry: sentinel,
				mcpTools,
			});

			expect(agentsBuilderService.buildAgent).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				credentialService,
				user,
				{
					threadId: 'ia-builder:t:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: 'anthropic/claude-sonnet-host-resolved',
					abortSignal,
					instructionsAddendum: INSTANCE_AI_BUILDER_ADDENDUM,
					telemetry: sentinel,
					mcpTools,
					onRequiredArtifact: expect.any(Function),
				},
			);
		});

		it('enables deterministic model catalogs for eval builder sessions', async () => {
			const { delegate, agentsBuilderService } = setup({ useEvalModelCatalog: true });
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.buildAgent.mockReturnValue(asAsyncGenerator<StreamChunk>([]));

			await delegate.streamBuild('agent-1', 'hi', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
				abortSignal,
			});

			expect(agentsBuilderService.buildAgent).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				'hi',
				expect.anything(),
				expect.anything(),
				expect.anything(),
				expect.objectContaining({ useEvalModelCatalog: true }),
			);
		});

		it('omits telemetry from the sub-agent session when the delegate session has none', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.buildAgent.mockReturnValue(asAsyncGenerator<StreamChunk>([]));

			await delegate.streamBuild('agent-1', 'hi', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
				abortSignal,
			});

			const [, , , , , , sessionArg] = agentsBuilderService.buildAgent.mock.calls[0];
			expect(sessionArg).not.toHaveProperty('telemetry');
		});

		it.each([
			{ hasScope: false, enabled: true },
			{ hasScope: true, enabled: false },
		])(
			'rejects a new build with scope $hasScope and Agents enabled $enabled',
			async ({ hasScope, enabled }) => {
				const { delegate, agentsBuilderService, settingsRepository } = setup();
				vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(hasScope);
				settingsRepository.findByKeyInContext.mockResolvedValue(
					mock<Settings>({ value: String(enabled) }),
				);

				await expect(
					delegate.streamBuild('agent-1', 'hi', {
						threadId: 'ia-builder:t:agent-1',
						hostThreadId: 'thread-1',
						runId: 'run-1',
						modelConfig: 'anthropic/claude-sonnet-host-resolved',
						abortSignal,
					}),
				).rejects.toThrow(ForbiddenError);
				expect(agentsBuilderService.buildAgent).not.toHaveBeenCalled();
			},
		);

		it('builds the credential provider from the concrete target agent id', async () => {
			const { delegate, agentsBuilderService, credentialProviderFor } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.buildAgent.mockReturnValue(asAsyncGenerator<StreamChunk>([]));

			await delegate.streamBuild('agent-1', 'hi', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
				abortSignal,
			});

			expect(credentialProviderFor).toHaveBeenCalledWith('agent-1');
		});
	});

	describe('resumeBuild', () => {
		it.each([true])('resumes the saved builder call with Agents enabled %s', async (enabled) => {
			const {
				delegate,
				agentsBuilderService,
				user,
				credentialProvider,
				credentialService,
				settingsRepository,
			} = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			settingsRepository.findByKeyInContext.mockResolvedValue(
				mock<Settings>({ value: String(enabled) }),
			);
			const mcpTools = fakeMcpTools();

			const chunks: StreamChunk[] = [
				{ type: 'text-delta', id: '1', delta: 'Using ' },
				{ type: 'text-delta', id: '2', delta: 'Slack.' },
			];
			agentsBuilderService.resumeBuild.mockReturnValue(asAsyncGenerator(chunks));

			const turn = await delegate.resumeBuild(
				'agent-1',
				{ runId: 'run-1', toolCallId: 'call-1', resumeData: { approved: true } },
				{
					threadId: 'ia-builder:t:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: 'anthropic/claude-sonnet-host-resolved',
					abortSignal,
					mcpTools,
				},
			);

			const seen: unknown[] = [];
			for await (const chunk of turn.fullStream) seen.push(chunk);

			expect(seen).toHaveLength(2);
			await expect(turn.text).resolves.toBe('Using Slack.');
			expect(agentsBuilderService.resumeBuild).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				'run-1',
				'call-1',
				{ approved: true },
				credentialProvider,
				credentialService,
				user,
				{
					threadId: 'ia-builder:t:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: 'anthropic/claude-sonnet-host-resolved',
					abortSignal,
					instructionsAddendum: INSTANCE_AI_BUILDER_ADDENDUM,
					mcpTools,
					onRequiredArtifact: expect.any(Function),
				},
			);
		});

		it('enables deterministic model catalogs when an eval session resumes', async () => {
			const { delegate, agentsBuilderService } = setup({ useEvalModelCatalog: true });
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.resumeBuild.mockReturnValue(asAsyncGenerator<StreamChunk>([]));

			await delegate.resumeBuild(
				'agent-1',
				{ runId: 'run-1', toolCallId: 'call-1', resumeData: { approved: true } },
				{
					threadId: 'ia-builder:t:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: 'anthropic/claude-sonnet-host-resolved',
					abortSignal,
				},
			);

			expect(agentsBuilderService.resumeBuild).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				'run-1',
				'call-1',
				{ approved: true },
				expect.anything(),
				expect.anything(),
				expect.anything(),
				expect.objectContaining({ useEvalModelCatalog: true }),
			);
		});

		it('rejects when the user lacks agent:update scope', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(
				delegate.resumeBuild(
					'agent-1',
					{ runId: 'run-1', toolCallId: 'call-1', resumeData: {} },
					{
						threadId: 'ia-builder:t:agent-1',
						hostThreadId: 'thread-1',
						runId: 'run-1',
						modelConfig: 'anthropic/claude-sonnet-host-resolved',
						abortSignal,
					},
				),
			).rejects.toThrow(ForbiddenError);
			expect(agentsBuilderService.resumeBuild).not.toHaveBeenCalled();
		});
	});

	describe('when Agents are turned off after the delegate was created', () => {
		function disableAgents(settingsRepository: ReturnType<typeof setup>['settingsRepository']) {
			settingsRepository.findByKeyInContext.mockResolvedValue(mock<Settings>({ value: 'false' }));
		}

		it('rejects a resumed build', async () => {
			const { delegate, agentsBuilderService, settingsRepository } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			disableAgents(settingsRepository);

			await expect(
				delegate.resumeBuild(
					'agent-1',
					{ runId: 'run-1', toolCallId: 'call-1', resumeData: {} },
					{
						threadId: 'ia-builder:t:agent-1',
						hostThreadId: 'thread-1',
						runId: 'run-1',
						modelConfig: 'anthropic/claude-sonnet-host-resolved',
						abortSignal,
					},
				),
			).rejects.toThrow(ForbiddenError);
			expect(agentsBuilderService.resumeBuild).not.toHaveBeenCalled();
		});

		it('still cancels an open builder suspension', async () => {
			const { delegate, agentsBuilderService, settingsRepository } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			disableAgents(settingsRepository);

			await delegate.cancelOpenSuspension('agent-1', 'run-1');

			expect(agentsBuilderService.cancelCheckpoint).toHaveBeenCalledWith('agent-1', 'run-1');
		});
	});

	describe('findOpenSuspensions', () => {
		function checkpointWith(
			pendingToolCalls: SerializableAgentState['pendingToolCalls'],
		): SerializableAgentState {
			return {
				status: 'suspended',
				messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
				pendingToolCalls,
			};
		}

		it('returns all suspended pending tool calls mapped to runId/toolCallId', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.findOpenCheckpointForThread.mockResolvedValue(
				checkpointWith({
					'call-1': {
						toolCallId: 'call-1',
						toolName: 'agent_builder_ask_questions',
						input: {},
						suspended: true,
						suspendPayload: { message: 'first' },
						resumeSchema: {},
						runId: 'run-1',
					},
					'call-2': {
						toolCallId: 'call-2',
						toolName: 'agent_builder_ask_credential',
						input: {},
						suspended: true,
						suspendPayload: { message: 'second' },
						resumeSchema: {},
						runId: 'run-2',
					},
				}),
			);

			const result = await delegate.findOpenSuspensions('agent-1', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
				abortSignal,
			});

			expect(agentsBuilderService.findOpenCheckpointForThread).toHaveBeenCalledWith(
				'agent-1',
				'ia-builder:t:agent-1',
			);
			expect(result).toEqual([
				{ runId: 'run-1', toolCallId: 'call-1' },
				{ runId: 'run-2', toolCallId: 'call-2' },
			]);
		});

		it('returns [] when findOpenCheckpointForThread resolves null', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.findOpenCheckpointForThread.mockResolvedValue(null);

			const result = await delegate.findOpenSuspensions('agent-1', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
				abortSignal,
			});

			expect(result).toEqual([]);
		});

		it('returns [] when the checkpoint has no suspended calls', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.findOpenCheckpointForThread.mockResolvedValue(
				checkpointWith({
					'call-1': {
						toolCallId: 'call-1',
						toolName: 'agent-context',
						input: {},
						suspended: false,
					},
				}),
			);

			const result = await delegate.findOpenSuspensions('agent-1', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
				abortSignal,
			});

			expect(result).toEqual([]);
		});

		it('rejects when the user lacks agent:update scope', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(
				delegate.findOpenSuspensions('agent-1', {
					threadId: 'ia-builder:t:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: 'anthropic/claude-sonnet-host-resolved',
					abortSignal,
				}),
			).rejects.toThrow(ForbiddenError);
			expect(agentsBuilderService.findOpenCheckpointForThread).not.toHaveBeenCalled();
		});
	});

	describe('cancelOpenSuspension', () => {
		it('calls agentsBuilderService.cancelCheckpoint(agentId, runId)', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);

			await delegate.cancelOpenSuspension('agent-1', 'run-1');

			expect(agentsBuilderService.cancelCheckpoint).toHaveBeenCalledWith('agent-1', 'run-1');
		});

		it('rejects when the user lacks agent:update scope', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(delegate.cancelOpenSuspension('agent-1', 'run-1')).rejects.toThrow(
				ForbiddenError,
			);
			expect(agentsBuilderService.cancelCheckpoint).not.toHaveBeenCalled();
		});
	});
});

describe('INSTANCE_AI_BUILDER_ADDENDUM', () => {
	it('tells the builder the orchestrator can create workflows and data tables', () => {
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain(
			'The Instance AI orchestrator can create workflows and data tables',
		);
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain('never ask the user to create them manually');
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain(
			'the orchestrator will provision them and call you again',
		);
	});

	it('tells the builder to use Sessions tab for agent history', () => {
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain('say Sessions tab for history');
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain(
			'Never say Runs, Executions, or Activity History for agents.',
		);
	});
});

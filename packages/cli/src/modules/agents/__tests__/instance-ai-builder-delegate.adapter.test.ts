import type { CredentialProvider, SerializableAgentState, StreamChunk } from '@n8n/agents';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import * as checkAccess from '@/permissions.ee/check-access';

import type { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import type { AgentsService } from '../agents.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentsBuilderService } from '../builder/agents-builder.service';
import {
	BUILDER_EXTRA_TOOL_NAMES,
	INSTANCE_AI_BUILDER_ADDENDUM,
} from '../instance-ai-builder-extra-tools';
import { InstanceAiBuilderDelegateAdapterService } from '../instance-ai-builder-delegate.adapter';

function setup() {
	const agentsService = mock<AgentsService>();
	const agentsBuilderService = mock<AgentsBuilderService>();
	const agentIntegrationPersistenceService = mock<AgentIntegrationPersistenceService>();
	agentIntegrationPersistenceService.listChatIntegrations.mockReturnValue([
		{ type: 'slack', label: 'Slack', icon: 'slack', credentialTypes: ['slackOAuth2Api'] },
	]);

	const service = new InstanceAiBuilderDelegateAdapterService(
		agentsService,
		agentsBuilderService,
		agentIntegrationPersistenceService,
	);

	const user = mock<User>({ id: 'user-1' });
	const credentialProvider = mock<CredentialProvider>();
	const delegate = service.createDelegate(user, 'project-1', credentialProvider);

	return {
		delegate,
		user,
		agentsService,
		agentsBuilderService,
		agentIntegrationPersistenceService,
		credentialProvider,
	};
}

/** Extract the extraTools names + addendum from a builder-service session-arg call. */
function sessionArg(call: unknown[]): { toolNames: string[]; instructionsAddendum?: string } {
	const session = call.at(-1) as
		| { extraTools?: Array<{ name: string }>; instructionsAddendum?: string }
		| undefined;
	return {
		toolNames: (session?.extraTools ?? []).map((tool) => tool.name),
		instructionsAddendum: session?.instructionsAddendum,
	};
}

async function* asAsyncGenerator<T>(values: T[]): AsyncGenerator<T> {
	for (const value of values) yield value;
}

describe('InstanceAiBuilderDelegateAdapterService', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('streamBuild', () => {
		it('accumulates text-delta chunks into the text promise and forwards all chunks', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);

			const chunks: StreamChunk[] = [
				{ type: 'text-delta', id: '1', delta: 'Hello ' },
				{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'read_config', input: {} },
				{ type: 'text-delta', id: '2', delta: 'world' },
			];
			agentsBuilderService.buildAgent.mockReturnValue(asAsyncGenerator(chunks));

			const turn = await delegate.streamBuild('agent-1', 'hi', {
				threadId: 'ia-builder:t:agent-1',
			});

			const seen: unknown[] = [];
			for await (const chunk of turn.fullStream) seen.push(chunk);

			expect(seen).toHaveLength(3);
			await expect(turn.text).resolves.toBe('Hello world');
		});

		it('passes the session thread id through to the builder service', async () => {
			const { delegate, agentsBuilderService, user, credentialProvider } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.buildAgent.mockReturnValue(asAsyncGenerator<StreamChunk>([]));

			await delegate.streamBuild('agent-1', 'hi', { threadId: 'ia-builder:t:agent-1' });

			expect(agentsBuilderService.buildAgent).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				user,
				expect.objectContaining({ threadId: 'ia-builder:t:agent-1' }),
			);
		});

		it('injects the configure_channel and ask_questions builder tools plus the instance-AI prompt addendum', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.buildAgent.mockReturnValue(asAsyncGenerator<StreamChunk>([]));

			await delegate.streamBuild('agent-1', 'hi', { threadId: 'ia-builder:t:agent-1' });

			const { toolNames, instructionsAddendum } = sessionArg(
				agentsBuilderService.buildAgent.mock.calls[0],
			);
			expect(toolNames).toEqual(
				expect.arrayContaining([
					BUILDER_EXTRA_TOOL_NAMES.CONFIGURE_CHANNEL,
					BUILDER_EXTRA_TOOL_NAMES.ASK_QUESTIONS,
				]),
			);
			expect(instructionsAddendum).toBe(INSTANCE_AI_BUILDER_ADDENDUM);
		});

		it('rejects when the user lacks agent:update scope', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(
				delegate.streamBuild('agent-1', 'hi', { threadId: 'ia-builder:t:agent-1' }),
			).rejects.toThrow(ForbiddenError);
			expect(agentsBuilderService.buildAgent).not.toHaveBeenCalled();
		});
	});

	describe('resumeBuild', () => {
		it('passes the session thread id and resume payload through to the builder service', async () => {
			const { delegate, agentsBuilderService, user, credentialProvider } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.resumeBuild.mockReturnValue(asAsyncGenerator<StreamChunk>([]));

			await delegate.resumeBuild(
				'agent-1',
				{ runId: 'run-1', toolCallId: 'tc-1', resumeData: { approved: true } },
				{ threadId: 'ia-builder:t:agent-1' },
			);

			expect(agentsBuilderService.resumeBuild).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				'run-1',
				'tc-1',
				{ approved: true },
				credentialProvider,
				user,
				expect.objectContaining({ threadId: 'ia-builder:t:agent-1' }),
			);
		});

		it('injects the configure_channel and ask_questions builder tools plus the instance-AI prompt addendum', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.resumeBuild.mockReturnValue(asAsyncGenerator<StreamChunk>([]));

			await delegate.resumeBuild(
				'agent-1',
				{ runId: 'run-1', toolCallId: 'tc-1', resumeData: { approved: true } },
				{ threadId: 'ia-builder:t:agent-1' },
			);

			const { toolNames, instructionsAddendum } = sessionArg(
				agentsBuilderService.resumeBuild.mock.calls[0],
			);
			expect(toolNames).toEqual(
				expect.arrayContaining([
					BUILDER_EXTRA_TOOL_NAMES.CONFIGURE_CHANNEL,
					BUILDER_EXTRA_TOOL_NAMES.ASK_QUESTIONS,
				]),
			);
			expect(instructionsAddendum).toBe(INSTANCE_AI_BUILDER_ADDENDUM);
		});

		it('rejects when the user lacks agent:update scope', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(
				delegate.resumeBuild(
					'agent-1',
					{ runId: 'run-1', toolCallId: 'tc-1', resumeData: {} },
					{ threadId: 'ia-builder:t:agent-1' },
				),
			).rejects.toThrow(ForbiddenError);
			expect(agentsBuilderService.resumeBuild).not.toHaveBeenCalled();
		});
	});

	describe('findOpenSuspension', () => {
		it('returns the pending suspension from the thread-scoped checkpoint', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);

			const checkpoint = {
				status: 'suspended',
				pendingToolCalls: {
					'tc-1': { toolCallId: 'tc-1', toolName: 'confirm', input: {}, suspended: false },
					'tc-2': {
						toolCallId: 'tc-2',
						toolName: 'confirm',
						input: {},
						suspended: true,
						suspendPayload: { message: 'Approve?' },
						resumeSchema: {},
						runId: 'run-2',
					},
				},
				messageList: { messages: [] },
			} as unknown as SerializableAgentState;
			agentsBuilderService.findOpenCheckpointForThread.mockResolvedValue(checkpoint);

			const suspension = await delegate.findOpenSuspension('agent-1', {
				threadId: 'ia-builder:t:agent-1',
			});

			expect(suspension).toEqual({
				runId: 'run-2',
				toolCallId: 'tc-2',
				toolName: 'confirm',
				suspendPayload: { message: 'Approve?' },
			});
			expect(agentsBuilderService.findOpenCheckpointForThread).toHaveBeenCalledWith(
				'agent-1',
				'ia-builder:t:agent-1',
			);
		});

		it('returns null when no open checkpoint exists', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.findOpenCheckpointForThread.mockResolvedValue(null);

			const suspension = await delegate.findOpenSuspension('agent-1', {
				threadId: 'ia-builder:t:agent-1',
			});

			expect(suspension).toBeNull();
		});

		it('rejects when the user lacks agent:update scope', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(
				delegate.findOpenSuspension('agent-1', { threadId: 'ia-builder:t:agent-1' }),
			).rejects.toThrow(ForbiddenError);
			expect(agentsBuilderService.findOpenCheckpointForThread).not.toHaveBeenCalled();
		});
	});

	describe('createAgent', () => {
		it('enforces agent:create scope and delegates to AgentsService', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsService.create.mockResolvedValue(mock<Agent>({ id: 'agent-9', name: 'New agent' }));

			const result = await delegate.createAgent('New agent');

			expect(agentsService.create).toHaveBeenCalledWith('project-1', 'New agent');
			expect(result).toEqual({ agentId: 'agent-9', projectId: 'project-1' });
		});

		it('rejects when the user lacks agent:create scope', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(delegate.createAgent('New agent')).rejects.toThrow(ForbiddenError);
			expect(agentsService.create).not.toHaveBeenCalled();
		});
	});
});

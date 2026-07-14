import type { CredentialProvider, StreamChunk } from '@n8n/agents';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import * as checkAccess from '@/permissions.ee/check-access';

import type { AgentsService } from '../agents.service';
import type { AgentsBuilderService } from '../builder/agents-builder.service';
import type { Agent } from '../entities/agent.entity';
import {
	INSTANCE_AI_BUILDER_ADDENDUM,
	InstanceAiBuilderDelegateAdapterService,
	NON_INTERACTIVE_EXCLUDED_TOOL_NAMES,
} from '../instance-ai-builder-delegate.adapter';

function setup() {
	const agentsService = mock<AgentsService>();
	const agentsBuilderService = mock<AgentsBuilderService>();

	const service = new InstanceAiBuilderDelegateAdapterService(agentsService, agentsBuilderService);

	const user = mock<User>({ id: 'user-1' });
	const credentialProvider = mock<CredentialProvider>();
	const delegate = service.createDelegate(user, 'project-1', credentialProvider);

	return {
		delegate,
		user,
		agentsService,
		agentsBuilderService,
		credentialProvider,
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

		it('builds the sub-agent session from the delegate session: thread id, model config, addendum, and excluded tools', async () => {
			const { delegate, agentsBuilderService, user, credentialProvider } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.buildAgent.mockReturnValue(asAsyncGenerator<StreamChunk>([]));

			await delegate.streamBuild('agent-1', 'hi', {
				threadId: 'ia-builder:t:agent-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
			});

			expect(agentsBuilderService.buildAgent).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				user,
				{
					threadId: 'ia-builder:t:agent-1',
					modelConfig: 'anthropic/claude-sonnet-host-resolved',
					instructionsAddendum: INSTANCE_AI_BUILDER_ADDENDUM,
					excludeTools: NON_INTERACTIVE_EXCLUDED_TOOL_NAMES,
				},
			);
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

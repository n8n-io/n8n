import { Container } from '@n8n/di';
import { AgentHitlWorkflowRepository } from '../../repositories/agent-hitl-workflow.repository';
import { mock } from 'vitest-mock-extended';
import type { User } from '@n8n/db';
import type { AgentHitlChannelConfiguration, AgentIntegrationConfig } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import { AgentChannelHitlService } from '../agent-channel-hitl.service';
import {
	ChatIntegrationRegistry,
	type AgentChatIntegration,
} from '../../integrations/agent-chat-integration';
import { AgentCredentialLookupService } from '../../integrations/agent-credential-lookup.service';
import { AgentRepository } from '../../repositories/agent.repository';
import type { ProjectAgent } from '../../entities/agent.entity';
import { slackHitl } from '../../integrations/platforms/slack/slack-hitl';
import { telegramHitl } from '../../integrations/platforms/telegram/telegram-hitl';
import { discordHitl } from '../../integrations/platforms/discord/discord-hitl';
import { expectProjectScopedAgentRoutes } from '../../__tests__/test-utils/controller-route-metadata';
import { AgentHitlChannelsController } from '../agent-hitl-channels.controller';

function setup(integrations: AgentIntegrationConfig[] = []) {
	const agents = mock<AgentRepository>();
	agents.findByIdAndProjectId.mockResolvedValue(mock<ProjectAgent>({ integrations }));
	const credentials = mock<AgentCredentialLookupService>();
	credentials.decryptForUser.mockResolvedValue({ accessToken: 'test' });
	const registry = new ChatIntegrationRegistry();
	for (const [type, hitl, credentialType] of [
		['slack', slackHitl, 'slackApi'],
		['telegram', telegramHitl, 'telegramApi'],
		['discord', discordHitl, 'discordBotApi'],
	] as const) {
		registry.register(
			mock<AgentChatIntegration>({
				type,
				hitl,
				displayLabel: type,
				credentialTypes: [credentialType],
			}),
		);
	}
	registry.register(mock<AgentChatIntegration>({ type: 'linear', hitl: { supported: false } }));
	const outbound = mock<OutboundHttp>();
	const service = new AgentChannelHitlService(agents, registry, credentials, outbound);
	return { service, agents, credentials, registry, outbound };
}
const slack: AgentIntegrationConfig = { type: 'slack', credentialId: 'slack-credential' };
const configuration: AgentHitlChannelConfiguration = {
	id: 'review',
	name: 'Review',
	method: 'channel',
	channel: 'slack',
	credentialId: 'slack-credential',
	recipient: { kind: 'user', id: 'U1', name: 'Reviewer' },
};

describe('Agent channel approval', () => {
	it('lists only connected and accessible supported channels', async () => {
		const { service, credentials, agents } = setup([
			slack,
			{ type: 'linear', credentialId: 'linear' },
			{ type: 'discord', credentialId: 'denied' },
		]);
		credentials.decryptForUser.mockImplementation(async (_user, _project, id) =>
			id === 'slack-credential' ? { accessToken: 'test' } : null,
		);

		const channels = await service.listChannels(mock<User>(), 'project', 'agent');
		expect(
			channels.map((channel) => ({ channel: channel.channel, credentialId: channel.credentialId })),
		).toEqual([{ channel: 'slack', credentialId: 'slack-credential' }]);
		expect(channels[0].fields[0].name).toBe('recipient');
		expect(channels[0].fields[0].type).toBe('search');
		expect(agents.findByIdAndProjectId).toHaveBeenCalledWith('agent', 'project');
	});
	it('rejects options for another Agent or an unavailable credential', async () => {
		const { service, credentials } = setup([slack]);
		const query = { channel: 'slack', credentialId: 'other', field: 'user', query: '' } as const;
		await expect(service.listOptions(mock<User>(), 'project', 'agent', query)).rejects.toThrow(
			'no longer connected',
		);
		expect(credentials.decryptForUser).not.toHaveBeenCalled();
		credentials.decryptForUser.mockResolvedValue(null);
		await expect(
			service.listOptions(mock<User>(), 'project', 'agent', {
				...query,
				credentialId: slack.credentialId,
			}),
		).rejects.toThrow('unavailable');
	});
	it('uses the connected Slack credential and the durable send-and-wait operation', () => {
		const { service } = setup([slack]);
		const workflow = service.buildWorkflow(configuration, [slack], 'caller');
		expect(workflow.id).toBe('caller');
		expect(workflow.nodes[1]).toMatchObject({
			type: 'n8n-nodes-base.slack',
			credentials: { slackApi: { id: slack.credentialId } },
			parameters: {
				operation: 'sendAndWait',
				responseType: 'approval',
				select: 'user',
				user: { mode: 'id', value: 'U1' },
				approvalOptions: { values: { approvalType: 'double' } },
				options: { appendAttribution: false },
			},
		});
		expect(workflow.nodes[1].parameters.options).not.toHaveProperty('limitWaitTime');
		expect(() => service.buildWorkflow(configuration, [], 'caller')).toThrow('no longer connected');
	});
	it('uses Telegram numeric IDs and rejects usernames', () => {
		if (!telegramHitl.supported) throw new Error('Expected Telegram support');
		const telegram = {
			...configuration,
			channel: 'telegram',
			recipient: { kind: 'user', id: '1234' },
		} as const;
		expect(telegramHitl.createNode(telegram)).toMatchObject({
			type: 'n8n-nodes-base.telegram',
			parameters: { chatId: '1234' },
		});
		expect(() =>
			telegramHitl.createNode({ ...telegram, recipient: { kind: 'user', id: '@name' } }),
		).toThrow('numeric');
	});
	it.each(['channel', 'user'] as const)('uses Discord %s destinations', (kind) => {
		if (!discordHitl.supported) throw new Error('Expected Discord support');
		expect(
			discordHitl.createNode({
				...configuration,
				channel: 'discord',
				guildId: '42',
				recipient: { kind, id: '1234' },
			}),
		).toMatchObject({
			type: 'n8n-nodes-base.discord',
			credentials: { discordBotApi: { id: configuration.credentialId } },
			parameters: {
				authentication: 'botToken',
				guildId: { value: '42' },
				sendTo: kind,
				[kind === 'user' ? 'userId' : 'channelId']: { value: '1234' },
			},
		});
	});
	expectProjectScopedAgentRoutes(AgentHitlChannelsController);
});

it('gives a conversational channel request a saved execution owner', async () => {
	const { service } = setup([slack]);
	const owners = mock<AgentHitlWorkflowRepository>();
	Container.set(AgentHitlWorkflowRepository, owners);
	try {
		owners.ensureExecutionOwner.mockResolvedValue('owner');
		const workflow = await service.prepareWorkflow(configuration, [slack], 'project', 'agent');
		expect(workflow.id).toBe('owner');
		expect(owners.ensureExecutionOwner).toHaveBeenCalledWith('project', 'agent');
		expect(workflow.nodes[1].type).toBe('n8n-nodes-base.slack');
	} finally {
		Container.reset();
	}
});

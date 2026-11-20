import {
	AGENT_PUBLISH_SEND_TARGETS_LIMIT,
	type AgentIntegrationConfig,
	type StoredAgentConfig,
} from '@n8n/api-types';

import { describePublishSendTargets } from '../agent-publish-send-targets';

const channelLabel = (type: string) => ({ slack: 'Slack', telegram: 'Telegram' })[type] ?? type;

describe('describePublishSendTargets', () => {
	it('lists connected channels, enabled tasks and MCP servers, then counts the tools', () => {
		const result = describePublishSendTargets({
			config: {
				// Only the number of enabled tools matters here.
				tools: [{}, {}, { enabled: false }] as StoredAgentConfig['tools'],
				tasks: [
					{ type: 'task', id: 'digest', enabled: true },
					{ type: 'task', id: 'paused', enabled: false },
					// No definition, so nothing runs.
					{ type: 'task', id: 'orphan', enabled: true },
				],
				mcpServers: [
					{
						name: 'Linear',
						url: 'https://mcp.linear.app',
						transport: 'streamableHttp',
						authentication: 'none',
					},
					{ name: 'Unfinished', url: '  ', transport: 'streamableHttp', authentication: 'none' },
				],
			},
			integrations: [
				{ type: 'slack', credentialId: 'cred-1' },
				// A second Slack workspace still reads as one channel.
				{ type: 'slack', credentialId: 'cred-2' },
				{ type: 'telegram', credentialId: '' },
				{ type: 'n8n_chat', credentialId: '' },
			] as AgentIntegrationConfig[],
			taskNames: new Map([['digest', 'Daily digest']]),
			channelLabel,
		});

		expect(result).toEqual({
			sendTargets: [
				{ kind: 'channel', name: 'Slack' },
				{ kind: 'task', name: 'Daily digest' },
				{ kind: 'mcp-server', name: 'Linear' },
				{ kind: 'tools', count: 2 },
			],
			moreSendTargets: 0,
		});
	});

	it('returns no targets for an agent that can send nothing', () => {
		expect(
			describePublishSendTargets({
				config: null,
				integrations: [{ type: 'n8n_chat', credentialId: '' }] as AgentIntegrationConfig[],
				taskNames: new Map(),
				channelLabel,
			}),
		).toEqual({ sendTargets: [], moreSendTargets: 0 });
	});

	it('keeps the tool count and counts the targets past the limit', () => {
		const tasks = Array.from({ length: AGENT_PUBLISH_SEND_TARGETS_LIMIT + 3 }, (_, index) => ({
			type: 'task' as const,
			id: `task-${index}`,
			enabled: true,
		}));

		const result = describePublishSendTargets({
			config: { tools: [{}] as StoredAgentConfig['tools'], tasks },
			integrations: [],
			taskNames: new Map(tasks.map((task) => [task.id, `Task ${task.id}`])),
			channelLabel,
		});

		expect(result.sendTargets).toHaveLength(AGENT_PUBLISH_SEND_TARGETS_LIMIT);
		expect(result.sendTargets.at(-1)).toEqual({ kind: 'tools', count: 1 });
		expect(result.moreSendTargets).toBe(4);
	});
});

import type { ChatIntegrationDescriptor } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiBuilderDelegate, OrchestrationContext } from '../../../types';
import { createListAgentCapabilitiesTool } from '../list-agent-capabilities.tool';

function makeContext(delegate: InstanceAiBuilderDelegate | undefined): OrchestrationContext {
	return {
		domainContext: delegate ? { builderDelegate: delegate } : {},
	} as unknown as OrchestrationContext;
}

const sampleChannels: ChatIntegrationDescriptor[] = [
	{
		type: 'slack',
		label: 'Slack',
		icon: 'slack',
		credentialTypes: ['slackApi'],
		capabilities: ['send messages'],
		useIntegrationWhen: ['the agent should reply in Slack'],
		useNodeToolWhen: ['only operating on Slack data'],
	},
	{
		type: 'telegram',
		label: 'Telegram',
		icon: 'telegram',
		credentialTypes: ['telegramApi'],
	},
];

describe('list-agent-capabilities tool', () => {
	it('returns the delegate channel list verbatim plus agent capabilities and limitations', async () => {
		const delegate = mock<InstanceAiBuilderDelegate>();
		delegate.listAgentCapabilities.mockResolvedValue(sampleChannels);

		const tool = createListAgentCapabilitiesTool(makeContext(delegate));
		const output = await executeTool<{
			channels: ChatIntegrationDescriptor[];
			agentCapabilities: string[];
			limitations: string[];
		}>(tool, {});

		expect(delegate.listAgentCapabilities).toHaveBeenCalledWith();
		expect(output.channels).toEqual(sampleChannels);
		expect(output.agentCapabilities.length).toBeGreaterThan(0);
		expect(output.agentCapabilities.some((c) => c.includes('MCP'))).toBe(true);
		expect(output.agentCapabilities.some((c) => c.includes('scheduled tasks'))).toBe(true);
		expect(output.limitations).toEqual([
			'Agents cannot create n8n workflows or data tables; attach existing workflows only.',
			'Chat channels must come from this list — any other channel is unsupported.',
		]);
	});

	it('throws when no builder delegate is wired (agents module inactive)', async () => {
		const tool = createListAgentCapabilitiesTool(makeContext(undefined));
		await expect(executeTool(tool, {})).rejects.toThrow(
			'Agent capabilities are not available on this instance.',
		);
	});

	it('returns an empty channel list but still surfaces agent capabilities when the registry has no public integrations', async () => {
		const delegate = mock<InstanceAiBuilderDelegate>();
		delegate.listAgentCapabilities.mockResolvedValue([]);

		const tool = createListAgentCapabilitiesTool(makeContext(delegate));
		const output = await executeTool<{
			channels: ChatIntegrationDescriptor[];
			agentCapabilities: string[];
			limitations: string[];
		}>(tool, {});

		expect(output.channels).toEqual([]);
		// Agent capabilities and limitations are static guidance, present regardless of channel count.
		expect(output.agentCapabilities.length).toBeGreaterThan(0);
		expect(output.limitations).toHaveLength(2);
	});
});

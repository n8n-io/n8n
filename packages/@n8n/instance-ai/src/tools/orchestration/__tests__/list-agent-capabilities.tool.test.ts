import type { ChatIntegrationDescriptor } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type {
	AgentCapabilitiesSummary,
	InstanceAiBuilderDelegate,
	OrchestrationContext,
} from '../../../types';
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

const sampleSummary: AgentCapabilitiesSummary = {
	channels: sampleChannels,
	agentCapabilities: [
		'Call tools to take actions and query services.',
		'Connect to MCP servers to expose external tool catalogs.',
		'Run scheduled tasks without a chat trigger.',
	],
	limitations: [
		'Agents cannot create n8n workflows or data tables; attach existing workflows only.',
		'Chat channels must come from this list — any other channel is unsupported.',
	],
};

describe('list-agent-capabilities tool', () => {
	it('returns the delegate summary verbatim (channels, agentCapabilities, limitations)', async () => {
		const delegate = mock<InstanceAiBuilderDelegate>();
		delegate.listAgentCapabilities.mockResolvedValue(sampleSummary);

		const tool = createListAgentCapabilitiesTool(makeContext(delegate));
		const output = await executeTool<AgentCapabilitiesSummary>(tool, {});

		expect(delegate.listAgentCapabilities).toHaveBeenCalledWith();
		// The tool passes the delegate's summary through unchanged — it never
		// hardcodes capability info, so the agents module stays the source of truth.
		expect(output).toEqual(sampleSummary);
		expect(output.channels).toEqual(sampleChannels);
		expect(output.agentCapabilities).toBe(sampleSummary.agentCapabilities);
		expect(output.limitations).toBe(sampleSummary.limitations);
	});

	it('throws when no builder delegate is wired (agents module inactive)', async () => {
		const tool = createListAgentCapabilitiesTool(makeContext(undefined));
		await expect(executeTool(tool, {})).rejects.toThrow(
			'Agent capabilities are not available on this instance.',
		);
	});

	it('passes an empty channel list through unchanged when the registry has no public integrations', async () => {
		const delegate = mock<InstanceAiBuilderDelegate>();
		const emptySummary: AgentCapabilitiesSummary = {
			channels: [],
			agentCapabilities: ['Call tools to take actions.'],
			limitations: ['Chat channels must come from this list.'],
		};
		delegate.listAgentCapabilities.mockResolvedValue(emptySummary);

		const tool = createListAgentCapabilitiesTool(makeContext(delegate));
		const output = await executeTool<AgentCapabilitiesSummary>(tool, {});

		// The tool surfaces whatever the delegate returned, including an empty
		// channel list, without substituting hardcoded capabilities.
		expect(output).toEqual(emptySummary);
		expect(output.channels).toEqual([]);
	});
});

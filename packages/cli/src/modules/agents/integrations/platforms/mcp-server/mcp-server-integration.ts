import { AGENT_MCP_INTEGRATION_TYPE } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';

import { AgentChatIntegration } from '../../agent-chat-integration';
import type { IntegrationActionDefinition } from '../../integration-tool-types';

/**
 * The MCP server channel: the published agent is an MCP server at its own URL.
 * An MCP client, such as Claude or Cursor, signs in with the n8n account of its
 * user over OAuth and calls the agent as a tool. It has no platform runtime and
 * no credential.
 */
@Service()
export class McpServerIntegration extends AgentChatIntegration {
	readonly type = AGENT_MCP_INTEGRATION_TYPE;

	readonly credentialTypes: string[] = [];

	readonly displayLabel = 'MCP server';

	readonly displayIcon = 'mcp';

	readonly requiresChatInstance = false;

	/** There is one URL for each agent, so a request cannot tell two connections apart. */
	readonly singleConnectionPerAgent = true;

	/** The reply is the tool result, so the channel has no action tool. */
	readonly actionToolDefinitions: IntegrationActionDefinition[] = [];

	readonly builderGuidance = {
		capabilities: [
			'Let users of this n8n instance call the published agent from an MCP client, such as Claude, Cursor, or VS Code.',
			'Continue a conversation when the client sends back the conversation ID.',
			'Ask the MCP client user to approve an action that needs approval.',
		],
		useIntegrationWhen: [
			'The user wants to use the agent from an AI assistant or IDE that supports MCP.',
		],
		useNodeToolWhen: [
			'The agent itself must call an external MCP server. Use an MCP tool for that.',
		],
	};

	/** The MCP server channel has no platform context to store on a message. */
	buildOriginDraft() {
		return undefined;
	}

	/** Conversations are scoped to one n8n user and one conversation ID, so episodic memory stays off. */
	resolveEpisodicScope() {
		return null;
	}

	async createAdapter(): Promise<unknown> {
		throw new UnexpectedError('The MCP server integration has no platform adapter.');
	}
}

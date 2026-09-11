import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import {
	AgentChatIntegration,
	type PlatformActionParams,
	type PlatformContextQueryParams,
} from '../agent-chat-integration';
import { unsupportedAction, unsupportedQuery } from '../integration-helpers';
import type { IntegrationActionResult } from '../integration-tools';

export type OpenAiCompatibleChannelType = 'openwebui' | 'librechat';

export function isOpenAiCompatibleChannelType(type: string): type is OpenAiCompatibleChannelType {
	return type === 'openwebui' || type === 'librechat';
}

/**
 * Shared implementation for the OpenAI-compatible chat channels (OpenWebUI,
 * LibreChat): one `POST /v1/chat/completions` surface, reached over a plain
 * synchronous HTTP request/response, not a bot with its own webhook or
 * gateway connection. `createAdapter` is unreachable because
 * `requiresChatInstance` is false, same as the in-app n8n chat.
 *
 * No `supportedComponents`: neither client renders interactive cards, and
 * there is no per-call "current message"/"subject" the way a Slack thread
 * or Linear issue has (each call is a fresh, throwaway thread), so both the
 * action and context-query tool surfaces are empty rather than declared and
 * then always rejected.
 *
 * Credential-less (`credentialTypes = []`): the channel stores no secret. Its
 * bearer token is derived from the agent id and a synthetic connection id (see
 * OpenAiCompatibleChatService.deriveToken and agent-connection-channels.md 5.5),
 * so there is no credential to connect, decrypt, or manage.
 */
abstract class OpenAiCompatibleChatIntegrationBase extends AgentChatIntegration {
	readonly credentialTypes = [];

	readonly requiresChatInstance = false;

	readonly hasNoRuntimeProcess = true;

	readonly contextToolDefinitions = [];

	readonly actionToolDefinitions = [];

	async createAdapter(): Promise<unknown> {
		throw new UnexpectedError(`The ${this.displayLabel} integration has no platform adapter.`);
	}

	async executeAction(params: PlatformActionParams): Promise<IntegrationActionResult | undefined> {
		return unsupportedAction(this.type, params.action);
	}

	async executeContextQuery(params: PlatformContextQueryParams): Promise<unknown> {
		return unsupportedQuery(this.type, params.query);
	}
}

@Service()
export class OpenWebUiIntegration extends OpenAiCompatibleChatIntegrationBase {
	readonly type = 'openwebui';

	readonly displayLabel = 'OpenWebUI';

	readonly displayIcon = 'message-square';
}

@Service()
export class LibreChatIntegration extends OpenAiCompatibleChatIntegrationBase {
	readonly type = 'librechat';

	readonly displayLabel = 'LibreChat';

	readonly displayIcon = 'message-square';
}

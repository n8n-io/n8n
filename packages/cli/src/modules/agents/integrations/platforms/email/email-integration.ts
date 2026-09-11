import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';

import { AgentRepository } from '../../../repositories/agent.repository';
import {
	AgentChatIntegration,
	type AgentChannelPreconditionContext,
	type AgentChatIntegrationContext,
	type WebhookRequestContext,
	type WebhookRequestResolution,
} from '../../agent-chat-integration';
import { assertCredentialNotClaimed } from '../../credential-claim';
import { loadChatSdk } from '../../esm-loader';
import { EMAIL_RESPOND_ACTION_TOOL_DEFINITION } from '../../integration-tool-definitions';
import { AgentEmailServiceClient } from './agent-email-service-client';
import { EmailAdapter } from './email-adapter';

@Service()
export class EmailIntegration extends AgentChatIntegration {
	readonly type = 'email';

	readonly credentialTypes = ['agentEmailApi'];

	readonly displayLabel = 'Email';

	readonly displayIcon = 'mail';

	readonly disableStreaming = true;

	readonly actionToolDefinitions = [EMAIL_RESPOND_ACTION_TOOL_DEFINITION];

	readonly actionToolGuidance = [
		'To send files in the current email thread, call respond with message.attachments and stop after it succeeds. Do not also write a normal final reply.',
	];

	readonly builderGuidance = {
		capabilities: [
			'Receive emails, including file attachments, as agent triggers.',
			'Reply in the same email thread with conversation memory and file attachments.',
		],
		useIntegrationWhen: [
			'People should be able to email the agent and continue an asynchronous conversation.',
		],
		useNodeToolWhen: [
			'Email is only an action inside a workflow rather than the conversation channel for the agent.',
		],
	};

	constructor(
		private readonly serviceClient: AgentEmailServiceClient,
		private readonly agentRepository: AgentRepository,
	) {
		super();
	}

	async assertStartupPreconditions(ctx: AgentChannelPreconditionContext): Promise<void> {
		await assertCredentialNotClaimed(this.agentRepository, this.displayLabel, this.type, ctx);
	}

	async onBeforeConnect(ctx: AgentChatIntegrationContext): Promise<void> {
		await this.assertStartupPreconditions(ctx);
	}

	resolveWebhookRequest(request: WebhookRequestContext): WebhookRequestResolution {
		if (
			!isRecord(request.body) ||
			!isRecord(request.body.message) ||
			typeof request.body.message.inbox_id !== 'string'
		) {
			return { type: 'no_match' };
		}
		return { type: 'select', connectionSelector: request.body.message.inbox_id };
	}

	matchesWebhookConnection(
		credential: Record<string, unknown>,
		connectionSelector: string,
	): boolean {
		return credential.channelId === connectionSelector;
	}

	async createAdapter(ctx: AgentChatIntegrationContext): Promise<unknown> {
		const channelId = this.requiredCredentialString(ctx.credential, 'channelId');
		const callbackSecret = this.requiredCredentialString(ctx.credential, 'callbackSecret');
		const { Message } = await loadChatSdk();

		return new EmailAdapter({
			channelId,
			callbackSecret,
			serviceClient: this.serviceClient,
			Message,
		});
	}

	private requiredCredentialString(
		credential: Record<string, unknown>,
		key: 'channelId' | 'callbackSecret',
	): string {
		const value = credential[key];
		if (typeof value !== 'string' || !value) {
			throw new Error(`Agent Email credential is missing ${key}`);
		}
		return value;
	}
}

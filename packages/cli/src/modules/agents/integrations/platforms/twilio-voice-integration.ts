import type { AgentIntegrationConfig, AgentTwilioVoiceIntegrationSettings } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { AgentRepository } from '../../repositories/agent.repository';
import {
	AgentChatIntegration,
	type AgentChatIntegrationContext,
	type BridgeExecutionContext,
	type BridgeMessageContextParams,
	type WebhookRequestContext,
	type WebhookRequestResolution,
} from '../agent-chat-integration';
import { loadChatSdk } from '../esm-loader';
import { TwilioVoiceAdapter, TwilioVoiceClient } from './twilio-voice-adapter';

@Service()
export class TwilioVoiceIntegration extends AgentChatIntegration {
	readonly type = 'twilioVoice';

	readonly credentialTypes = ['twilioApi'];

	readonly displayLabel = 'Twilio Voice';

	readonly displayIcon = 'mic';

	readonly disableStreaming = true;

	readonly builderGuidance = {
		capabilities: [
			'Receive inbound phone calls through a Twilio number.',
			'Use speech input and read the agent response back to the caller.',
		],
		useIntegrationWhen: [
			'The agent should be available through an inbound phone call.',
			'The caller should have a turn-based voice conversation with the agent.',
		],
		useNodeToolWhen: ['Twilio is only needed to send a message or start a call from a workflow.'],
	};

	private readonly httpClient;

	constructor(
		outboundHttp: OutboundHttp,
		private readonly agentRepository: AgentRepository,
	) {
		super();
		this.httpClient = outboundHttp.requests({
			useDefaultSsrfPolicy: 'unsafe', // Twilio API requests use a fixed public host.
		});
	}

	validateConfig(integration: AgentIntegrationConfig): void {
		if (integration.type !== this.type || !integration.settings) {
			throw new BadRequestError('Twilio Voice integration settings are required.');
		}
	}

	resolveWebhookRequest({ body }: WebhookRequestContext): WebhookRequestResolution {
		if (!body || typeof body !== 'object' || !('AccountSid' in body)) return { type: 'no_match' };
		const accountSid = body.AccountSid;
		return typeof accountSid === 'string' && accountSid
			? { type: 'select', connectionSelector: accountSid }
			: { type: 'no_match' };
	}

	matchesWebhookConnection(credential: Record<string, unknown>, accountSid: string): boolean {
		return credential.accountSid === accountSid;
	}

	async onBeforeConnect(ctx: AgentChatIntegrationContext): Promise<void> {
		const settings = this.settings(ctx.integration);
		const client = this.client(ctx.credential);
		const phoneNumber = await client.getPhoneNumber(settings.phoneNumber);
		if (!phoneNumber) {
			throw new BadRequestError(
				'This Twilio account does not contain the selected phone number. Check the number and try again.',
			);
		}

		const claimed = await this.agentRepository.findByTwilioVoicePhoneNumber(
			settings.phoneNumber,
			ctx.projectId,
			ctx.agentId,
		);
		if (claimed.length > 0) {
			throw new BadRequestError(
				`This Twilio number is already connected to agent "${claimed[0].name}". Disconnect it there and try again.`,
			);
		}

		const webhookUrl = ctx.webhookUrlFor(this.type);
		if (phoneNumber.voice_url && phoneNumber.voice_url !== webhookUrl) {
			throw new BadRequestError(
				'This Twilio number already has a Voice URL. Remove it in Twilio and try again.',
			);
		}

		const state = await this.agentRepository.findIntegrationState(ctx.agentId);
		const previous = state?.integrations?.find(
			(integration) =>
				integration.type === this.type && integration.credentialId === ctx.credentialId,
		);
		if (previous?.type === this.type && previous.settings.phoneNumber !== settings.phoneNumber) {
			const previousPhoneNumber = await client.getPhoneNumber(previous.settings.phoneNumber);
			if (previousPhoneNumber?.voice_url === webhookUrl) {
				await client.setVoiceUrl(previousPhoneNumber.sid, '');
			}
		}
	}

	async onAfterConnect(ctx: AgentChatIntegrationContext): Promise<void> {
		const settings = this.settings(ctx.integration);
		const client = this.client(ctx.credential);
		const phoneNumber = await client.getPhoneNumber(settings.phoneNumber);
		if (!phoneNumber) throw new Error('The configured Twilio phone number is no longer available.');
		await client.setVoiceUrl(phoneNumber.sid, ctx.webhookUrlFor(this.type));
	}

	async onBeforeDisconnect(ctx: AgentChatIntegrationContext): Promise<void> {
		const settings = this.settings(ctx.integration);
		const state = await this.agentRepository.findIntegrationState(ctx.agentId);
		const replacementIsActive =
			state !== null &&
			state.activeVersionId !== null &&
			state.integrations?.some(
				(integration) =>
					integration.type === this.type &&
					integration.settings.phoneNumber === settings.phoneNumber,
			);
		if (replacementIsActive) return;

		const client = this.client(ctx.credential);
		const phoneNumber = await client.getPhoneNumber(settings.phoneNumber);
		if (phoneNumber?.voice_url === ctx.webhookUrlFor(this.type)) {
			await client.setVoiceUrl(phoneNumber.sid, '');
		}
	}

	async createAdapter(ctx: AgentChatIntegrationContext): Promise<unknown> {
		const settings = this.settings(ctx.integration);
		const { accountSid, authToken } = this.auth(ctx.credential);
		const chatSdk = await loadChatSdk();
		return new TwilioVoiceAdapter({
			accountSid,
			authToken,
			phoneNumber: settings.phoneNumber,
			allowedCallers: settings.allowedCallers,
			webhookUrl: ctx.webhookUrlFor(this.type),
			// HACK: disable signature verification for testing
			verifySignature: false,
			httpClient: this.httpClient,
			chatSdk,
		});
	}

	async createBridgeExecutionContext(
		_params: BridgeMessageContextParams,
	): Promise<BridgeExecutionContext> {
		return {
			platformAgentContext: {},
			historyContext:
				'You are speaking to the user on a phone call. Keep the response concise and easy to understand when read aloud.',
			forceBuffered: true,
		};
	}

	private settings(integration: AgentIntegrationConfig): AgentTwilioVoiceIntegrationSettings {
		if (integration.type !== this.type) throw new Error('Invalid Twilio Voice integration.');
		return integration.settings;
	}

	private client(credential: Record<string, unknown>): TwilioVoiceClient {
		const { accountSid, authToken } = this.auth(credential);
		return new TwilioVoiceClient(accountSid, authToken, this.httpClient);
	}

	private auth(credential: Record<string, unknown>): { accountSid: string; authToken: string } {
		if (credential.authType === 'apiKey') {
			throw new BadRequestError(
				'Twilio Voice requires an Auth Token credential so n8n can verify incoming calls.',
			);
		}
		const { accountSid, authToken } = credential;
		if (
			typeof accountSid !== 'string' ||
			!accountSid ||
			typeof authToken !== 'string' ||
			!authToken
		) {
			throw new BadRequestError('The Twilio credential is missing an Account SID or Auth Token.');
		}
		return { accountSid, authToken };
	}
}

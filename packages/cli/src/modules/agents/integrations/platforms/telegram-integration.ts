import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { Thread } from 'chat';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { UrlService } from '@/services/url.service';

import { AgentRepository } from '../../repositories/agent.repository';
import { AgentChatIntegration, type AgentChatIntegrationContext } from '../agent-chat-integration';
import type { SuspendComponent } from '../component-mapper';
import { loadTelegramAdapter } from '../esm-loader';

/**
 * Telegram platform integration.
 *
 * Two capability flags are enabled here because of Telegram constraints:
 * - {@link needsShortCallbackData} — `callback_data` is capped at 64 bytes, so the
 *   bridge stores full payloads in a CallbackStore and emits short 8-char keys as
 *   button IDs.
 * - {@link disableStreaming} — streaming Markdown edits are unstable: intermediate
 *   frames carry half-formed markup that Telegram rejects or renders inconsistently.
 *   The bridge buffers agent output and posts it as a single message per flush,
 *   guaranteeing well-formed Markdown on every post.
 *
 * The adapter runs in webhook mode when a public `WEBHOOK_URL` is configured,
 * otherwise it falls back to polling for local dev.
 */
@Service()
export class TelegramIntegration extends AgentChatIntegration {
	readonly type = 'telegram';

	readonly credentialTypes = ['telegramApi'];

	readonly displayLabel = 'Telegram';

	readonly displayIcon = 'telegram';

	readonly supportedComponents = ['section', 'button', 'divider', 'fields'];

	readonly needsShortCallbackData = true;

	readonly disableStreaming = true;

	readonly formatThreadId = {
		fromSdk: (thread: Thread<unknown, unknown>) => {
			const adapter = thread.adapter;
			const botUserId = adapter.botUserId;
			if (!botUserId) {
				throw new Error('Telegram bot user ID is not set');
			}
			// thread.id is simply user id, which means connecting agent to another bot user will result in the same thread id
			return `chat:${botUserId}-${thread.id}`;
		},
		toSdk: (threadId: string) => {
			if (!threadId.includes('-')) {
				return threadId;
			}
			return threadId.split('-').slice(1).join('-');
		},
	};

	constructor(
		private readonly logger: Logger,
		private readonly urlService: UrlService,
		private readonly agentRepository: AgentRepository,
	) {
		super();
	}

	async createAdapter(ctx: AgentChatIntegrationContext): Promise<unknown> {
		const botToken = this.extractBotToken(ctx.credential);
		const mode = this.getMode();
		const { createTelegramAdapter } = await loadTelegramAdapter();
		return createTelegramAdapter({ botToken, mode });
	}

	/**
	 * In polling mode the Chat SDK adapter long-polls Telegram, which must be
	 * done by exactly one main — otherwise multiple instances race for the same
	 * updates. Webhook mode is safe on every main.
	 */
	override requiresLeader(): boolean {
		return this.getMode() === 'polling';
	}

	/**
	 * Block the connect flow if this Telegram credential is already claimed by
	 * another agent in our DB. We deliberately don't probe Telegram for an
	 * existing webhook here — `onAfterConnect` overwrites whatever URL Telegram
	 * has on file, so a stale webhook from elsewhere isn't a connect blocker.
	 */
	async onBeforeConnect(ctx: AgentChatIntegrationContext): Promise<void> {
		const others = await this.agentRepository.findByIntegrationCredential(
			this.type,
			ctx.credentialId,
			ctx.projectId,
			ctx.agentId,
		);
		if (others.length > 0) {
			throw new ConflictError(
				`Telegram credential is already connected to agent "${others[0].name}"`,
			);
		}
	}

	async onAfterConnect(ctx: AgentChatIntegrationContext): Promise<void> {
		if (this.getMode() !== 'webhook') return;
		const botToken = this.extractBotToken(ctx.credential);
		const webhookUrl = ctx.webhookUrlFor('telegram');
		const resp = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ url: webhookUrl }),
		});
		if (!resp.ok) {
			throw new Error(`Failed to register Telegram webhook: ${await resp.text()}`);
		}
		this.logger.info(`[TelegramIntegration] Webhook registered: ${webhookUrl}`);
	}

	normalizeComponents(components: SuspendComponent[]): SuspendComponent[] {
		const normalized: SuspendComponent[] = [];
		for (const c of components) {
			switch (c.type) {
				case 'select':
				case 'radio_select':
					// Convert select options to individual buttons
					for (const opt of c.options ?? []) {
						normalized.push({ type: 'button', label: opt.label, value: opt.value });
					}
					break;
				case 'image':
					// Convert image to a section with a markdown link
					if (c.url) {
						normalized.push({ type: 'section', text: `[${c.altText ?? 'Image'}](${c.url})` });
					}
					break;
				default:
					normalized.push(c);
			}
		}
		return normalized;
	}

	/** Webhook when we have a public URL, polling otherwise (local dev). */
	private getMode(): 'webhook' | 'polling' {
		const baseUrl = this.urlService.getWebhookBaseUrl();
		const isPublic = baseUrl.startsWith('https://') && !baseUrl.includes('localhost');
		return isPublic ? 'webhook' : 'polling';
	}

	private extractBotToken(credential: Record<string, unknown>): string {
		const token = credential.accessToken;
		if (typeof token === 'string' && token) {
			return token;
		}
		throw new Error(
			'Could not extract a bot token from the Telegram credential. ' +
				'Please ensure the credential has a valid access token from BotFather.',
		);
	}
}

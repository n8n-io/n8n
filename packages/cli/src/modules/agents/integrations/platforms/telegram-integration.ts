import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { UrlService } from '@/services/url.service';

import type { SuspendComponent } from '../component-mapper';
import { loadTelegramAdapter } from '../esm-loader';
import { Integration, type IntegrationContext } from '../integration';

/**
 * Telegram platform integration.
 *
 * Telegram's Bot API caps callback_data at 64 bytes, so {@link needsShortCallbackData}
 * is true — the bridge stores full payloads in a CallbackStore and emits short
 * 8-char keys as button IDs. The adapter runs in webhook mode when a public
 * `WEBHOOK_URL` is configured, otherwise it falls back to polling for local dev.
 */
@Service()
export class TelegramIntegration extends Integration {
	readonly type = 'telegram';

	readonly credentialTypes = ['telegramApi'];

	readonly supportedComponents = ['section', 'button', 'divider', 'fields'];

	readonly description =
		'Use this tool when you need to present rich interactive UI in Telegram. Available: buttons, text sections, ' +
		'dividers, key-value fields. For multiple choices, use one button per option. ' +
		"The user's response (button click) is returned to you.";

	readonly needsShortCallbackData = true;

	constructor(
		private readonly logger: Logger,
		private readonly urlService: UrlService,
	) {
		super();
	}

	async createAdapter(ctx: IntegrationContext): Promise<unknown> {
		const botToken = this.extractBotToken(ctx.credential);
		const mode = this.getMode();
		const { createTelegramAdapter } = await loadTelegramAdapter();
		return createTelegramAdapter({ botToken, mode });
	}

	async onAfterConnect(ctx: IntegrationContext): Promise<void> {
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

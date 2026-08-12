import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { SocketModeClient } from '@slack/socket-mode';
import { OperationalError } from 'n8n-workflow';

import { SlackCommsConfig } from './slack-comms.config';
import { SlackInstallProvider } from './slack-install.provider';

type EnvelopeHandler = (body: unknown) => Promise<void>;

interface SlackSocketEnvelope {
	ack: () => Promise<void>;
	body: unknown;
	type: string;
	retry_num?: number;
}

interface StartHandlers {
	onEvent: EnvelopeHandler;
	onInteractivity: EnvelopeHandler;
	resolveBotUserId?: () => Promise<string>;
}

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function extractEventId(body: unknown): string | null {
	if (!isRecord(body)) return null;
	return readString(body.event_id);
}

function extractMessageTs(body: unknown): string | null {
	if (!isRecord(body) || !isRecord(body.event)) return null;
	return readString(body.event.ts);
}

@Service()
export class SlackSocketService {
	private client: SocketModeClient | undefined;

	private readonly seenEventIds = new Map<string, number>();

	private readonly seenMessageTs = new Map<string, number>();

	constructor(
		private readonly config: SlackCommsConfig,
		private readonly installProvider: SlackInstallProvider,
		private readonly logger: Logger,
	) {}

	async start(handlers: StartHandlers): Promise<void> {
		if (!this.config.appToken || !this.config.botToken) {
			this.logger.debug('Slack comms not configured, skipping socket');
			return;
		}

		if (handlers.resolveBotUserId) {
			const botUserId = await handlers.resolveBotUserId();
			this.installProvider.setBotUserId(botUserId);
		}

		const { SocketModeClient } = await import('@slack/socket-mode');
		const client = new SocketModeClient({ appToken: this.config.appToken });

		client.on(
			'slack_event',
			async (envelope: SlackSocketEnvelope) =>
				await this.handleEnvelope(envelope, handlers).catch((error: unknown) => {
					this.logger.warn('Slack envelope handling failed', { error });
				}),
		);

		try {
			await client.start();
		} catch (error) {
			throw new OperationalError('Failed to connect Slack socket mode client', { cause: error });
		}

		this.client = client;
		this.logger.info('Slack comms socket connected');
	}

	async shutdown(): Promise<void> {
		if (!this.client) return;
		await this.client.disconnect();
		this.client = undefined;
	}

	private async handleEnvelope(
		envelope: SlackSocketEnvelope,
		handlers: Pick<StartHandlers, 'onEvent' | 'onInteractivity'>,
	): Promise<void> {
		await envelope.ack();
		if (this.isDuplicate(envelope.body)) return;
		const handler = envelope.type === 'interactive' ? handlers.onInteractivity : handlers.onEvent;
		await handler(envelope.body);
	}

	private isDuplicate(body: unknown): boolean {
		const now = Date.now();
		this.pruneStale(this.seenEventIds, now);
		this.pruneStale(this.seenMessageTs, now);

		let duplicate = false;

		const eventId = extractEventId(body);
		if (eventId !== null) {
			if (this.seenEventIds.has(eventId)) duplicate = true;
			else this.seenEventIds.set(eventId, now);
		}

		const messageTs = extractMessageTs(body);
		if (messageTs !== null) {
			if (this.seenMessageTs.has(messageTs)) duplicate = true;
			else this.seenMessageTs.set(messageTs, now);
		}

		return duplicate;
	}

	private pruneStale(seen: Map<string, number>, now: number): void {
		for (const [id, at] of seen) {
			if (now - at > DEDUPE_WINDOW_MS) seen.delete(id);
		}
	}
}

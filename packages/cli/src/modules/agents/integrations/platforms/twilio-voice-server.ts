import { Logger } from '@n8n/backend-common';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { Server as HttpServer } from 'http';
import type { Duplex } from 'stream';
import { Server as WebSocketServer } from 'ws';

import { ChatIntegrationService } from '../chat-integration.service';
import { TWILIO_VOICE_RELAY_PATH_SUFFIX, TwilioVoiceAdapter } from './twilio-voice-adapter';
import {
	TwilioVoiceSessionStore,
	type TwilioVoiceSessionTicket,
} from './twilio-voice-session-store';

@Service()
export class TwilioVoiceServer {
	private readonly wsServer = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });

	constructor(
		private readonly chatIntegrations: ChatIntegrationService,
		private readonly sessions: TwilioVoiceSessionStore,
		private readonly logger: Logger,
	) {}

	setup(server: HttpServer): void {
		server.on('upgrade', (request, socket, head) => {
			const url = new URL(request.url ?? '', 'http://localhost');
			if (!url.pathname.endsWith(TWILIO_VOICE_RELAY_PATH_SUFFIX)) return;

			void this.authorize(request.headers['x-twilio-signature'], url, socket)
				.then((authorized) => {
					if (!authorized) return;
					this.wsServer.handleUpgrade(request, socket, head, (webSocket) => {
						authorized.adapter.handleConversationRelay(webSocket, authorized.ticket);
					});
				})
				.catch((error: unknown) => {
					this.logger.error('[TwilioVoice] WebSocket upgrade failed', { error });
					socket.destroy();
				});
		});
	}

	private async authorize(
		signatureHeader: string | string[] | undefined,
		url: URL,
		socket: Duplex,
	): Promise<{ adapter: TwilioVoiceAdapter; ticket: TwilioVoiceSessionTicket } | undefined> {
		const sessionId = url.searchParams.get('session');
		const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
		if (!sessionId || !signature) {
			socket.destroy();
			return undefined;
		}

		const ticket = await this.sessions.get(sessionId);
		if (!ticket) {
			socket.destroy();
			return undefined;
		}

		const adapter = this.chatIntegrations.getAdapter(
			ticket.agentId,
			'twilioVoice',
			ticket.credentialId,
		);
		if (
			!(adapter instanceof TwilioVoiceAdapter) ||
			!adapter.verifyConversationRelaySignature(adapter.conversationRelayUrl(sessionId), signature)
		) {
			socket.destroy();
			return undefined;
		}

		if (!(await this.sessions.take(sessionId))) {
			socket.destroy();
			return undefined;
		}
		return { adapter, ticket };
	}

	@OnShutdown()
	shutdown(): void {
		this.wsServer.close();
	}
}

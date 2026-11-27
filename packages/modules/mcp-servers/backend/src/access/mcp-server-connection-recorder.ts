import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';

import type { McpServer } from '../database/entities/mcp-server.entity';
import { OAuthClientNamePort } from '../tools/oauth-client-name-port';
import { McpServerConnectionRepository } from './mcp-server-connection.repository';

/** The last use changes at most one time in this period, to limit the database writes. */
const LAST_USE_INTERVAL_MS = 60_000;

/** The length of the `clientName` column. A client chooses its own name, of any length. */
const CLIENT_NAME_MAX_LENGTH = 255;

/** A client that did not register a name. */
const UNKNOWN_CLIENT_NAME = 'Unknown client';

/**
 * Keeps one row for each person and AI client on a server, with the first and the last use.
 * The runtime calls it after the admission accepted a request.
 */
@Service()
export class McpServerConnectionRecorder {
	constructor(
		private readonly connections: McpServerConnectionRepository,
		private readonly clients: OAuthClientNamePort,
		private readonly events: EventService,
	) {}

	async recordUse(server: McpServer, userId: string, clientId: string): Promise<void> {
		const key = { serverId: server.id, userId, oauthClientId: clientId };
		const now = new Date();
		const existing = await this.connections.findForClient(key);
		if (existing) {
			if (now.getTime() - existing.lastUsedAt.getTime() < LAST_USE_INTERVAL_MS) return;
			// The condition stops a second main instance from writing in the same minute.
			await this.connections.updateLastUse(
				key,
				now,
				new Date(now.getTime() - LAST_USE_INTERVAL_MS),
			);
			return;
		}

		const registered = await this.clients.getName(clientId);
		// Cut by code point, so a character outside the basic plane stays whole.
		const clientName = Array.from(registered || UNKNOWN_CLIENT_NAME)
			.slice(0, CLIENT_NAME_MAX_LENGTH)
			.join('');
		if (await this.connections.insertFirstUse(key, clientName, now)) {
			this.events.emit('mcp-server-connected', { serverId: server.id, userId, clientName });
		}
	}
}

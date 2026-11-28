import type { EventService } from '@n8n/backend-services';
import { mock } from 'vitest-mock-extended';

import type { McpServerConnection } from '../../database/entities/mcp-server-connection.entity';
import type { McpServer } from '../../database/entities/mcp-server.entity';
import type { OAuthClientNamePort } from '../../tools/oauth-client-name-port';
import { McpServerConnectionRecorder } from '../mcp-server-connection-recorder';
import type { McpServerConnectionRepository } from '../mcp-server-connection.repository';

const NOW = new Date('2026-11-25T12:00:00.000Z');
const server = mock<McpServer>({ id: 'server-1' });
const key = { serverId: 'server-1', userId: 'user-1', oauthClientId: 'client-1' };

function setup({
	existing = null,
	name,
	inserted = true,
}: {
	existing?: { lastUsedAt: Date } | null;
	name?: string;
	inserted?: boolean;
} = {}) {
	const connections = mock<McpServerConnectionRepository>();
	const clients = mock<OAuthClientNamePort>();
	const events = mock<EventService>();
	connections.findForClient.mockResolvedValue(
		existing ? mock<McpServerConnection>({ ...key, ...existing }) : null,
	);
	connections.insertFirstUse.mockResolvedValue(inserted);
	clients.getName.mockResolvedValue(name);
	return {
		connections,
		clients,
		events,
		recorder: new McpServerConnectionRecorder(connections, clients, events),
	};
}

describe('McpServerConnectionRecorder', () => {
	beforeEach(() => {
		vi.useFakeTimers({ now: NOW });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('the first use', () => {
		it('writes the registered client name and sends "connected"', async () => {
			const { recorder, connections, events } = setup({ name: 'Claude Code' });

			await recorder.recordUse(server, 'user-1', 'client-1');

			expect(connections.insertFirstUse).toHaveBeenCalledWith(key, 'Claude Code', NOW);
			expect(events.emit).toHaveBeenCalledWith('mcp-server-connected', {
				serverId: 'server-1',
				userId: 'user-1',
				clientName: 'Claude Code',
			});
		});

		it.each([
			['no registered name', undefined],
			['an empty name', ''],
		])('writes "Unknown client" for %s', async (_case, name) => {
			const { recorder, connections } = setup({ name });

			await recorder.recordUse(server, 'user-1', 'client-1');

			expect(connections.insertFirstUse).toHaveBeenCalledWith(key, 'Unknown client', NOW);
		});

		it('cuts a long name to the 255 characters of the column', async () => {
			const { recorder, connections } = setup({ name: 'a'.repeat(300) });

			await recorder.recordUse(server, 'user-1', 'client-1');

			expect(connections.insertFirstUse).toHaveBeenCalledWith(key, 'a'.repeat(255), NOW);
		});

		it('sends no event when another main wrote the row first', async () => {
			const { recorder, events } = setup({ name: 'Claude Code', inserted: false });

			await recorder.recordUse(server, 'user-1', 'client-1');

			expect(events.emit).not.toHaveBeenCalled();
		});
	});

	describe('a later use', () => {
		it('changes nothing when the last use is less than one minute ago', async () => {
			const { recorder, connections, clients, events } = setup({
				existing: { lastUsedAt: new Date(NOW.getTime() - 59_999) },
			});

			await recorder.recordUse(server, 'user-1', 'client-1');

			expect(connections.updateLastUse).not.toHaveBeenCalled();
			expect(connections.insertFirstUse).not.toHaveBeenCalled();
			expect(clients.getName).not.toHaveBeenCalled();
			expect(events.emit).not.toHaveBeenCalled();
		});

		it('writes the last use when it is one minute ago, with no name lookup and no event', async () => {
			const { recorder, connections, clients, events } = setup({
				existing: { lastUsedAt: new Date(NOW.getTime() - 60_000) },
			});

			await recorder.recordUse(server, 'user-1', 'client-1');

			expect(connections.updateLastUse).toHaveBeenCalledWith(
				key,
				NOW,
				new Date(NOW.getTime() - 60_000),
			);
			expect(connections.insertFirstUse).not.toHaveBeenCalled();
			expect(clients.getName).not.toHaveBeenCalled();
			expect(events.emit).not.toHaveBeenCalled();
		});
	});
});

import { EventService } from '@n8n/backend-services';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { CredentialConnectionStatusCleanupListener } from '../credential-connection-status-cleanup-listener';
import type { CredentialConnectionStatusService } from '../credential-connection-status.service';

const flushPromises = async () => await new Promise((resolve) => setImmediate(resolve));

describe('CredentialConnectionStatusCleanupListener', () => {
	it('completes after cleanup succeeds', async () => {
		const eventService = new EventService();
		const connectionStatusService = mock<CredentialConnectionStatusService>();
		const complete = vi.fn();
		const entityManager = mock<EntityManager>();
		connectionStatusService.cleanupOrphanedEntriesForUsers.mockResolvedValueOnce(undefined);
		new CredentialConnectionStatusCleanupListener(eventService, connectionStatusService).init();

		eventService.emit('credential-connection-status-cleanup-requested', {
			userIds: ['user-1'],
			entityManager,
			complete,
		});
		await flushPromises();

		expect(connectionStatusService.cleanupOrphanedEntriesForUsers).toHaveBeenCalledWith(
			['user-1'],
			entityManager,
		);
		expect(complete).toHaveBeenCalledWith();
	});

	it('returns cleanup errors to the caller', async () => {
		const eventService = new EventService();
		const connectionStatusService = mock<CredentialConnectionStatusService>();
		const complete = vi.fn();
		const error = new Error('Cleanup failed');
		connectionStatusService.cleanupOrphanedEntriesForUsers.mockRejectedValueOnce(error);
		new CredentialConnectionStatusCleanupListener(eventService, connectionStatusService).init();

		eventService.emit('credential-connection-status-cleanup-requested', {
			userIds: ['user-1'],
			complete,
		});
		await flushPromises();

		expect(complete).toHaveBeenCalledWith(error);
	});
});

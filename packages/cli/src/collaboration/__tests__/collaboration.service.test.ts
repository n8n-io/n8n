import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { CollaborationService } from '@/collaboration/collaboration.service';
import type { CollaborationState } from '@/collaboration/collaboration.state';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { LockedError } from '@/errors/response-errors/locked.error';

describe('CollaborationService write-lock under CRDT', () => {
	const state = mock<CollaborationState>();

	const createService = (crdt: 'off' | 'local' | 'server') => {
		const globalConfig = mock<GlobalConfig>();
		globalConfig.collaboration = { crdt };
		return new CollaborationService(mock(), mock(), mock(), state, mock(), mock(), globalConfig);
	};

	beforeEach(() => jest.clearAllMocks());

	describe('validateWriteLock', () => {
		it('does not enforce the lock in server CRDT mode (even when another user holds it)', async () => {
			state.getWriteLock.mockResolvedValue({ clientId: 'other-tab', userId: 'other-user' });
			const service = createService('server');

			await expect(
				service.validateWriteLock('me', 'my-tab', 'wf-1', 'update'),
			).resolves.toBeUndefined();
			// The lock is never even read under server CRDT.
			expect(state.getWriteLock).not.toHaveBeenCalled();
		});

		it('still enforces the lock when CRDT is off (different user → LockedError)', async () => {
			state.getWriteLock.mockResolvedValue({ clientId: 'other-tab', userId: 'other-user' });
			const service = createService('off');

			await expect(service.validateWriteLock('me', 'my-tab', 'wf-1', 'update')).rejects.toThrow(
				LockedError,
			);
		});

		it('still enforces the lock when CRDT is off (same user, other tab → ConflictError)', async () => {
			state.getWriteLock.mockResolvedValue({ clientId: 'other-tab', userId: 'me' });
			const service = createService('off');

			await expect(service.validateWriteLock('me', 'my-tab', 'wf-1', 'update')).rejects.toThrow(
				ConflictError,
			);
		});
	});

	describe('ensureWorkflowEditable', () => {
		it('does not throw in server CRDT mode (even when a lock exists)', async () => {
			state.getWriteLock.mockResolvedValue({ clientId: 'other-tab', userId: 'other-user' });
			const service = createService('server');

			await expect(service.ensureWorkflowEditable('wf-1')).resolves.toBeUndefined();
			expect(state.getWriteLock).not.toHaveBeenCalled();
		});

		it('throws LockedError when CRDT is off and a lock exists', async () => {
			state.getWriteLock.mockResolvedValue({ clientId: 'other-tab', userId: 'other-user' });
			const service = createService('off');

			await expect(service.ensureWorkflowEditable('wf-1')).rejects.toThrow(LockedError);
		});
	});
});

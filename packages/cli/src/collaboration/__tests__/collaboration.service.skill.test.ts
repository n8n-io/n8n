import type { Logger } from '@n8n/backend-common';
import type { User, UserRepository } from '@n8n/db';
import { LockedError } from '@n8n/errors';
import type { ErrorReporter } from 'n8n-core';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import type { Push } from '@/push';
import type { AccessService } from '@/services/access.service';

import { CollaborationService } from '../collaboration.service';
import type { CollaborationState } from '../collaboration.state';

describe('CollaborationService — skill edit lock', () => {
	let service: CollaborationService;
	let state: Mocked<CollaborationState>;
	let userRepository: Mocked<UserRepository>;

	beforeEach(() => {
		state = mock<CollaborationState>();
		userRepository = mock<UserRepository>();
		service = new CollaborationService(
			mock<Logger>(),
			mock<ErrorReporter>(),
			mock<Push>(),
			state,
			userRepository,
			mock<AccessService>(),
			mock<AgentRepository>(),
		);
	});

	describe('acquireSkillWriteLock', () => {
		it('should report the lock as acquired when the user holds it', async () => {
			state.acquireSkillWriteLock.mockResolvedValue({ clientId: 'client-1', userId: 'user-1' });

			const result = await service.acquireSkillWriteLock('user-1', 'client-1', 'skill-1');

			expect(result).toEqual({ acquired: true });
		});

		it('should return the user who holds the lock', async () => {
			state.acquireSkillWriteLock.mockResolvedValue({ clientId: 'client-2', userId: 'user-2' });
			userRepository.findOneBy.mockResolvedValue({
				id: 'user-2',
				firstName: 'Bob',
				lastName: 'Smith',
			} as User);

			const result = await service.acquireSkillWriteLock('user-1', 'client-1', 'skill-1');

			expect(result).toEqual({
				acquired: false,
				holder: { id: 'user-2', firstName: 'Bob', lastName: 'Smith' },
			});
		});
	});

	describe('validateSkillWriteLock', () => {
		it('should allow a write when nobody holds the lock', async () => {
			state.getSkillWriteLock.mockResolvedValue(null);

			await expect(
				service.validateSkillWriteLock('user-1', 'client-1', 'skill-1'),
			).resolves.toBeUndefined();
		});

		it('should allow a write from the user who holds the lock', async () => {
			state.getSkillWriteLock.mockResolvedValue({ clientId: 'client-9', userId: 'user-1' });

			await expect(
				service.validateSkillWriteLock('user-1', 'client-1', 'skill-1'),
			).resolves.toBeUndefined();
		});

		it('should reject a write while another user holds the lock', async () => {
			state.getSkillWriteLock.mockResolvedValue({ clientId: 'client-2', userId: 'user-2' });

			await expect(service.validateSkillWriteLock('user-1', 'client-1', 'skill-1')).rejects.toThrow(
				LockedError,
			);
		});

		it('should reject a write without a tab while another user holds the lock', async () => {
			state.getSkillWriteLock.mockResolvedValue({ clientId: 'client-2', userId: 'user-2' });

			await expect(service.validateSkillWriteLock('user-1', undefined, 'skill-1')).rejects.toThrow(
				LockedError,
			);
		});
	});
});

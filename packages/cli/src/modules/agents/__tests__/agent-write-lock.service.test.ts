import type { CollaborationState } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { ConflictError, LockedError, NotFoundError } from '@n8n/errors';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AgentWriteLockService } from '../agent-write-lock.service';
import type { AgentRepository } from '../repositories/agent.repository';

const OTHER_TAB_MESSAGE = 'Cannot update agent - you have this agent open in another tab';
const OTHER_USER_MESSAGE = 'Cannot update agent - another user currently has write access';

describe('AgentWriteLockService', () => {
	let service: AgentWriteLockService;
	let state: Mocked<CollaborationState>;
	let agentRepository: Mocked<AgentRepository>;

	beforeEach(() => {
		state = mock<CollaborationState>();
		agentRepository = mock<AgentRepository>();
		agentRepository.existsByIdAndProjectId.mockResolvedValue(true);

		service = new AgentWriteLockService(state, agentRepository);
	});

	const userId = 'user-1' as User['id'];

	describe('getAgentWriteLock', () => {
		it('returns the lock when the agent belongs to the given project', async () => {
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'client-1', userId: 'user-1' });

			await expect(service.getAgentWriteLock('project-1', 'agent-1')).resolves.toEqual({
				clientId: 'client-1',
				userId: 'user-1',
			});
			expect(agentRepository.existsByIdAndProjectId).toHaveBeenCalledWith('agent-1', 'project-1');
		});

		it('returns null when the agent belongs to a different project', async () => {
			agentRepository.existsByIdAndProjectId.mockResolvedValue(false);
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'client-1', userId: 'user-1' });

			await expect(service.getAgentWriteLock('other-project', 'agent-1')).resolves.toBeNull();
			expect(state.getAgentWriteLock).not.toHaveBeenCalled();
		});
	});

	describe('validateAgentWriteLock', () => {
		it('passes when no lock exists', async () => {
			state.getAgentWriteLock.mockResolvedValue(null);

			await expect(
				service.validateAgentWriteLock(userId, 'client-1', 'project-1', 'agent-1', 'update'),
			).resolves.toBeUndefined();
		});

		it('passes without a lock read when no client id is given', async () => {
			await expect(
				service.validateAgentWriteLock(userId, undefined, 'project-1', 'agent-1', 'update'),
			).resolves.toBeUndefined();
			expect(state.getAgentWriteLock).not.toHaveBeenCalled();
		});

		it('passes when the requesting client holds the lock', async () => {
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'client-1', userId: 'user-1' });

			await expect(
				service.validateAgentWriteLock(userId, 'client-1', 'project-1', 'agent-1', 'update'),
			).resolves.toBeUndefined();
		});

		it('throws a ConflictError when the same user holds the lock from another tab', async () => {
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'other-client', userId: 'user-1' });

			const result = service.validateAgentWriteLock(
				userId,
				'client-1',
				'project-1',
				'agent-1',
				'update',
			);

			await expect(result).rejects.toThrow(ConflictError);
			await expect(result).rejects.toThrow(OTHER_TAB_MESSAGE);
		});

		it('throws a LockedError when a different user holds the lock', async () => {
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'other-client', userId: 'other-user' });

			const result = service.validateAgentWriteLock(
				userId,
				'client-1',
				'project-1',
				'agent-1',
				'update',
			);

			await expect(result).rejects.toThrow(LockedError);
			await expect(result).rejects.toThrow(OTHER_USER_MESSAGE);
		});

		it('throws a LockedError when a different user uses the holder clientId (impersonation)', async () => {
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'client-1', userId: 'user-1' });

			const result = service.validateAgentWriteLock(
				'other-user',
				'client-1',
				'project-1',
				'agent-1',
				'update',
			);

			await expect(result).rejects.toThrow(LockedError);
			await expect(result).rejects.toThrow(OTHER_USER_MESSAGE);
		});

		it('throws NotFoundError when the agent belongs to a different project', async () => {
			agentRepository.existsByIdAndProjectId.mockResolvedValue(false);
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'client-1', userId: 'user-1' });

			const result = service.validateAgentWriteLock(
				userId,
				'client-1',
				'other-project',
				'agent-1',
				'update',
			);

			await expect(result).rejects.toThrow(NotFoundError);
			await expect(result).rejects.toThrow('Agent not found');
		});
	});

	describe('validateAgentWriteLocks', () => {
		it('skips the cache when no client id is given or the list is empty', async () => {
			await service.validateAgentWriteLocks(userId, undefined, ['agent-1'], 'update');
			await service.validateAgentWriteLocks(userId, 'client-1', [], 'update');

			expect(state.getAgentWriteLocks).not.toHaveBeenCalled();
			expect(agentRepository.existsByIdAndProjectId).not.toHaveBeenCalled();
		});

		it('reads all locks in one call and passes when none is held by another client', async () => {
			state.getAgentWriteLocks.mockResolvedValue(
				new Map([['agent-2', { clientId: 'client-1', userId: 'user-1' }]]),
			);

			await expect(
				service.validateAgentWriteLocks(userId, 'client-1', ['agent-1', 'agent-2'], 'update'),
			).resolves.toBeUndefined();

			expect(state.getAgentWriteLocks).toHaveBeenCalledTimes(1);
			expect(state.getAgentWriteLocks).toHaveBeenCalledWith(['agent-1', 'agent-2']);
			// The caller already loaded the agents; no per-agent project query.
			expect(agentRepository.existsByIdAndProjectId).not.toHaveBeenCalled();
		});

		it('throws a ConflictError when any agent is held by the same user from another tab', async () => {
			state.getAgentWriteLocks.mockResolvedValue(
				new Map([['agent-2', { clientId: 'other-client', userId: 'user-1' }]]),
			);

			const result = service.validateAgentWriteLocks(
				userId,
				'client-1',
				['agent-1', 'agent-2'],
				'update',
			);

			await expect(result).rejects.toThrow(ConflictError);
			await expect(result).rejects.toThrow(OTHER_TAB_MESSAGE);
		});

		it('throws a LockedError when any agent is held by a different user', async () => {
			state.getAgentWriteLocks.mockResolvedValue(
				new Map([['agent-1', { clientId: 'other-client', userId: 'other-user' }]]),
			);

			const result = service.validateAgentWriteLocks(userId, 'client-1', ['agent-1'], 'update');

			await expect(result).rejects.toThrow(LockedError);
			await expect(result).rejects.toThrow(OTHER_USER_MESSAGE);
		});
	});

	describe('ensureAgentEditable', () => {
		it('passes when no lock exists', async () => {
			state.getAgentWriteLock.mockResolvedValue(null);

			await expect(service.ensureAgentEditable('agent-1')).resolves.toBeUndefined();
		});

		it('throws a LockedError when a lock exists', async () => {
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'other-client', userId: 'other-user' });

			const result = service.ensureAgentEditable('agent-1');

			await expect(result).rejects.toThrow(LockedError);
			await expect(result).rejects.toThrow(
				'Cannot modify agent while it is being edited by a user in the builder.',
			);
		});
	});
});

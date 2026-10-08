import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type { User } from '@n8n/db';

import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import type { Agent } from '@/modules/agents/entities/agent.entity';

import { CollaborationService } from '../collaboration.service';
import type {
	AgentOpenedMessage,
	AgentClosedMessage,
	AgentWriteAccessRequestedMessage,
	AgentWriteAccessReleaseRequestedMessage,
} from '../collaboration.message';
import type { CollaborationState } from '../collaboration.state';
import type { Push } from '@/push';
import type { UserRepository } from '@n8n/db';
import type { AccessService } from '@/services/access.service';
import type { Logger } from '@n8n/backend-common';
import type { ErrorReporter } from 'n8n-core';

import { userHasScopes } from '@/permissions.ee/check-access';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn().mockResolvedValue(true),
}));

describe('CollaborationService — agent messages', () => {
	let service: CollaborationService;
	let state: Mocked<CollaborationState>;
	let push: Mocked<Push>;
	let userRepository: Mocked<UserRepository>;
	let agentRepository: Mocked<AgentRepository>;

	beforeEach(() => {
		vi.clearAllMocks();
		state = mock<CollaborationState>();
		push = mock<Push>();
		userRepository = mock<UserRepository>();
		agentRepository = mock<AgentRepository>();

		// `toIUser` is called on the user returned by the repository.
		userRepository.getByIds.mockResolvedValue([]);
		userRepository.findOne.mockResolvedValue({
			id: 'user-1',
			toIUser: () => ({ id: 'user-1' }),
		} as unknown as User);

		agentRepository.findById.mockResolvedValue({ projectId: 'project-1' } as Agent);
		agentRepository.getProjectIdById.mockResolvedValue('project-1');
		agentRepository.existsByIdAndProjectId.mockResolvedValue(true);

		state.getAgentCollaborators.mockResolvedValue([]);

		service = new CollaborationService(
			mock<Logger>(),
			mock<ErrorReporter>(),
			push,
			state,
			userRepository,
			mock<AccessService>(),
			agentRepository,
		);
	});

	const userId = 'user-1' as User['id'];

	it('adds an agent collaborator on agentOpened', async () => {
		const msg: AgentOpenedMessage = { type: 'agentOpened', agentId: 'agent-1' };

		await service.handleUserMessage(userId, 'client-1', msg);

		expect(state.addAgentCollaborator).toHaveBeenCalledWith('agent-1', userId, 'client-1');
	});

	it('does not add a collaborator on agentOpened when the user lacks read access', async () => {
		vi.mocked(userHasScopes).mockResolvedValueOnce(false);
		const msg: AgentOpenedMessage = { type: 'agentOpened', agentId: 'agent-1' };

		await service.handleUserMessage(userId, 'client-1', msg);

		expect(state.addAgentCollaborator).not.toHaveBeenCalled();
	});

	it('releases the agent write lock on agentClosed when the client holds it', async () => {
		state.releaseAgentWriteLockIfHolder.mockResolvedValue(true);
		const msg: AgentClosedMessage = { type: 'agentClosed', agentId: 'agent-1' };

		await service.handleUserMessage(userId, 'client-1', msg);

		expect(state.releaseAgentWriteLockIfHolder).toHaveBeenCalledWith('agent-1', 'client-1');
		expect(state.removeAgentCollaborator).toHaveBeenCalledWith('agent-1', 'client-1');
	});

	it('does not release the lock on agentClosed when a different client holds it', async () => {
		state.releaseAgentWriteLockIfHolder.mockResolvedValue(false);
		const msg: AgentClosedMessage = { type: 'agentClosed', agentId: 'agent-1' };

		await service.handleUserMessage(userId, 'client-1', msg);

		expect(state.releaseAgentWriteLock).not.toHaveBeenCalled();
		expect(state.removeAgentCollaborator).toHaveBeenCalledWith('agent-1', 'client-1');
	});

	it('does not remove a collaborator on agentClosed when the user lacks read access', async () => {
		vi.mocked(userHasScopes).mockResolvedValueOnce(false);
		const msg: AgentClosedMessage = { type: 'agentClosed', agentId: 'agent-1' };

		await service.handleUserMessage(userId, 'client-1', msg);

		expect(state.releaseAgentWriteLockIfHolder).not.toHaveBeenCalled();
		expect(state.removeAgentCollaborator).not.toHaveBeenCalled();
	});

	it('sets the agent write lock on agentWriteAccessRequested when no lock exists', async () => {
		state.acquireAgentWriteLock.mockResolvedValue(true);
		const msg: AgentWriteAccessRequestedMessage = {
			type: 'agentWriteAccessRequested',
			agentId: 'agent-1',
			force: false,
		};

		await service.handleUserMessage(userId, 'client-1', msg);

		expect(state.acquireAgentWriteLock).toHaveBeenCalledWith('agent-1', 'client-1', userId);
	});

	it('does not set the lock on a non-forced request when another client holds it', async () => {
		state.acquireAgentWriteLock.mockResolvedValue(false);
		const msg: AgentWriteAccessRequestedMessage = {
			type: 'agentWriteAccessRequested',
			agentId: 'agent-1',
			force: false,
		};

		await service.handleUserMessage(userId, 'client-1', msg);

		expect(state.setAgentWriteLock).not.toHaveBeenCalled();
	});

	it('does not set the lock on agentWriteAccessRequested when the user lacks write access', async () => {
		vi.mocked(userHasScopes).mockResolvedValueOnce(false);
		const msg: AgentWriteAccessRequestedMessage = {
			type: 'agentWriteAccessRequested',
			agentId: 'agent-1',
			force: false,
		};

		await service.handleUserMessage(userId, 'client-1', msg);

		expect(state.acquireAgentWriteLock).not.toHaveBeenCalled();
		expect(state.acquireAgentWriteLockForce).not.toHaveBeenCalled();
		expect(state.setAgentWriteLock).not.toHaveBeenCalled();
	});

	it('force-acquires the lock on a forced request when the same user holds it', async () => {
		state.getAgentWriteLock.mockResolvedValue({ clientId: 'other-client', userId: 'user-1' });
		state.acquireAgentWriteLockForce.mockResolvedValue(true);
		const msg: AgentWriteAccessRequestedMessage = {
			type: 'agentWriteAccessRequested',
			agentId: 'agent-1',
			force: true,
		};

		await service.handleUserMessage(userId, 'client-1', msg);

		expect(state.acquireAgentWriteLockForce).toHaveBeenCalledWith('agent-1', 'client-1', userId);
	});

	it('releases the lock on agentWriteAccessReleaseRequested when the client holds it', async () => {
		state.releaseAgentWriteLockIfHolder.mockResolvedValue(true);
		const msg: AgentWriteAccessReleaseRequestedMessage = {
			type: 'agentWriteAccessReleaseRequested',
			agentId: 'agent-1',
		};

		await service.handleUserMessage(userId, 'client-1', msg);

		expect(state.releaseAgentWriteLockIfHolder).toHaveBeenCalledWith('agent-1', 'client-1');
	});

	it('does not release the lock on agentWriteAccessReleaseRequested when a different client holds it', async () => {
		state.releaseAgentWriteLockIfHolder.mockResolvedValue(false);
		const msg: AgentWriteAccessReleaseRequestedMessage = {
			type: 'agentWriteAccessReleaseRequested',
			agentId: 'agent-1',
		};

		await service.handleUserMessage(userId, 'client-1', msg);

		expect(state.releaseAgentWriteLock).not.toHaveBeenCalled();
	});

	describe('getAgentWriteLock', () => {
		it('returns the lock when the agent belongs to the given project', async () => {
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'client-1', userId: 'user-1' });

			await expect(service.getAgentWriteLock('project-1', 'agent-1')).resolves.toEqual({
				clientId: 'client-1',
				userId: 'user-1',
			});
		});

		it('returns null when the agent belongs to a different project', async () => {
			agentRepository.existsByIdAndProjectId.mockResolvedValue(false);
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'client-1', userId: 'user-1' });

			await expect(service.getAgentWriteLock('other-project', 'agent-1')).resolves.toBeNull();
			expect(state.getAgentWriteLock).not.toHaveBeenCalled();
			agentRepository.existsByIdAndProjectId.mockResolvedValue(true);
		});
	});

	describe('validateAgentWriteLock', () => {
		it('passes when no lock exists', async () => {
			state.getAgentWriteLock.mockResolvedValue(null);

			await expect(
				service.validateAgentWriteLock(userId, 'client-1', 'project-1', 'agent-1', 'update'),
			).resolves.toBeUndefined();
		});

		it('passes when the requesting client holds the lock', async () => {
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'client-1', userId: 'user-1' });

			await expect(
				service.validateAgentWriteLock(userId, 'client-1', 'project-1', 'agent-1', 'update'),
			).resolves.toBeUndefined();
		});

		it('throws a ConflictError when the same user holds the lock from another tab', async () => {
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'other-client', userId: 'user-1' });

			await expect(
				service.validateAgentWriteLock(userId, 'client-1', 'project-1', 'agent-1', 'update'),
			).rejects.toThrow(/another tab/);
		});

		it('throws a LockedError when a different user holds the lock', async () => {
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'other-client', userId: 'other-user' });

			await expect(
				service.validateAgentWriteLock(userId, 'client-1', 'project-1', 'agent-1', 'update'),
			).rejects.toThrow(/another user/);
		});

		it('throws a LockedError when a different user uses the holder clientId (impersonation)', async () => {
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'client-1', userId: 'user-1' });

			await expect(
				service.validateAgentWriteLock('other-user', 'client-1', 'project-1', 'agent-1', 'update'),
			).rejects.toThrow(/another user/);
		});

		it('throws NotFoundError when the agent belongs to a different project', async () => {
			agentRepository.existsByIdAndProjectId.mockResolvedValue(false);
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'client-1', userId: 'user-1' });

			await expect(
				service.validateAgentWriteLock(userId, 'client-1', 'other-project', 'agent-1', 'update'),
			).rejects.toThrow(/Agent not found/);
			agentRepository.existsByIdAndProjectId.mockResolvedValue(true);
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

			await expect(
				service.validateAgentWriteLocks(userId, 'client-1', ['agent-1', 'agent-2'], 'update'),
			).rejects.toThrow(/another tab/);
		});

		it('throws a LockedError when any agent is held by a different user', async () => {
			state.getAgentWriteLocks.mockResolvedValue(
				new Map([['agent-1', { clientId: 'other-client', userId: 'other-user' }]]),
			);

			await expect(
				service.validateAgentWriteLocks(userId, 'client-1', ['agent-1'], 'update'),
			).rejects.toThrow(/another user/);
		});
	});

	describe('ensureAgentEditable', () => {
		it('passes when no lock exists', async () => {
			state.getAgentWriteLock.mockResolvedValue(null);

			await expect(service.ensureAgentEditable('agent-1')).resolves.toBeUndefined();
		});

		it('throws a LockedError when a lock exists', async () => {
			state.getAgentWriteLock.mockResolvedValue({ clientId: 'other-client', userId: 'other-user' });

			await expect(service.ensureAgentEditable('agent-1')).rejects.toThrow();
		});
	});
});

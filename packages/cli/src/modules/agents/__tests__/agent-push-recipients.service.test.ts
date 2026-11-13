import type { RoleService } from '@n8n/backend-services';
import type { UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AgentPushRecipientsService } from '../agent-push-recipients.service';

describe('AgentPushRecipientsService', () => {
	const userRepository = mock<UserRepository>();
	const roleService = mock<RoleService>();
	let service: AgentPushRecipientsService;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.resetAllMocks();
		roleService.rolesWithScope.mockResolvedValue(['role']);
		userRepository.findIdsWithGlobalOrProjectRoles.mockResolvedValue(['user-1']);
		service = new AgentPushRecipientsService(userRepository, roleService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('reuses the recipients of a project and scope for a short time', async () => {
		await expect(service.getProjectUsersWithScope('p1', 'agent:read')).resolves.toEqual(['user-1']);
		await expect(service.getProjectUsersWithScope('p1', 'agent:read')).resolves.toEqual(['user-1']);
		expect(userRepository.findIdsWithGlobalOrProjectRoles).toHaveBeenCalledTimes(1);

		await service.getProjectUsersWithScope('p1', 'agent:execute');
		await service.getProjectUsersWithScope('p2', 'agent:read');
		expect(userRepository.findIdsWithGlobalOrProjectRoles).toHaveBeenCalledTimes(3);
	});

	it('queries again after the cache window', async () => {
		await service.getProjectUsersWithScope('p1', 'agent:read');
		vi.advanceTimersByTime(2_001);
		await service.getProjectUsersWithScope('p1', 'agent:read');
		expect(userRepository.findIdsWithGlobalOrProjectRoles).toHaveBeenCalledTimes(2);
	});

	it('shares one query between concurrent calls', async () => {
		await Promise.all([
			service.getProjectUsersWithScope('p1', 'agent:read'),
			service.getProjectUsersWithScope('p1', 'agent:read'),
		]);
		expect(userRepository.findIdsWithGlobalOrProjectRoles).toHaveBeenCalledTimes(1);
	});

	it('does not keep a failed query', async () => {
		userRepository.findIdsWithGlobalOrProjectRoles.mockRejectedValueOnce(new Error('db down'));
		await expect(service.getProjectUsersWithScope('p1', 'agent:read')).rejects.toThrow('db down');
		await expect(service.getProjectUsersWithScope('p1', 'agent:read')).resolves.toEqual(['user-1']);
		expect(userRepository.findIdsWithGlobalOrProjectRoles).toHaveBeenCalledTimes(2);
	});
});

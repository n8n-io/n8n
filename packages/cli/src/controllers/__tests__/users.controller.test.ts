import { mock } from 'jest-mock-extended';

import type { User } from '@/databases/entities/user';
import type { UserRepository } from '@/databases/repositories/user.repository';
import type { EventService } from '@/events/event.service';
import type { AuthenticatedRequest } from '@/requests';
import type { ProjectService } from '@/services/project.service';

import { UsersController } from '../users.controller';

describe('UsersController', () => {
	const eventService = mock<EventService>();
	const userRepository = mock<UserRepository>();
	const projectService = mock<ProjectService>();
	const controller = new UsersController(
		mock(),
		mock(),
		mock(),
		mock(),
		userRepository,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		projectService,
		eventService,
	);

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe('changeGlobalRole', () => {
		it('should emit event user-changed-role', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: '123' },
			});
			userRepository.findOneBy.mockResolvedValue(mock<User>({ id: '456' }));
			projectService.getUserOwnedOrAdminProjects.mockResolvedValue([]);

			await controller.changeGlobalRole(
				request,
				mock(),
				mock({ newRoleName: 'global:member' }),
				'456',
			);

			expect(eventService.emit).toHaveBeenCalledWith('user-changed-role', {
				userId: '123',
				targetUserId: '456',
				targetUserNewRole: 'global:member',
				publicApi: false,
			});
		});
	});
});

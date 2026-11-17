import type { Logger } from '@n8n/backend-common';
import type { ProjectRepository } from '@n8n/db';
import { Project, User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { OwnershipService } from '@/services/ownership.service';
import type { UserService } from '@/services/user.service';

import type { ScimTransferTargetRepository } from '../database/scim-transfer-target.repository';
import {
	isValidScimTransferTarget,
	ScimDeprovisioningService,
} from '../scim-deprovisioning.service';
import type { ScimSettingsService } from '../scim-settings.service';

const makeUser = (overrides: Partial<User> = {}) =>
	Object.assign(new User(), {
		id: 'user-1',
		email: 'ada@example.com',
		firstName: 'Ada',
		lastName: 'Lovelace',
		disabled: false,
		...overrides,
	});

const personalProject = (creator: User | null, overrides: Partial<Project> = {}) =>
	Object.assign(new Project(), {
		id: `personal-${creator?.id ?? 'none'}`,
		type: 'personal',
		name: 'Ada Lovelace <ada@example.com>',
		icon: null,
		creatorId: creator?.id ?? null,
		creator,
		...overrides,
	});

describe('isValidScimTransferTarget', () => {
	it('rejects a personal project without a user', () => {
		expect(isValidScimTransferTarget(personalProject(null))).toBe(false);
	});
});

describe('ScimDeprovisioningService', () => {
	let scimSettingsService: Mocked<ScimSettingsService>;
	let transferTargetRepository: Mocked<ScimTransferTargetRepository>;
	let projectRepository: Mocked<ProjectRepository>;
	let ownershipService: Mocked<OwnershipService>;
	let userService: Mocked<UserService>;
	let logger: Mocked<Logger>;
	let service: ScimDeprovisioningService;

	const owner = makeUser({ id: 'owner-1' });
	const ownerProject = personalProject(owner, { id: 'owner-personal' });
	const systemActor = { kind: 'system', reason: 'scim' };

	beforeEach(() => {
		scimSettingsService = mock<ScimSettingsService>();
		transferTargetRepository = mock<ScimTransferTargetRepository>();
		projectRepository = mock<ProjectRepository>();
		ownershipService = mock<OwnershipService>();
		userService = mock<UserService>();
		logger = mock<Logger>();
		service = new ScimDeprovisioningService(
			logger,
			scimSettingsService,
			transferTargetRepository,
			projectRepository,
			ownershipService,
			userService,
		);

		ownershipService.getInstanceOwner.mockResolvedValue(owner);
		projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(ownerProject);
	});

	describe('findTransferTargets', () => {
		const peoplePage = {
			total: 1,
			items: [
				{
					projectId: 'personal-user-1',
					userId: 'user-1',
					firstName: 'Ada',
					lastName: 'Lovelace',
					email: 'ada@example.com',
					role: 'global:member',
				},
			],
		};
		const projectsPage = {
			total: 1,
			items: [
				{
					projectId: 'team-1',
					name: 'Platform',
					icon: null,
				},
			],
		};

		beforeEach(() => {
			transferTargetRepository.findPersonTargetPage.mockResolvedValue(peoplePage);
			transferTargetRepository.findProjectTargetPage.mockResolvedValue(projectsPage);
		});

		it('returns both sections with the same page for each', async () => {
			const result = await service.findTransferTargets({ search: 'ada', skip: 10, take: 5 });

			expect(result).toEqual({ people: peoplePage, projects: projectsPage });
			const page = { search: 'ada', skip: 10, take: 5 };
			expect(transferTargetRepository.findPersonTargetPage).toHaveBeenCalledWith(page);
			expect(transferTargetRepository.findProjectTargetPage).toHaveBeenCalledWith(page);
		});

		it('returns only people for type people', async () => {
			const result = await service.findTransferTargets({ type: 'people', skip: 0, take: 50 });

			expect(result).toEqual({ people: peoplePage });
			expect(transferTargetRepository.findProjectTargetPage).not.toHaveBeenCalled();
		});

		it('returns only projects for type projects', async () => {
			const result = await service.findTransferTargets({ type: 'projects', skip: 0, take: 50 });

			expect(result).toEqual({ projects: projectsPage });
			expect(transferTargetRepository.findPersonTargetPage).not.toHaveBeenCalled();
		});
	});

	describe('deleteUser', () => {
		const user = makeUser({ id: 'leaver' });

		it.each([
			['no longer exists', null],
			[
				'is the personal project of a deactivated user',
				personalProject(makeUser({ id: 'other', disabled: true })),
			],
		])('falls back to the personal project of the owner when the target %s', async (_, project) => {
			projectRepository.findOne.mockResolvedValue(project);

			await service.deleteUser(user, {
				onDelete: 'delete',
				dataAction: 'transfer',
				transferProjectId: 'stored',
			});

			expect(userService.deleteUser).toHaveBeenCalledWith(systemActor, 'leaver', 'owner-personal');
			expect(logger.warn).toHaveBeenCalledWith(expect.any(String), {
				userId: 'leaver',
				transferProjectId: 'stored',
			});
		});
	});
});

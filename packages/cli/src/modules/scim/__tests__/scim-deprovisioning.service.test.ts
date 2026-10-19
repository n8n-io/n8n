import type { ScimDeprovisioningPolicy } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { ProjectRepository } from '@n8n/db';
import { Project, User } from '@n8n/db';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { PolicyViolationError } from '@/policy/policy-violation.error';
import type { OwnershipService } from '@/services/ownership.service';
import type { UserService } from '@/services/user.service';

import type { ScimTransferTargetRepository } from '../database/scim-transfer-target.repository';
import {
	isValidScimTransferTarget,
	ScimDeprovisioningService,
	toScimTransferTarget,
} from '../scim-deprovisioning.service';
import {
	DEFAULT_SCIM_DEPROVISIONING_POLICY,
	type ScimSettingsService,
} from '../scim-settings.service';
import { ScimForbiddenError, ScimInvalidTransferTargetError } from '../scim.errors';

const makeUser = (overrides: Partial<User> = {}) =>
	Object.assign(new User(), {
		id: 'user-1',
		email: 'ada@example.com',
		firstName: 'Ada',
		lastName: 'Lovelace',
		disabled: false,
		...overrides,
	});

const teamProject = (overrides: Partial<Project> = {}) =>
	Object.assign(new Project(), {
		id: 'team-1',
		type: 'team',
		name: 'Platform',
		icon: { type: 'emoji', value: '🚀' },
		creatorId: null,
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
	it.each([
		['a team project', teamProject(), true],
		['the personal project of an active user', personalProject(makeUser()), true],
		[
			'the personal project of a deactivated user',
			personalProject(makeUser({ disabled: true })),
			false,
		],
		['a personal project without a user', personalProject(null), false],
	])('returns %s as %s', (_, project, valid) => {
		expect(isValidScimTransferTarget(project)).toBe(valid);
	});
});

describe('toScimTransferTarget', () => {
	it('describes a team project', () => {
		expect(toScimTransferTarget('team-1', teamProject())).toEqual({
			projectId: 'team-1',
			kind: 'project',
			name: 'Platform',
			icon: { type: 'emoji', value: '🚀' },
			valid: true,
		});
	});

	it('describes the personal project of a person by the name and email of the person', () => {
		expect(toScimTransferTarget('personal-user-1', personalProject(makeUser()))).toEqual({
			projectId: 'personal-user-1',
			kind: 'person',
			name: 'Ada Lovelace',
			email: 'ada@example.com',
			valid: true,
		});
	});

	it('uses the email of a person without a name', () => {
		const user = makeUser({ firstName: '', lastName: '' });

		expect(toScimTransferTarget('p', personalProject(user))).toMatchObject({
			name: 'ada@example.com',
		});
	});

	it('marks the personal project of a deactivated user as not valid', () => {
		const user = makeUser({ disabled: true });

		expect(toScimTransferTarget('p', personalProject(user))).toMatchObject({
			kind: 'person',
			valid: false,
		});
	});

	it('marks a project that no longer exists as not valid', () => {
		expect(toScimTransferTarget('gone', null)).toEqual({
			projectId: 'gone',
			kind: null,
			name: null,
			valid: false,
		});
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

	const storePolicy = (policy: Partial<ScimDeprovisioningPolicy>) =>
		scimSettingsService.getDeprovisioningPolicy.mockResolvedValue({
			...DEFAULT_SCIM_DEPROVISIONING_POLICY,
			...policy,
		});

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

		storePolicy({});
		ownershipService.getInstanceOwner.mockResolvedValue(owner);
		projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(ownerProject);
	});

	describe('findTransferTargets', () => {
		const peoplePage = {
			total: 2,
			count: 1,
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
			total: 3,
			count: 1,
			items: [
				{
					projectId: 'team-1',
					name: 'Platform',
					icon: null,
					memberCount: 3,
					workflowCount: 7,
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
			expect(transferTargetRepository.findPersonTargetPage).toHaveBeenCalledWith(page, {});
			expect(transferTargetRepository.findProjectTargetPage).toHaveBeenCalledWith(page, {});
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

	describe('describePolicy', () => {
		it('returns no transfer target when none is stored', async () => {
			await expect(service.describePolicy()).resolves.toEqual({
				onDelete: 'disable',
				dataAction: 'transfer',
				transferTarget: null,
			});
			expect(transferTargetRepository.findWithCreator).not.toHaveBeenCalled();
		});

		it('returns the stored target and whether it is still valid', async () => {
			storePolicy({ onDelete: 'delete', transferProjectId: 'personal-user-1' });
			transferTargetRepository.findWithCreator.mockResolvedValue(
				personalProject(makeUser({ disabled: true })),
			);

			await expect(service.describePolicy()).resolves.toMatchObject({
				onDelete: 'delete',
				transferTarget: { projectId: 'personal-user-1', kind: 'person', valid: false },
			});
		});
	});

	describe('assertValidTransferTarget', () => {
		it.each([
			['a team project without members', teamProject()],
			['the personal project of an active user', personalProject(makeUser())],
		])('accepts %s as the target', async (_, project) => {
			transferTargetRepository.findWithCreator.mockResolvedValue(project);

			await expect(service.assertValidTransferTarget(project.id)).resolves.toBeUndefined();
		});

		it.each([
			['a project that does not exist', null],
			['the personal project of a deactivated user', personalProject(makeUser({ disabled: true }))],
		])('rejects %s as the target', async (_, project) => {
			transferTargetRepository.findWithCreator.mockResolvedValue(project);

			await expect(service.assertValidTransferTarget('target')).rejects.toThrow(
				ScimInvalidTransferTargetError,
			);
		});
	});

	describe('deleteUser', () => {
		const user = makeUser({ id: 'leaver' });

		it('deletes the user and the work for dataAction delete', async () => {
			await service.deleteUser(user, {
				onDelete: 'delete',
				dataAction: 'delete',
				transferProjectId: 'team-1',
			});

			expect(userService.deleteUser).toHaveBeenCalledExactlyOnceWith(
				systemActor,
				'leaver',
				undefined,
			);
			expect(transferTargetRepository.findWithCreator).not.toHaveBeenCalled();
		});

		it('transfers the work to a valid stored target', async () => {
			transferTargetRepository.findWithCreator.mockResolvedValue(teamProject());

			await service.deleteUser(user, {
				onDelete: 'delete',
				dataAction: 'transfer',
				transferProjectId: 'team-1',
			});

			expect(userService.deleteUser).toHaveBeenCalledWith(systemActor, 'leaver', 'team-1');
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('transfers the work to the personal project of the owner without a stored target', async () => {
			await service.deleteUser(user, {
				onDelete: 'delete',
				dataAction: 'transfer',
				transferProjectId: null,
			});

			expect(userService.deleteUser).toHaveBeenCalledWith(systemActor, 'leaver', 'owner-personal');
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it.each([
			['no longer exists', null],
			['is the personal project of the deleted user', personalProject(user)],
			[
				'is the personal project of a deactivated user',
				personalProject(makeUser({ id: 'other', disabled: true })),
			],
		])(
			'falls back to the personal project of the owner when the target %s',
			async (problem, project) => {
				transferTargetRepository.findWithCreator.mockResolvedValue(project);

				await service.deleteUser(user, {
					onDelete: 'delete',
					dataAction: 'transfer',
					transferProjectId: 'stored',
				});

				expect(userService.deleteUser).toHaveBeenCalledWith(
					systemActor,
					'leaver',
					'owner-personal',
				);
				expect(logger.warn).toHaveBeenCalledWith(
					expect.stringContaining(`The transfer target ${problem}.`),
					{ userId: 'leaver', transferProjectId: 'stored' },
				);
			},
		);

		it.each([
			['the owner guard', new ForbiddenError('Instance owner cannot be deleted.')],
			['a policy that blocks the transfer', new PolicyViolationError([mock({ message: 'No' })])],
		])('maps %s to a SCIM 403', async (_, error) => {
			userService.deleteUser.mockRejectedValue(error);

			const result = service.deleteUser(user, {
				onDelete: 'delete',
				dataAction: 'delete',
				transferProjectId: null,
			});

			await expect(result).rejects.toThrow(ScimForbiddenError);
			await expect(result).rejects.toThrow(error.message);
		});

		it('passes other errors on', async () => {
			const error = new NotFoundError('gone');
			userService.deleteUser.mockRejectedValue(error);

			await expect(
				service.deleteUser(user, {
					onDelete: 'delete',
					dataAction: 'delete',
					transferProjectId: null,
				}),
			).rejects.toBe(error);
		});
	});
});

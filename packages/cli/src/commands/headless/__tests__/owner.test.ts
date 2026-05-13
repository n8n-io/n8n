import { mockInstance } from '@n8n/backend-test-utils';
import {
	GLOBAL_OWNER_ROLE,
	Project,
	ProjectRelationRepository,
	ProjectRepository,
	Role,
	SettingsRepository,
	User,
	UserRepository,
} from '@n8n/db';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { UnexpectedError } from 'n8n-workflow';

import config from '@/config';

import { ensureOwner } from '../owner';

const buildOwner = (overrides: Partial<User> = {}): User => {
	const owner = new User();
	owner.id = 'owner-123';
	owner.email = 'owner@example.com';
	owner.firstName = 'Test';
	owner.lastName = 'Owner';
	owner.role = Object.assign(new Role(), { slug: GLOBAL_OWNER_ROLE.slug });
	Object.assign(owner, overrides);
	return owner;
};

const buildProject = (creatorId: string): Project => {
	const project = new Project();
	project.id = 'project-456';
	project.type = 'personal';
	project.name = 'Test Owner <owner@example.com>';
	project.creatorId = creatorId;
	return project;
};

describe('ensureOwner', () => {
	const userRepository = mockInstance(UserRepository);
	const projectRepository = mockInstance(ProjectRepository);
	const projectRelationRepository = mockInstance(ProjectRelationRepository);
	const settingsRepository = mockInstance(SettingsRepository);

	beforeEach(() => {
		jest.clearAllMocks();
		config.set('userManagement.isInstanceOwnerSetUp', false);

		projectRepository.create.mockImplementation((data) => Object.assign(new Project(), data));
		projectRelationRepository.create.mockImplementation((data) => ({ ...data }) as never);
	});

	test('returns the shell user with role.slug === global:owner', async () => {
		const owner = buildOwner();
		userRepository.findOne.mockResolvedValue(owner);
		projectRepository.getPersonalProjectForUser.mockResolvedValue(buildProject(owner.id));
		settingsRepository.upsert.mockResolvedValue({} as never);

		const result = await ensureOwner();

		expect(result).toBe(owner);
		expect(result.role.slug).toBe(GLOBAL_OWNER_ROLE.slug);
	});

	test('throws UnexpectedError when no shell owner exists', async () => {
		userRepository.findOne.mockResolvedValue(null);

		await expect(ensureOwner()).rejects.toBeInstanceOf(UnexpectedError);
	});

	test('persists userManagement.isInstanceOwnerSetUp = "true" via SettingsRepository', async () => {
		const owner = buildOwner();
		userRepository.findOne.mockResolvedValue(owner);
		projectRepository.getPersonalProjectForUser.mockResolvedValue(buildProject(owner.id));
		settingsRepository.upsert.mockResolvedValue({} as never);

		await ensureOwner();

		expect(settingsRepository.upsert).toHaveBeenCalledWith(
			{
				key: 'userManagement.isInstanceOwnerSetUp',
				value: JSON.stringify(true),
				loadOnStartup: true,
			},
			['key'],
		);
		expect(config.getEnv('userManagement.isInstanceOwnerSetUp')).toBe(true);
	});

	test('creates a personal project when none exists', async () => {
		const owner = buildOwner();
		userRepository.findOne.mockResolvedValue(owner);
		projectRepository.getPersonalProjectForUser.mockResolvedValue(null);
		const savedProject = buildProject(owner.id);
		projectRepository.save.mockResolvedValue(savedProject);
		projectRelationRepository.save.mockResolvedValue({} as never);
		settingsRepository.upsert.mockResolvedValue({} as never);

		await ensureOwner();

		expect(projectRepository.create).toHaveBeenCalledWith({
			type: 'personal',
			name: owner.createPersonalProjectName(),
			creatorId: owner.id,
		});
		expect(projectRepository.save).toHaveBeenCalledTimes(1);
		expect(projectRelationRepository.create).toHaveBeenCalledWith({
			projectId: savedProject.id,
			userId: owner.id,
			role: { slug: PROJECT_OWNER_ROLE_SLUG },
		});
		expect(projectRelationRepository.save).toHaveBeenCalledTimes(1);
	});

	test('skips project creation when a personal project already exists', async () => {
		const owner = buildOwner();
		userRepository.findOne.mockResolvedValue(owner);
		projectRepository.getPersonalProjectForUser.mockResolvedValue(buildProject(owner.id));
		settingsRepository.upsert.mockResolvedValue({} as never);

		await ensureOwner();

		expect(projectRepository.save).not.toHaveBeenCalled();
		expect(projectRelationRepository.save).not.toHaveBeenCalled();
	});

	test('is idempotent — second call returns the same user and does not create a duplicate project', async () => {
		const owner = buildOwner();
		userRepository.findOne.mockResolvedValue(owner);
		settingsRepository.upsert.mockResolvedValue({} as never);

		// First call: no project yet.
		projectRepository.getPersonalProjectForUser.mockResolvedValueOnce(null);
		const savedProject = buildProject(owner.id);
		projectRepository.save.mockResolvedValueOnce(savedProject);
		projectRelationRepository.save.mockResolvedValueOnce({} as never);

		const first = await ensureOwner();

		// Second call: the project from the first call now exists.
		projectRepository.getPersonalProjectForUser.mockResolvedValueOnce(savedProject);
		const second = await ensureOwner();

		expect(second).toBe(first);
		expect(projectRepository.save).toHaveBeenCalledTimes(1);
		expect(projectRelationRepository.save).toHaveBeenCalledTimes(1);
	});
});

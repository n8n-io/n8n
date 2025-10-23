import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import {
	type User,
	type UserRepository,
	type SettingsRepository,
	type RoleRepository,
	type Role,
	type Project,
	type ProjectRepository,
	ProjectRelation,
} from '@n8n/db';
import { type GlobalConfig } from '@n8n/config';
import { PROVISIONING_PREFERENCES_DB_KEY } from '../constants';
import { type ProvisioningConfigDto } from '@n8n/api-types';
import { type Publisher } from '@/scaling/pubsub/publisher.service';
import { type ProjectService } from '@/services/project.service.ee';
import type { EntityManager } from '@n8n/typeorm';

const globalConfig = mock<GlobalConfig>();
const settingsRepository = mock<SettingsRepository>();
const userRepository = mock<UserRepository>();
const entityManager = mock<EntityManager>();
const projectRepository = mock<ProjectRepository>({ manager: entityManager });
const projectService = mock<ProjectService>();

const logger = mock<Logger>();
const publisher = mock<Publisher>();
const roleRepository = mock<RoleRepository>();

const provisioningService = new ProvisioningService(
	globalConfig,
	settingsRepository,
	projectRepository,
	projectService,
	roleRepository,
	userRepository,
	logger,
	publisher,
);

describe('ProvisioningService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		entityManager.transaction.mockImplementation(async (cb) => {
			// @ts-expect-error Mock
			await cb(entityManager);
		});
	});

	const provisioningConfigDto: ProvisioningConfigDto = {
		scopesProvisionInstanceRole: true,
		scopesProvisionProjectRoles: true,
		scopesProvisioningFrequency: 'every_login',
		scopesName: 'n8n_test_scope',
		scopesInstanceRoleClaimName: 'n8n_test_instance_role',
		scopesProjectsRolesClaimName: 'n8n_test_projects_roles',
	};

	describe('init', () => {
		it('should set provisioning config from the result of loadConfig', async () => {
			const originStateLoadConfig = provisioningService.loadConfig;

			provisioningService.loadConfig = jest.fn().mockResolvedValue({ foo: 'bar' });

			await provisioningService.init();
			// @ts-expect-error - provisioningConfig is private and only accessible within the class
			expect(provisioningService.provisioningConfig).toEqual({ foo: 'bar' });

			provisioningService.loadConfig = originStateLoadConfig;
		});
	});

	describe('getConfig', () => {
		it('should set provisioning config from the result of loadConfig, then return it if it is not set', async () => {
			const originStateLoadConfig = provisioningService.loadConfig;
			// @ts-expect-error - provisioningConfig is private and only accessible within the class
			provisioningService.provisioningConfig = undefined;

			provisioningService.loadConfig = jest.fn().mockResolvedValue({ foo: 'bar' });

			const config = await provisioningService.getConfig();
			expect(config).toEqual({ foo: 'bar' });
			expect(provisioningService.loadConfig).toHaveBeenCalledTimes(1);

			provisioningService.loadConfig = originStateLoadConfig;
		});

		it('should return the provisioning config', async () => {
			// @ts-expect-error - provisioningConfig is private and only accessible within the class
			provisioningService.provisioningConfig = { foo: 'bar' };

			const config = await provisioningService.getConfig();
			expect(config).toEqual({ foo: 'bar' });
		});
	});

	describe('loadConfigurationFromDatabase', () => {
		it('should return the provisioning config from the database', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				key: PROVISIONING_PREFERENCES_DB_KEY,
				value: JSON.stringify(provisioningConfigDto),
				loadOnStartup: true,
			});

			const config = await provisioningService.loadConfigurationFromDatabase();
			expect(config).toEqual(provisioningConfigDto);
		});

		it('should return undefined if the provisioning config is not found in the database', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			const config = await provisioningService.loadConfigurationFromDatabase();
			expect(config).toBeUndefined();
		});

		it('should return undefined if the provisioning config is invalid', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				key: PROVISIONING_PREFERENCES_DB_KEY,
				value: 'invalid',
				loadOnStartup: true,
			});

			const config = await provisioningService.loadConfigurationFromDatabase();
			expect(config).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to load Provisioning configuration from database, falling back to default configuration.',
				{ error: expect.any(Error) },
			);
		});
	});

	describe('loadConfig', () => {
		it('should return the provisioning config from the database, overriding the environment configuration', async () => {
			globalConfig.sso.provisioning = provisioningConfigDto;

			const overriddenConfig = {
				scopesProvisionInstanceRole: false,
				scopesProvisionProjectRoles: false,
				scopesProvisioningFrequency: 'never',
				scopesName: 'n8n_test_scope_overridden',
				scopesInstanceRoleClaimName: 'n8n_test_instance_role_overridden',
				scopesProjectsRolesClaimName: 'n8n_test_projects_roles_overridden',
			};
			settingsRepository.findByKey.mockResolvedValue({
				key: PROVISIONING_PREFERENCES_DB_KEY,
				value: JSON.stringify(overriddenConfig),
				loadOnStartup: true,
			});

			const config = await provisioningService.loadConfig();
			expect(config).toEqual(overriddenConfig);
		});

		it('should return the environment configuration if the database configuration is not found', async () => {
			globalConfig.sso.provisioning = provisioningConfigDto;

			settingsRepository.findByKey.mockResolvedValue(null);

			const config = await provisioningService.loadConfig();
			expect(config).toEqual(provisioningConfigDto);
		});
	});

	describe('provisionInstanceRoleForUser', () => {
		it('should do nothing if the role slug is not a string', async () => {
			const user = mock<User>({ role: { slug: 'global:member' } });
			const roleSlug = 123;

			await provisioningService.provisionInstanceRoleForUser(user, roleSlug);
			expect(userRepository.update).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'skipping instance role provisioning. Invalid role type: expected string, received number',
				{ userId: user.id, roleSlug: 123 },
			);
		});

		it('should do nothing if the role matching the slug is not found', async () => {
			const user = mock<User>({ role: { slug: 'global:member' } });
			const roleSlug = 'global:invalid';
			const thrownError = new Error('Role not found');

			roleRepository.findOneOrFail.mockRejectedValue(thrownError);

			await provisioningService.provisionInstanceRoleForUser(user, roleSlug);
			expect(userRepository.update).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				`Skipping instance role provisioning, a role matching the slug ${roleSlug} was not found`,
				{ userId: user.id, roleSlug, error: thrownError },
			);
		});

		it('should do nothing if the user is the last owner', async () => {
			const user = mock<User>({ role: { slug: 'global:owner' } });
			const roleSlug = 'global:member';

			userRepository.count.mockResolvedValue(0);
			roleRepository.findOneOrFail.mockResolvedValue(
				mock<Role>({ slug: 'global:member', roleType: 'global' }),
			);

			await provisioningService.provisionInstanceRoleForUser(user, roleSlug);
			expect(userRepository.update).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				`Skipping instance role provisioning. Cannot remove last owner role: global:owner from user: ${user.id}`,
				{ userId: user.id, roleSlug: 'global:member' },
			);
		});

		it('should allow a user to change from an owner role to a non-owner role, if there are other owners', async () => {
			const user = mock<User>({ role: { slug: 'global:owner' } });
			const roleSlug = 'global:member';
			userRepository.count.mockResolvedValue(1);
			roleRepository.findOneOrFail.mockResolvedValue(
				mock<Role>({ slug: 'global:member', roleType: 'global' }),
			);

			await provisioningService.provisionInstanceRoleForUser(user, roleSlug);
			expect(userRepository.update).toHaveBeenCalledWith(user.id, { role: { slug: roleSlug } });
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('should provision the instance role for the user', async () => {
			const user = mock<User>({ role: { slug: 'global:member' } });
			const roleSlug = 'global:owner';

			roleRepository.findOneOrFail.mockResolvedValue(
				mock<Role>({ slug: 'global:owner', roleType: 'global' }),
			);

			await provisioningService.provisionInstanceRoleForUser(user, roleSlug);
			expect(userRepository.update).toHaveBeenCalledWith(user.id, { role: { slug: roleSlug } });
		});

		it('should do nothing if the role has not changed', async () => {
			const user = mock<User>({ role: { slug: 'global:owner' } });
			const roleSlug = 'global:owner';

			roleRepository.findOneOrFail.mockResolvedValue(
				mock<Role>({ slug: 'global:owner', roleType: 'global' }),
			);

			await provisioningService.provisionInstanceRoleForUser(user, roleSlug);
			expect(userRepository.update).not.toHaveBeenCalled();
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('should do nothing if the role is not a global role', async () => {
			const user = mock<User>({ role: { slug: 'global:member' } });
			const roleSlug = 'global:owner';

			roleRepository.findOneOrFail.mockResolvedValue(
				mock<Role>({ slug: 'global:owner', roleType: 'project' }),
			);

			await provisioningService.provisionInstanceRoleForUser(user, roleSlug);
			expect(userRepository.update).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				`Skipping instance role provisioning. Role ${roleSlug} is not a global role`,
				{ userId: user.id, roleSlug: 'global:owner' },
			);
		});
	});

	describe('provisionProjectRolesForUser', () => {
		it('should do nothing if the projectIdToRole is not a string', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = { not: 'a string' };

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping project role provisioning. Invalid projectIdToRole type: expected string, received object',
				{ userId, projectIdToRole },
			);
		});

		it('should do nothing if projectIdToRole is not a valid JSON string', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = 'invalid-json-string';

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping project role provisioning. Failed to parse project to role mapping.',
				{ userId, projectIdToRole },
			);
		});

		it('should filter out entries where key:value is not a string', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = JSON.stringify({ project_1: { nested: 'object' } }); // invalid value type

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping project role mapping for project_1:[object Object]. Invalid types: expected both key and value to be strings.',
				{ userId },
			);
		});

		it('should do nothing if the project does not exist', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = JSON.stringify({
				'non-existent-project': 'project:viewer',
			});
			projectRepository.find.mockResolvedValue([]);
			roleRepository.find.mockResolvedValue([mock<Role>({ slug: 'project:viewer' })]);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).not.toHaveBeenCalled();
		});

		it('should do nothing if the provided role does not exist', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = JSON.stringify({
				'project-1': 'project:non-existent-role',
			});
			projectRepository.find.mockResolvedValue([mock<Project>({ id: 'project-1' })]);
			roleRepository.find.mockResolvedValue([]);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).not.toHaveBeenCalled();
		});

		it('should do nothing if no valid project to role mappings are found', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = {
				nonExistentProject: 'non-existent-role',
				anotherNonExistentProject: 'project:viewer',
			};
			// Mock that no projects exist
			projectRepository.find.mockResolvedValueOnce([]);
			// Mock that roles exist but projects don't
			roleRepository.find.mockResolvedValue([mock<Role>({ slug: 'project:viewer' })]);

			await provisioningService.provisionProjectRolesForUser(
				userId,
				JSON.stringify(projectIdToRole),
			);

			expect(projectService.addUser).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping project role provisioning altogether. No valid project to role mappings found.',
				{
					userId,
					projectRoleMap: projectIdToRole,
				},
			);
		});

		it('should skip projectIds that reference a personal project', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = JSON.stringify({
				personalProject1: 'project:viewer',
				teamProject1: 'project:editor',
			});
			// Mocks query to find existing projects
			projectRepository.find.mockResolvedValueOnce([mock<Project>({ id: 'teamProject1' })]);
			// Mocks query to find currently accessible projects
			projectRepository.find.mockResolvedValueOnce([]);
			roleRepository.find.mockResolvedValue([
				mock<Role>({ slug: 'project:viewer' }),
				mock<Role>({ slug: 'project:editor' }),
			]);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).toHaveBeenCalledTimes(1);
			expect(projectService.addUser).toHaveBeenCalledWith(
				'teamProject1',
				{ userId, role: 'project:editor' },
				entityManager,
			);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping project role provisioning. Project with ID personalProject1 not found.',
				{ userId, projectId: 'personalProject1', roleSlug: 'project:viewer' },
			);
		});

		it('should provision project roles for the user', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = JSON.stringify({
				'project-1': 'project:viewer',
				'project-2': 'project:editor',
			});
			// Mocks query to find existing projects
			projectRepository.find.mockResolvedValueOnce([
				mock<Project>({ id: 'project-1' }),
				mock<Project>({ id: 'project-2' }),
			]);
			// Mocks query to find currently accessible projects
			projectRepository.find.mockResolvedValueOnce([]);
			roleRepository.find.mockResolvedValue([
				mock<Role>({ slug: 'project:viewer' }),
				mock<Role>({ slug: 'project:editor' }),
			]);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).toHaveBeenCalledTimes(2);
			expect(projectService.addUser).toHaveBeenCalledWith(
				'project-1',
				{ userId, role: 'project:viewer' },
				entityManager,
			);
			expect(projectService.addUser).toHaveBeenCalledWith(
				'project-2',
				{ userId, role: 'project:editor' },
				entityManager,
			);
		});
		it('should filter out non-project roles', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = JSON.stringify({
				project1: 'global:admin',
			});
			projectRepository.find.mockResolvedValue([mock<Project>({ id: 'project1' })]);
			roleRepository.find.mockResolvedValue([]);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping project role provisioning. Role with slug global:admin not found or is not a project role.',
				{ userId, projectId: 'project1', roleSlug: 'global:admin' },
			);
		});

		it('removes existing access to non-personal projects that are no longer present in the provided mapping', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = JSON.stringify({
				'project-1': 'project:viewer',
			});
			// Mocks query to find existing projects
			projectRepository.find.mockResolvedValueOnce([mock<Project>({ id: 'project-1' })]);
			// Mocks query to find currently accessible projects
			projectRepository.find.mockResolvedValueOnce([
				mock<Project>({ id: 'project-1', type: 'team' }),
				mock<Project>({ id: 'project-2', type: 'team' }),
			]);
			roleRepository.find.mockResolvedValue([mock<Role>({ slug: 'project:viewer' })]);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(entityManager.transaction).toHaveBeenCalledTimes(1);
			expect(entityManager.delete).toHaveBeenCalledWith(ProjectRelation, {
				projectId: 'project-2',
				userId,
			});
			expect(projectService.addUser).toHaveBeenCalledWith(
				'project-1',
				{ userId, role: 'project:viewer' },
				entityManager,
			);
		});
	});

	describe('handleReloadSsoProvisioningConfiguration', () => {
		it('should reload the provisioning config', async () => {
			const originStateLoadConfig = provisioningService.loadConfig;
			provisioningService.loadConfig = jest.fn().mockResolvedValue({ foo: 'bar' });

			await provisioningService.handleReloadSsoProvisioningConfiguration();
			// @ts-expect-error - provisioningConfig is private and only accessible within the class
			expect(provisioningService.provisioningConfig).toEqual({ foo: 'bar' });

			provisioningService.loadConfig = originStateLoadConfig;
		});
	});

	describe('patchConfig', () => {
		it('should patch the provisioning config, sending out pubsub updates for other nodes to reload', async () => {
			const originStateLoadConfig = provisioningService.loadConfig;
			const originStateGetConfig = provisioningService.getConfig;

			provisioningService.getConfig = jest
				.fn()
				.mockResolvedValueOnce(provisioningConfigDto)
				.mockResolvedValueOnce({ ...provisioningConfigDto, scopesProvisionInstanceRole: false });
			provisioningService.loadConfig = jest
				.fn()
				.mockResolvedValue({ ...provisioningConfigDto, scopesProvisionInstanceRole: false });

			const config = await provisioningService.patchConfig({ scopesProvisionInstanceRole: false });
			expect(config).toEqual({ ...provisioningConfigDto, scopesProvisionInstanceRole: false });
			expect(provisioningService.loadConfig).toHaveBeenCalledTimes(1);
			expect(provisioningService.getConfig).toHaveBeenCalledTimes(2);
			expect(settingsRepository.update).toHaveBeenCalledTimes(1);
			expect(publisher.publishCommand).toHaveBeenCalledTimes(1);
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-sso-provisioning-configuration',
			});

			provisioningService.loadConfig = originStateLoadConfig;
			provisioningService.getConfig = originStateGetConfig;
		});
	});
});

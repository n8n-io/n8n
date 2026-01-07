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
import { type InstanceSettings } from 'n8n-core';
import { type EventService } from '@/events/event.service';
import { type UserService } from '@/services/user.service';

const globalConfig = mock<GlobalConfig>();
const settingsRepository = mock<SettingsRepository>();
const userRepository = mock<UserRepository>();
const userService = mock<UserService>();
const entityManager = mock<EntityManager>();
const projectRepository = mock<ProjectRepository>({ manager: entityManager });
const projectService = mock<ProjectService>();
const eventService = mock<EventService>();

const logger = mock<Logger>();
const publisher = mock<Publisher>();
const roleRepository = mock<RoleRepository>();
const instanceSettings = mock<InstanceSettings>();

const provisioningService = new ProvisioningService(
	eventService,
	globalConfig,
	settingsRepository,
	projectRepository,
	projectService,
	roleRepository,
	userRepository,
	userService,
	logger,
	publisher,
	instanceSettings,
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

			provisioningService['isInstanceRoleProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

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

			provisioningService['isInstanceRoleProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

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

			provisioningService['isInstanceRoleProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

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
			provisioningService['isInstanceRoleProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

			await provisioningService.provisionInstanceRoleForUser(user, roleSlug);

			expect(userService.changeUserRole).toHaveBeenCalledWith(user, { newRoleName: roleSlug });
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('should provision the instance role for the user', async () => {
			const user = mock<User>({ role: { slug: 'global:member' } });
			const roleSlug = 'global:owner';
			roleRepository.findOneOrFail.mockResolvedValue(
				mock<Role>({ slug: 'global:owner', roleType: 'global' }),
			);
			provisioningService['isInstanceRoleProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

			await provisioningService.provisionInstanceRoleForUser(user, roleSlug);

			expect(userService.changeUserRole).toHaveBeenCalledWith(user, { newRoleName: roleSlug });
		});

		it('should do nothing if the role has not changed', async () => {
			const user = mock<User>({ role: { slug: 'global:owner' } });
			const roleSlug = 'global:owner';
			roleRepository.findOneOrFail.mockResolvedValue(
				mock<Role>({ slug: 'global:owner', roleType: 'global' }),
			);
			provisioningService['isInstanceRoleProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

			await provisioningService.provisionInstanceRoleForUser(user, roleSlug);

			expect(userService.changeUserRole).not.toHaveBeenCalled();
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('should do nothing if the role is not a global role', async () => {
			const user = mock<User>({ role: { slug: 'global:member' } });
			const roleSlug = 'global:owner';
			roleRepository.findOneOrFail.mockResolvedValue(
				mock<Role>({ slug: 'global:owner', roleType: 'project' }),
			);
			provisioningService['isInstanceRoleProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

			await provisioningService.provisionInstanceRoleForUser(user, roleSlug);

			expect(userService.changeUserRole).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				`Skipping instance role provisioning. Role ${roleSlug} is not a global role`,
				{ userId: user.id, roleSlug: 'global:owner' },
			);
		});

		it('sends telemetry event', async () => {
			const user = mock<User>({ id: 'user-123', role: { slug: 'global:member' } });
			const roleSlug = 'global:owner';

			roleRepository.findOneOrFail.mockResolvedValue(
				mock<Role>({ slug: 'global:owner', roleType: 'global' }),
			);

			provisioningService['isInstanceRoleProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

			await provisioningService.provisionInstanceRoleForUser(user, roleSlug);

			expect(eventService.emit).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('sso-user-instance-role-updated', {
				userId: user.id,
				role: roleSlug,
			});
		});
	});

	describe('provisionProjectRolesForUser', () => {
		it('should do nothing if the projectIdToRole is not an array', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = { not: 'an array' };

			provisioningService['isProjectRolesProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping project role provisioning. Invalid projectIdToRole type: expected array, received object',
				{ userId, projectIdToRoles: projectIdToRole },
			);
		});

		it('should do nothing if projectIdToRole is not an array', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = 'invalid-json-string';

			provisioningService['isProjectRolesProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping project role provisioning. Invalid projectIdToRole type: expected array, received string',
				{ userId, projectIdToRoles: projectIdToRole },
			);
		});

		it('should filter out entries where key:value is not a string', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = [{ projectId: 'project-1', role: 'viewer' }]; // invalid value type

			provisioningService['isProjectRolesProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping invalid project role mapping entry. Expected string, received object.',
				{ userId, entry: projectIdToRole[0] },
			);
		});

		it('should do nothing if the project does not exist', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = ['non-existent-project:viewer'];
			projectRepository.find.mockResolvedValue([]);
			roleRepository.find.mockResolvedValue([mock<Role>({ slug: 'project:viewer' })]);

			provisioningService['isProjectRolesProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).not.toHaveBeenCalled();
		});

		it('should do nothing if the provided role does not exist', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = ['project-1:non-existent-role'];
			projectRepository.find.mockResolvedValue([mock<Project>({ id: 'project-1' })]);
			roleRepository.find.mockResolvedValue([]);

			provisioningService['isProjectRolesProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).not.toHaveBeenCalled();
		});

		it('should do nothing if no valid project to role mappings are found', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = [
				'nonExistentProject:non-existent-role',
				'anotherNonExistentProject:viewer',
			];
			// Mock that no projects exist
			projectRepository.find.mockResolvedValueOnce([]);
			// Mock that roles exist but projects don't
			roleRepository.find.mockResolvedValue([
				mock<Role>({ displayName: 'viewer', slug: 'project:viewer' }),
			]);

			provisioningService['isProjectRolesProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped provisioning project role for project with ID nonExistentProject, because project does not exist or is a personal project.',
				{
					userId,
					projectId: 'nonExistentProject',
					roleSlug: 'project:non-existent-role',
				},
			);
		});

		it('should skip projectIds that reference a personal project', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = ['personalProject1:viewer', 'teamProject1:editor'];
			// Mocks query to find existing projects
			projectRepository.find.mockResolvedValueOnce([mock<Project>({ id: 'teamProject1' })]);
			// Mocks query to find currently accessible projects
			projectRepository.find.mockResolvedValueOnce([]);
			roleRepository.find.mockResolvedValue([
				mock<Role>({ displayName: 'viewer', slug: 'project:viewer' }),
				mock<Role>({ displayName: 'editor', slug: 'project:editor' }),
			]);

			provisioningService['isProjectRolesProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).toHaveBeenCalledTimes(1);
			expect(projectService.addUser).toHaveBeenCalledWith(
				'teamProject1',
				{ userId, role: 'project:editor' },
				entityManager,
			);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped provisioning project role for project with ID personalProject1, because project does not exist or is a personal project.',
				{ userId, projectId: 'personalProject1', roleSlug: 'project:viewer' },
			);
		});

		it('should provision project roles for the user', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = ['project-1:viewer', 'project-2:editor'];
			// Mocks query to find existing projects
			projectRepository.find.mockResolvedValueOnce([
				mock<Project>({ id: 'project-1' }),
				mock<Project>({ id: 'project-2' }),
			]);
			// Mocks query to find currently accessible projects
			projectRepository.find.mockResolvedValueOnce([]);
			roleRepository.find.mockResolvedValue([
				mock<Role>({ displayName: 'viewer', slug: 'project:viewer' }),
				mock<Role>({ displayName: 'editor', slug: 'project:editor' }),
			]);

			provisioningService['isProjectRolesProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

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
			const projectIdToRole = ['project1:admin'];
			projectRepository.find.mockResolvedValue([mock<Project>({ id: 'project1' })]);
			roleRepository.find.mockResolvedValue([]);

			provisioningService['isProjectRolesProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(projectService.addUser).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping project role provisioning for role with slug project:admin, because role does not exist or is not specific to projects.',
				{ userId, projectId: 'project1', roleSlug: 'project:admin' },
			);
		});

		it('removes existing access to non-personal projects that are no longer present in the provided mapping', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = ['project-1:viewer'];
			// Mocks query to find existing projects
			projectRepository.find.mockResolvedValueOnce([mock<Project>({ id: 'project-1' })]);
			// Mocks query to find currently accessible projects
			projectRepository.find.mockResolvedValueOnce([
				mock<Project>({ id: 'project-1', type: 'team' }),
				mock<Project>({ id: 'project-2', type: 'team' }),
			]);
			roleRepository.find.mockResolvedValue([
				mock<Role>({ displayName: 'viewer', slug: 'project:viewer' }),
			]);

			provisioningService['isProjectRolesProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

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

		it('sends telemetry event', async () => {
			const userId = 'user-id-123';
			const projectIdToRole = ['project-1:viewer', 'project-2:editor'];
			projectRepository.find.mockResolvedValueOnce([
				mock<Project>({ id: 'project-1' }),
				mock<Project>({ id: 'project-2' }),
			]);
			projectRepository.find.mockResolvedValueOnce([
				mock<Project>({ id: 'project-3', type: 'team' }),
			]);
			roleRepository.find.mockResolvedValue([
				mock<Role>({ displayName: 'viewer', slug: 'project:viewer' }),
				mock<Role>({ displayName: 'editor', slug: 'project:editor' }),
			]);

			provisioningService['isProjectRolesProvisioningEnabled'] = jest.fn().mockResolvedValue(true);

			await provisioningService.provisionProjectRolesForUser(userId, projectIdToRole);

			expect(eventService.emit).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('sso-user-project-access-updated', {
				projectsAdded: 2,
				projectsRemoved: 1,
				userId,
			});
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
		it('should patch the provisioning config, sending out pubsub updates for other nodes to reload in multi-main setup', async () => {
			(instanceSettings as any).isMultiMain = true;
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
			expect(settingsRepository.upsert).toHaveBeenCalledTimes(1);
			expect(publisher.publishCommand).toHaveBeenCalledTimes(1);
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-sso-provisioning-configuration',
			});

			provisioningService.loadConfig = originStateLoadConfig;
			provisioningService.getConfig = originStateGetConfig;
		});
	});

	describe('isProvisioningEnabled', () => {
		it('should return true if the provisioning config is enabled', async () => {
			const originStateGetConfig = provisioningService.getConfig;

			const provisioningConfig = {
				...provisioningConfigDto,
				scopesProvisionInstanceRole: true,
				scopesProvisionProjectRoles: true,
			};
			provisioningService.getConfig = jest.fn().mockResolvedValue(provisioningConfig);
			const isProvisioningEnabled = await provisioningService.isProvisioningEnabled();
			expect(isProvisioningEnabled).toBe(true);

			provisioningService.getConfig = originStateGetConfig;
		});

		it('should return false if the provisioning config is not enabled', async () => {
			const originStateGetConfig = provisioningService.getConfig;

			const provisioningConfig = {
				...provisioningConfigDto,
				scopesProvisionInstanceRole: false,
				scopesProvisionProjectRoles: false,
			};
			provisioningService.getConfig = jest.fn().mockResolvedValue(provisioningConfig);
			const isProvisioningEnabled = await provisioningService.isProvisioningEnabled();
			expect(isProvisioningEnabled).toBe(false);

			provisioningService.getConfig = originStateGetConfig;
		});
	});
});

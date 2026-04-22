import { ProvisioningConfigDto, ProvisioningConfigPatchDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import {
	RoleRepository,
	RoleMappingRuleRepository,
	SettingsRepository,
	User,
	UserRepository,
	Role,
	ProjectRepository,
	ProjectRelation,
} from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { Not, In } from '@n8n/typeorm';
import { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { ZodError } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { ProjectService } from '@/services/project.service.ee';
import { UserService } from '@/services/user.service';

import { PROVISIONING_PREFERENCES_DB_KEY } from './constants';
import type { RoleMappingConfig, ResolvedRoles, RoleResolverContext } from './role-resolver-types';
import { RoleResolverService } from './role-resolver.service.ee';

export function isExpressionMappingFlagEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_ROLE_MAPPING_STRATEGY === 'true';
}

@Service()
export class ProvisioningService {
	private provisioningConfig: ProvisioningConfigDto;

	constructor(
		private readonly eventService: EventService,
		private readonly globalConfig: GlobalConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly roleRepository: RoleRepository,
		private readonly userRepository: UserRepository,
		private readonly userService: UserService,
		private readonly logger: Logger,
		private readonly publisher: Publisher,
		private readonly instanceSettings: InstanceSettings,
		private readonly roleMappingRuleRepository: RoleMappingRuleRepository,
		private readonly roleResolverService: RoleResolverService,
	) {}

	async init() {
		this.provisioningConfig = await this.loadConfig();
	}

	async getConfig(): Promise<ProvisioningConfigDto> {
		if (!this.provisioningConfig) {
			this.provisioningConfig = await this.loadConfig();
		}

		return this.provisioningConfig;
	}

	async provisionInstanceRoleForUser(user: User, roleSlug: unknown) {
		if (!(await this.isInstanceRoleProvisioningEnabled())) {
			return;
		}

		const globalOwnerRoleSlug = 'global:owner';

		if (typeof roleSlug !== 'string') {
			this.logger.warn(
				`skipping instance role provisioning. Invalid role type: expected string, received ${typeof roleSlug}`,
				{
					userId: user.id,
					roleSlug,
				},
			);
			return;
		}

		let dbRole: Role;

		try {
			dbRole = await this.roleRepository.findOneOrFail({ where: { slug: roleSlug } });
		} catch (error) {
			this.logger.warn(
				`Skipping instance role provisioning, a role matching the slug ${roleSlug} was not found`,
				{ userId: user.id, roleSlug, error },
			);
			return;
		}

		if (dbRole.roleType !== 'global') {
			this.logger.warn(
				`Skipping instance role provisioning. Role ${roleSlug} is not a global role`,
				{ userId: user.id, roleSlug },
			);
			return;
		}

		/*
		 * If the user is changing from an owner to a non-owner role,
		 * we need to check if they are the last owner to avoid an instance losing its only owner
		 */
		if (user.role.slug === globalOwnerRoleSlug && dbRole.slug !== globalOwnerRoleSlug) {
			const otherOwners = await this.userRepository.count({
				where: { role: { slug: globalOwnerRoleSlug }, id: Not(user.id) },
			});

			if (otherOwners === 0) {
				this.logger.warn(
					`Skipping instance role provisioning. Cannot remove last owner role: ${globalOwnerRoleSlug} from user: ${user.id}`,
					{ userId: user.id, roleSlug },
				);
				return;
			}
		}

		// No need to update record if the role hasn't changed
		if (user.role.slug !== dbRole.slug) {
			await this.userService.changeUserRole(user, { newRoleName: dbRole.slug });

			this.eventService.emit('sso-user-instance-role-updated', {
				userId: user.id,
				role: dbRole.slug,
			});
		}
	}

	/**
	 * @param projectIdToRole expected to be an array of strings like this:
	 * [
	 *   "<projectUuid>:<projectRoleDisplayName>",
	 *   "<projectUuid>:<projectRoleDisplayName>",
	 *   ...
	 * ]
	 */
	async provisionProjectRolesForUser(userId: string, projectIdToRoles: unknown): Promise<void> {
		if (!(await this.isProjectRolesProvisioningEnabled())) {
			return;
		}

		if (!Array.isArray(projectIdToRoles)) {
			this.logger.warn(
				`Skipping project role provisioning. Invalid projectIdToRole type: expected array, received ${typeof projectIdToRoles}`,
				{ userId, projectIdToRoles },
			);
			return;
		}

		let projectRoleMap: Record<string, string>;
		try {
			projectRoleMap = {};
			for (const entry of projectIdToRoles) {
				if (typeof entry !== 'string') {
					this.logger.warn(
						`Skipping invalid project role mapping entry. Expected string, received ${typeof entry}.`,
						{ userId, entry },
					);
					continue;
				}

				const [projectId, roleSlugSuffix] = entry.split(':');
				if (!projectId || !roleSlugSuffix) {
					this.logger.warn(
						`Skipping invalid project role mapping entry. Expected format "projectId:displayName", received "${entry}".`,
						{ userId, entry },
					);
					continue;
				}

				// This means that if the external SSO setup has two roles configured
				// for the same projectId, we only provision the one we see last in the sent list.
				projectRoleMap[projectId] = `project:${roleSlugSuffix}`;
			}
		} catch (error) {
			this.logger.warn(
				'Skipping project role provisioning. Failed to parse project to role mapping.',
				{ userId, projectIdToRoles },
			);
			return;
		}

		const projectIds = Object.keys(projectRoleMap);
		const roleSlugs = [...new Set(Object.values(projectRoleMap))];

		if (projectIds.length === 0) {
			return;
		}

		const [existingProjects, existingRoles] = await Promise.all([
			this.projectRepository.find({
				where: { id: In(projectIds), type: Not('personal') },
				select: ['id'],
			}),
			this.roleRepository.find({
				where: {
					slug: In(roleSlugs),
					roleType: 'project',
				},
				select: ['displayName', 'slug'],
			}),
		]);
		const existingProjectIds = new Set(existingProjects.map((project) => project.id));

		const validProjectToRoleMappings: Array<{ projectId: string; roleSlug: string }> = [];

		// populate validProjectToRoleMappings
		for (const [projectId, roleSlug] of Object.entries(projectRoleMap)) {
			if (!existingProjectIds.has(projectId)) {
				this.logger.warn(
					`Skipped provisioning project role for project with ID ${projectId}, because project does not exist or is a personal project.`,
					{ userId, projectId, roleSlug },
				);
				continue;
			}
			const role = existingRoles.find((role) => role.slug === roleSlug);
			if (!role) {
				this.logger.warn(
					`Skipping project role provisioning for role with slug ${roleSlug}, because role does not exist or is not specific to projects.`,
					{ userId, projectId, roleSlug },
				);
				continue;
			}

			validProjectToRoleMappings.push({ projectId, roleSlug: role.slug });
		}

		if (validProjectToRoleMappings.length === 0) {
			this.logger.warn(
				'Skipping project role provisioning altogether. No valid project to role mappings found.',
				{ userId, projectRoleMap },
			);
			return;
		}

		const currentlyAccessibleProjects = await this.projectRepository.find({
			where: {
				type: Not('personal'),
				projectRelations: {
					userId,
				},
			},
			relations: ['projectRelations'],
		});

		const validProjectIds = new Set(validProjectToRoleMappings.map((m) => m.projectId));
		const projectsToRemoveAccessFrom = currentlyAccessibleProjects.filter(
			(project) => !validProjectIds.has(project.id),
		);

		await this.projectRepository.manager.transaction(async (tx) => {
			for (const project of projectsToRemoveAccessFrom) {
				await tx.delete(ProjectRelation, { projectId: project.id, userId });
			}

			for (const { projectId, roleSlug } of validProjectToRoleMappings) {
				await this.projectService.addUser(projectId, { userId, role: roleSlug }, tx);
			}
		});

		this.eventService.emit('sso-user-project-access-updated', {
			projectsAdded: validProjectIds.size,
			projectsRemoved: projectsToRemoveAccessFrom.length,
			userId,
		});
	}

	async patchConfig(rawConfig: unknown): Promise<ProvisioningConfigDto> {
		let patchConfig: ProvisioningConfigPatchDto;

		try {
			patchConfig = ProvisioningConfigPatchDto.parse(rawConfig);
		} catch (error) {
			if (error instanceof ZodError) {
				throw new BadRequestError(error.message);
			}

			throw error;
		}

		const currentConfig = await this.getConfig();

		const supportedPatchFields = [
			'scopesProvisionInstanceRole',
			'scopesProvisionProjectRoles',
			'scopesName',
			'scopesInstanceRoleClaimName',
			'scopesProjectsRolesClaimName',
			'scopesUseExpressionMapping',
		] as const;

		const updatedConfig: Record<string, unknown> = {
			...currentConfig,
			...patchConfig,
		};

		for (const supportedPatchField of supportedPatchFields) {
			if (patchConfig[supportedPatchField] === null) {
				delete updatedConfig[supportedPatchField];
			}
		}

		if (
			updatedConfig.scopesUseExpressionMapping &&
			(updatedConfig.scopesProvisionInstanceRole || updatedConfig.scopesProvisionProjectRoles)
		) {
			throw new BadRequestError(
				'Expression-based mapping and direct-claim provisioning cannot both be enabled at the same time.',
			);
		}

		ProvisioningConfigDto.parse(updatedConfig);

		await this.settingsRepository.upsert(
			{
				key: PROVISIONING_PREFERENCES_DB_KEY,
				value: JSON.stringify(updatedConfig),
				loadOnStartup: true,
			},
			{ conflictPaths: ['key'] },
		);

		this.provisioningConfig = await this.loadConfig();

		if (this.instanceSettings.isMultiMain) {
			await this.publisher.publishCommand({ command: 'reload-sso-provisioning-configuration' });
		}

		return await this.getConfig();
	}

	@OnPubSubEvent('reload-sso-provisioning-configuration')
	async handleReloadSsoProvisioningConfiguration() {
		this.provisioningConfig = await this.loadConfig();
	}

	async loadConfigurationFromDatabase(): Promise<ProvisioningConfigDto | undefined> {
		const configFromDB = await this.settingsRepository.findByKey(PROVISIONING_PREFERENCES_DB_KEY);

		if (configFromDB) {
			try {
				const configValue = jsonParse<ProvisioningConfigDto>(configFromDB.value);

				return ProvisioningConfigDto.parse(configValue);
			} catch (error) {
				this.logger.warn(
					'Failed to load Provisioning configuration from database, falling back to default configuration.',

					{ error },
				);
			}
		}
		return undefined;
	}

	async loadConfig(): Promise<ProvisioningConfigDto> {
		const envProvidedConfig = ProvisioningConfigDto.parse(this.globalConfig.sso.provisioning);

		const dbProvidedConfig = await this.loadConfigurationFromDatabase();

		if (dbProvidedConfig) {
			return {
				...envProvidedConfig,
				...dbProvidedConfig,
			};
		}

		return envProvidedConfig;
	}

	async getInstanceRoleClaimName(): Promise<string | null> {
		if (!(await this.isInstanceRoleProvisioningEnabled())) {
			return null;
		}
		const provisioningConfig = await this.getConfig();
		return provisioningConfig.scopesInstanceRoleClaimName;
	}

	async getProjectsRolesClaimName(): Promise<string | null> {
		if (!(await this.isProjectRolesProvisioningEnabled())) {
			return null;
		}
		const provisioningConfig = await this.getConfig();
		return provisioningConfig.scopesProjectsRolesClaimName;
	}

	async isProvisioningEnabled(): Promise<boolean> {
		const provisioningConfig = await this.getConfig();
		return (
			provisioningConfig.scopesProvisionInstanceRole ||
			provisioningConfig.scopesProvisionProjectRoles
		);
	}

	private async isInstanceRoleProvisioningEnabled(): Promise<boolean> {
		const provisioningConfig = await this.getConfig();
		return provisioningConfig.scopesProvisionInstanceRole;
	}

	private async isProjectRolesProvisioningEnabled(): Promise<boolean> {
		const provisioningConfig = await this.getConfig();
		return provisioningConfig.scopesProvisionProjectRoles;
	}

	async isExpressionMappingEnabled(): Promise<boolean> {
		if (!isExpressionMappingFlagEnabled()) return false;
		const provisioningConfig = await this.getConfig();
		return provisioningConfig.scopesUseExpressionMapping;
	}

	async isInstanceRoleManaged(): Promise<boolean> {
		return (
			(await this.isInstanceRoleProvisioningEnabled()) || (await this.isExpressionMappingEnabled())
		);
	}

	async isProjectRoleManaged(): Promise<boolean> {
		return (
			(await this.isProjectRolesProvisioningEnabled()) || (await this.isExpressionMappingEnabled())
		);
	}

	private async buildRoleMappingConfig(): Promise<RoleMappingConfig> {
		const dbRules = await this.roleMappingRuleRepository.find({
			relations: ['role', 'projects'],
			order: { order: 'ASC' },
		});

		const instanceRoleRules: RoleMappingConfig['instanceRoleRules'] = [];
		const projectRoleRules: RoleMappingConfig['projectRoleRules'] = [];

		for (const dbRule of dbRules) {
			if (dbRule.type === 'instance') {
				instanceRoleRules.push({
					id: dbRule.id,
					expression: dbRule.expression,
					role: dbRule.role.slug,
					enabled: true,
				});
			} else {
				for (const project of dbRule.projects) {
					projectRoleRules.push({
						id: `${dbRule.id}:${project.id}`,
						expression: dbRule.expression,
						role: dbRule.role.slug,
						projectId: project.id,
						enabled: true,
					});
				}
			}
		}

		return { instanceRoleRules, projectRoleRules, fallbackInstanceRole: 'global:member' };
	}

	private async applyExpressionMappedRoles(user: User, resolved: ResolvedRoles): Promise<void> {
		const projectRolesMap = new Map<string, string>();
		for (const [projectId, pr] of resolved.projectRoles) {
			projectRolesMap.set(projectId, pr.role);
		}

		await this.applyExpressionMappedInstanceRole(user, resolved.instanceRole.role);
		await this.applyExpressionMappedProjectRoles(user.id, projectRolesMap);
	}

	private async getPreviousProjectRoles(userId: string): Promise<Record<string, string>> {
		const projects = await this.projectRepository.find({
			where: { type: Not('personal'), projectRelations: { userId } },
			relations: ['projectRelations', 'projectRelations.role'],
		});
		const result: Record<string, string> = {};
		for (const project of projects) {
			const relation = project.projectRelations.find((r) => r.userId === userId);
			if (relation) {
				result[project.id] = relation.role.slug;
			}
		}
		return result;
	}

	private async applyExpressionMappedInstanceRole(
		user: User,
		instanceRoleSlug: string,
	): Promise<void> {
		let dbRole: Role;
		try {
			dbRole = await this.roleRepository.findOneOrFail({ where: { slug: instanceRoleSlug } });
		} catch {
			this.logger.warn(
				`Expression mapping: skipping instance role, slug "${instanceRoleSlug}" not found`,
				{ userId: user.id },
			);
			return;
		}

		if (dbRole.roleType !== 'global') {
			this.logger.warn(
				`Expression mapping: skipping instance role, "${instanceRoleSlug}" is not a global role`,
				{ userId: user.id },
			);
			return;
		}

		const globalOwnerRoleSlug = 'global:owner';
		if (user.role.slug === globalOwnerRoleSlug && dbRole.slug !== globalOwnerRoleSlug) {
			const otherOwners = await this.userRepository.count({
				where: { role: { slug: globalOwnerRoleSlug }, id: Not(user.id) },
			});
			if (otherOwners === 0) {
				this.logger.warn(
					'Expression mapping: skipping instance role update, cannot demote last owner',
					{ userId: user.id },
				);
				return;
			}
		}

		if (user.role.slug !== dbRole.slug) {
			await this.userService.changeUserRole(user, { newRoleName: dbRole.slug });
			this.eventService.emit('sso-user-instance-role-updated', {
				userId: user.id,
				role: dbRole.slug,
			});
		}
	}

	private async applyExpressionMappedProjectRoles(
		userId: string,
		projectRoleMap: Map<string, string>,
	): Promise<void> {
		// Fetch existing access first so revocation always runs, even when projectRoleMap is empty
		const currentlyAccessibleProjects = await this.projectRepository.find({
			where: { type: Not('personal'), projectRelations: { userId } },
			relations: ['projectRelations'],
		});

		const validMappings: Array<{ projectId: string; roleSlug: string }> = [];

		if (projectRoleMap.size > 0) {
			const projectIds = [...projectRoleMap.keys()];
			const roleSlugs = [...new Set(projectRoleMap.values())];

			const [existingProjects, existingRoles] = await Promise.all([
				this.projectRepository.find({
					where: { id: In(projectIds), type: Not('personal') },
					select: ['id'],
				}),
				this.roleRepository.find({
					where: { slug: In(roleSlugs), roleType: 'project' },
					select: ['displayName', 'slug'],
				}),
			]);

			const existingProjectIds = new Set(existingProjects.map((p) => p.id));

			for (const [projectId, roleSlug] of projectRoleMap.entries()) {
				if (!existingProjectIds.has(projectId)) {
					this.logger.warn(
						`Expression mapping: skipping project ${projectId}, not found or is a personal project`,
						{ userId, projectId, roleSlug },
					);
					continue;
				}
				const role = existingRoles.find((r) => r.slug === roleSlug);
				if (!role) {
					this.logger.warn(
						`Expression mapping: skipping role "${roleSlug}", not found or not a project role`,
						{ userId, projectId, roleSlug },
					);
					continue;
				}
				validMappings.push({ projectId, roleSlug: role.slug });
			}
		}

		const validProjectIds = new Set(validMappings.map((m) => m.projectId));
		const projectsToRemoveAccessFrom = currentlyAccessibleProjects.filter(
			(p) => !validProjectIds.has(p.id),
		);

		if (projectsToRemoveAccessFrom.length === 0 && validMappings.length === 0) return;

		await this.projectRepository.manager.transaction(async (tx) => {
			for (const project of projectsToRemoveAccessFrom) {
				await tx.delete(ProjectRelation, { projectId: project.id, userId });
			}
			for (const { projectId, roleSlug } of validMappings) {
				await this.projectService.addUser(projectId, { userId, role: roleSlug }, tx);
			}
		});

		this.eventService.emit('sso-user-project-access-updated', {
			projectsAdded: validProjectIds.size,
			projectsRemoved: projectsToRemoveAccessFrom.length,
			userId,
		});
	}

	async provisionExpressionMappedRolesForUser(
		user: User,
		context: RoleResolverContext,
	): Promise<void> {
		if (!(await this.isExpressionMappingEnabled())) return;

		const previousInstanceRole = user.role.slug;
		const previousProjectRoles = await this.getPreviousProjectRoles(user.id);

		const config = await this.buildRoleMappingConfig();
		const resolved = await this.roleResolverService.resolveRoles(config, context);

		await this.applyExpressionMappedRoles(user, resolved);

		const newInstanceRole = resolved.instanceRole;
		const projectRoles = [...resolved.projectRoles.values()].map((pr) => {
			const prev = previousProjectRoles[pr.projectId] ?? null;
			return { ...pr, previousRole: prev, changed: prev !== pr.role };
		});
		const removedProjectIds = Object.keys(previousProjectRoles).filter(
			(id) => !resolved.projectRoles.has(id),
		);

		this.eventService.emit('expression-mapping-roles-resolved', {
			userId: user.id,
			userEmail: user.email,
			provider: context.$provider,
			instanceRole: {
				...newInstanceRole,
				previousRole: previousInstanceRole,
				changed: newInstanceRole.role !== previousInstanceRole,
			},
			projectRoles,
			removedProjectIds,
		});
	}
}

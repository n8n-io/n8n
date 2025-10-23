import { ProvisioningConfigDto, ProvisioningConfigPatchDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import {
	RoleRepository,
	SettingsRepository,
	User,
	UserRepository,
	Role,
	ProjectRepository,
	ProjectRelation,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import { PROVISIONING_PREFERENCES_DB_KEY } from './constants';
import { Not, In } from '@n8n/typeorm';
import { OnPubSubEvent } from '@n8n/decorators';
import { type Publisher } from '@/scaling/pubsub/publisher.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ZodError } from 'zod';
import { ProjectService } from '@/services/project.service.ee';

@Service()
export class ProvisioningService {
	private provisioningConfig: ProvisioningConfigDto;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly roleRepository: RoleRepository,
		private readonly userRepository: UserRepository,
		private readonly logger: Logger,
		private readonly publisher: Publisher,
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
			await this.userRepository.update(user.id, { role: { slug: dbRole.slug } });
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
			'scopesProvisioningFrequency',
			'scopesName',
			'scopesInstanceRoleClaimName',
			'scopesProjectsRolesClaimName',
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

		await this.publisher.publishCommand({ command: 'reload-sso-provisioning-configuration' });
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

	async isProvisioningEnabled(): Promise<boolean> {
		const provisioningConfig = await this.getConfig();
		return (
			provisioningConfig.scopesProvisionInstanceRole ||
			provisioningConfig.scopesProvisionProjectRoles
		);
	}

	async isInstanceRoleProvisioningEnabled(): Promise<boolean> {
		const provisioningConfig = await this.getConfig();
		return provisioningConfig.scopesProvisionInstanceRole;
	}

	async isProjectRolesProvisioningEnabled(): Promise<boolean> {
		const provisioningConfig = await this.getConfig();
		return provisioningConfig.scopesProvisionProjectRoles;
	}
}

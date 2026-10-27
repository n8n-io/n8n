import type {
	SaveSelfHealingConfigurationDto,
	SelfHealingConfigurationOptions,
	UpdateSelfHealingConfigurationDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { RoleService } from '@n8n/backend-services';
import {
	ProjectRelationRepository,
	ProjectRepository,
	RoleRepository,
	SharedWorkflowRepository,
	TransactionRunner,
	UserRepository,
	type OperationContext,
	type User,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { PROJECT_OWNER_ROLE_SLUG, type Scope } from '@n8n/permissions';

import { userHasScopes } from '@/permissions.ee/check-access';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { SelfHealingConfiguration } from './database/self-healing-configuration.entity';
import { SelfHealingConfigurationRepository } from './database/self-healing-configuration.repository';
import { SelfHealingInvestigationRepository } from './database/self-healing-investigation.repository';

export const REVIEWER_SCOPES: Scope[] = ['workflow:read', 'workflow:update'];

const NO_ELIGIBLE_REVIEWER =
	'No reviewer can edit these workflows. Add a reviewer who can edit them, or give a reviewer edit access.';

@Service()
export class SelfHealingConfigurationService {
	constructor(
		private readonly configurations: SelfHealingConfigurationRepository,
		private readonly workflows: WorkflowFinderService,
		private readonly ownership: SharedWorkflowRepository,
		private readonly projectRelations: ProjectRelationRepository,
		private readonly projects: ProjectRepository,
		private readonly users: UserRepository,
		private readonly roles: RoleService,
		private readonly roleRepository: RoleRepository,
		private readonly transactionRunner: TransactionRunner,
		private readonly investigations: SelfHealingInvestigationRepository,
		private readonly logger: Logger,
	) {}

	async afterWorkflowsTransferred(workflowIds: string[]): Promise<void> {
		await this.configurations.removeWorkflowSelections(workflowIds);
	}

	async canConfigure(user: User, projectId: string) {
		const [project] = await this.projects.findTypesByIds([projectId]);
		if (project?.type !== 'personal') {
			return await userHasScopes(user, ['project:update'], false, { projectId });
		}

		const [relation] = await this.projectRelations.findByUserAndProjects(user.id, [projectId]);
		return relation?.role.slug === PROJECT_OWNER_ROLE_SLUG;
	}

	async list(projectId: string) {
		return await this.configurations.list(projectId);
	}

	async get(projectId: string, id: number) {
		const [configuration] = await this.configurations.list(projectId, id);
		if (!configuration) throw new NotFoundError('Self-healing configuration not found.');
		return configuration;
	}

	async getConfigurationChoices(projectId: string): Promise<SelfHealingConfigurationOptions> {
		const [project, workflows, reviewers] = await Promise.all([
			this.projects.findOneBy({ id: projectId }),
			this.configurations.listProjectWorkflows(projectId),
			this.findEligibleReviewers(projectId),
		]);
		if (!project) throw new NotFoundError('Project not found.');

		return {
			project: { name: project.name, icon: project.icon },
			workflows: workflows.map(({ id, name }) => ({ id, name })),
			reviewers: reviewers.map(({ id, email, firstName, lastName }) => ({
				id,
				email,
				firstName,
				lastName,
			})),
		};
	}

	async save(
		user: User,
		projectId: string,
		input: SaveSelfHealingConfigurationDto | UpdateSelfHealingConfigurationDto,
		id?: number,
	) {
		await this.validateSelections(projectId, input);

		let canEnable = false;
		if (id === undefined && 'enabled' in input && input.enabled) {
			canEnable = await this.canEnable(user, projectId);
		}

		const savedId = await this.transactionRunner.run({}, async (ctx) => {
			let configuration: SelfHealingConfiguration;
			if (id === undefined) {
				configuration = new SelfHealingConfiguration();
				configuration.projectId = projectId;
				configuration.enabled = false;
				configuration.enabledById = null;
				this.changeEnabled(configuration, 'enabled' in input && input.enabled, user, canEnable);
			} else {
				configuration = await this.requireConfiguration(id, projectId, ctx);
			}

			configuration.scope = input.scope;
			configuration.includeAllProjectMembers = input.includeAllProjectMembers;

			await this.configurations.saveConfiguration(configuration, ctx);
			await this.configurations.replaceSelections(configuration, input, ctx);
			if (!(await this.hasEligibleReviewer(configuration, ctx))) {
				throw new BadRequestError(NO_ELIGIBLE_REVIEWER);
			}
			return configuration.id;
		});

		return await this.get(projectId, savedId);
	}

	async setEnabled(user: User, projectId: string, id: number, enabled: boolean) {
		let canEnable = false;
		if (enabled) {
			canEnable = await this.canEnable(user, projectId);
		}

		const threadIds = await this.transactionRunner.run({}, async (ctx) => {
			const configuration = await this.requireConfiguration(id, projectId, ctx);
			if (enabled && !(await this.hasEligibleReviewer(configuration, ctx))) {
				throw new BadRequestError(NO_ELIGIBLE_REVIEWER);
			}
			this.changeEnabled(configuration, enabled, user, canEnable);
			await this.configurations.saveConfiguration(configuration, ctx);
			return enabled
				? []
				: await this.investigations.getUnfinishedThreadIdsForConfiguration(id, ctx);
		});
		await this.cancelInvestigations(threadIds);

		return await this.get(projectId, id);
	}

	private async validateSelections(projectId: string, input: UpdateSelfHealingConfigurationDto) {
		if (input.scope === 'selected' && input.workflowIds.length === 0) {
			throw new BadRequestError('Select at least one workflow.');
		}
		if (input.scope === 'all' && input.workflowIds.length > 0) {
			throw new BadRequestError(
				'An all-workflows configuration cannot include explicit selections.',
			);
		}

		if (input.scope === 'selected') {
			const workflows = await this.configurations.listProjectWorkflows(
				projectId,
				input.workflowIds,
			);
			const projectWorkflowIds = new Set(workflows.map(({ id }) => id));
			if (input.workflowIds.some((id) => !projectWorkflowIds.has(id))) {
				throw new BadRequestError('Select workflows from this project.');
			}
		}

		if (input.reviewerIds.length === 0) {
			if (!input.includeAllProjectMembers) {
				throw new BadRequestError('Select at least one reviewer.');
			}
			// The project group is checked against saved selections in save().
			return;
		}

		const reviewers = await this.findEligibleReviewers(projectId, input.reviewerIds);
		const eligibleReviewerIds = new Set(reviewers.map(({ id }) => id));
		if (input.reviewerIds.some((id) => !eligibleReviewerIds.has(id))) {
			throw new BadRequestError(
				'Select reviewers who are project members with workflow edit access.',
			);
		}
	}

	private async reviewerRoles(ctx: OperationContext = {}) {
		const loadRoles = async () => await this.roleRepository.findAll(ctx);
		const [projectRoleSlugs, globalRoleSlugs, workflowRoleSlugs] = await Promise.all([
			this.roles.rolesWithScope('project', REVIEWER_SCOPES, loadRoles),
			this.roles.rolesWithScope('global', REVIEWER_SCOPES, loadRoles),
			this.roles.rolesWithScope('workflow', REVIEWER_SCOPES, loadRoles),
		]);
		return { projectRoleSlugs, globalRoleSlugs, workflowRoleSlugs };
	}

	private async findEligibleReviewers(projectId: string, userIds?: string[]) {
		const roles = await this.reviewerRoles();
		return await this.configurations.findProjectMembersWithEditAccess(projectId, roles, userIds);
	}

	private async hasEligibleReviewer(
		configuration: SelfHealingConfiguration,
		ctx: OperationContext,
	) {
		const roles = await this.reviewerRoles(ctx);
		if (await this.configurations.hasReviewerWithEditRole(configuration, roles, ctx)) return true;
		return await this.configurations.hasReviewerWithSharedWorkflowAccess(configuration, roles, ctx);
	}

	private async canEnable(user: User, projectId: string) {
		return await userHasScopes(
			user,
			['workflow:read', 'workflow:update', 'execution:read'],
			false,
			{ projectId },
		);
	}

	private changeEnabled(
		configuration: SelfHealingConfiguration,
		enabled: boolean,
		user: User,
		canEnable: boolean,
	) {
		if (enabled && !configuration.enabled) {
			if (!canEnable) {
				throw new ForbiddenError(
					'Workflow edit and execution read access are required to enable self-healing.',
				);
			}
			configuration.enabledById = user.id;
		}
		configuration.enabled = enabled;
	}

	async remove(projectId: string, id: number) {
		const threadIds = await this.transactionRunner.run({}, async (ctx) => {
			await this.requireConfiguration(id, projectId, ctx);
			const unfinished = await this.investigations.getUnfinishedThreadIdsForConfiguration(id, ctx);
			await this.configurations.deleteConfiguration(id, ctx);
			return unfinished;
		});
		await this.cancelInvestigations(threadIds);
	}

	/** Request cancellation only after the configuration transaction commits. */
	private async cancelInvestigations(threadIds: string[]) {
		for (const threadId of threadIds) {
			try {
				// Selection cleanup and saved reviews do not need the Assistant runtime.
				const { InstanceAiService } = await import('../instance-ai.service.js');
				await Container.get(InstanceAiService).routeCancelRun(threadId);
			} catch (error) {
				this.logger.warn('Could not cancel a self-healing investigation.', { threadId, error });
			}
		}
	}

	private async requireConfiguration(id: number, projectId: string, ctx: OperationContext) {
		const configuration = await this.configurations.findForUpdate(id, projectId, ctx);
		if (!configuration) throw new NotFoundError('Self-healing configuration not found.');
		return configuration;
	}

	async recheckAccess(id: number, projectId: string, workflowId: string) {
		await this.transactionRunner.run({}, async (ctx) => {
			const configuration = await this.configurations.findForUpdate(id, projectId, ctx);
			if (configuration) {
				await this.resolveActorOrPause(configuration, workflowId, ctx);
			}
		});
	}

	/** Resolve the actor or pause after access loss. Call under the configuration lock. */
	async resolveActorOrPause(
		configuration: SelfHealingConfiguration,
		workflowId: string,
		ctx: OperationContext,
	) {
		if (!configuration.enabled) return null;

		if (!(await this.hasEligibleReviewer(configuration, ctx))) {
			configuration.enabled = false;
			await this.configurations.saveConfiguration(configuration, ctx);
			return null;
		}

		if (configuration.enabledById) {
			const user = await this.users.findByIdWithRole(configuration.enabledById, ctx);
			if (user && !user.disabled) {
				const workflow = await this.workflows.findWorkflowForUser(
					workflowId,
					user,
					['workflow:read', 'workflow:update', 'execution:read'],
					{ ctx },
				);
				if (workflow) return user;
			}
		}

		// A workflow transfer does not revoke access to the original project.
		const owner = await this.ownership.getWorkflowOwningProject(workflowId, ctx);
		if (owner?.id !== configuration.projectId) return null;

		configuration.enabled = false;
		await this.configurations.saveConfiguration(configuration, ctx);
		return null;
	}
}

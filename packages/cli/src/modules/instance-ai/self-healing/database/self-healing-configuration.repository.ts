import type { SelfHealingConfigurationDto, SaveSelfHealingConfigurationDto } from '@n8n/api-types';
import {
	BaseRepository,
	isUniqueConstraintError,
	parseDbTime,
	ProjectRelation,
	SharedWorkflow,
	TransactionRunner,
	User,
	WorkflowEntity,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource, In, type ObjectLiteral, type SelectQueryBuilder } from '@n8n/typeorm';
import groupBy from 'lodash/groupBy';
import keyBy from 'lodash/keyBy';

import { WorkflowSuggestion } from '../../workflow-suggestions/database/workflow-suggestion.entity';

import { SelfHealingResult } from './self-healing-result.entity';
import { SelfHealingConfiguration } from './self-healing-configuration.entity';
import { SelfHealingConfigurationReviewer } from './self-healing-configuration-reviewer.entity';
import { SelfHealingConfigurationWorkflow } from './self-healing-configuration-workflow.entity';
import { SelfHealingInvestigation } from './self-healing-investigation.entity';

type ReviewerRoles = {
	projectRoleSlugs: string[];
	globalRoleSlugs: string[];
	workflowRoleSlugs: string[];
};

function editRoleCondition({ projectRoleSlugs, globalRoleSlugs }: ReviewerRoles) {
	const conditions = [
		...(projectRoleSlugs.length ? ['projectMember.role IN (:...projectRoleSlugs)'] : []),
		...(globalRoleSlugs.length ? ['user.role IN (:...globalRoleSlugs)'] : []),
	];
	return conditions.length ? `(${conditions.join(' OR ')})` : null;
}

/**
 * Keep only rows where the user is a current member of the configuration's project and
 * a reviewer, either listed or included with all project members. A global role alone
 * does not qualify. Workflow access is checked separately.
 */
export function whereReviewer<T extends ObjectLiteral>(
	query: SelectQueryBuilder<T>,
	configurationAlias: string,
	userIdExpression: string,
) {
	const member = query
		.subQuery()
		.select('1')
		.from(ProjectRelation, 'reviewerMembership')
		.where(`reviewerMembership.projectId = ${configurationAlias}.projectId`)
		.andWhere(`reviewerMembership.userId = ${userIdExpression}`)
		.getQuery();
	const explicit = query
		.subQuery()
		.select('1')
		.from(SelfHealingConfigurationReviewer, 'explicitReviewer')
		.where(`explicitReviewer.configurationId = ${configurationAlias}.id`)
		.andWhere(`explicitReviewer.userId = ${userIdExpression}`)
		.getQuery();
	return query.andWhere(
		`(EXISTS ${member} AND (${configurationAlias}.includeAllProjectMembers = :includeAllProjectMembers OR EXISTS ${explicit}))`,
		{ includeAllProjectMembers: true },
	);
}

/**
 * Keep only configurations that cover the workflow. Explicit selections take precedence
 * over all-workflow coverage, even when paused. Callers check workflow ownership.
 */
function whereCoversWorkflow<T extends ObjectLiteral>(
	query: SelectQueryBuilder<T>,
	configurationAlias: string,
	workflowIdExpression: string,
) {
	const selectedHere = query
		.subQuery()
		.select('1')
		.from(SelfHealingConfigurationWorkflow, 'ownSelection')
		.where(`ownSelection.configurationId = ${configurationAlias}.id`)
		.andWhere(`ownSelection.workflowId = ${workflowIdExpression}`)
		.getQuery();
	const selectedInProject = query
		.subQuery()
		.select('1')
		.from(SelfHealingConfigurationWorkflow, 'projectSelection')
		.where(`projectSelection.projectId = ${configurationAlias}.projectId`)
		.andWhere(`projectSelection.workflowId = ${workflowIdExpression}`)
		.getQuery();
	return query.andWhere(
		`(EXISTS ${selectedHere} OR (${configurationAlias}.scope = :allScope AND NOT EXISTS ${selectedInProject}))`,
		{ allScope: 'all' },
	);
}

@Service()
export class SelfHealingConfigurationRepository extends BaseRepository<SelfHealingConfiguration> {
	constructor(dataSource: DataSource, tx: TransactionRunner) {
		super(SelfHealingConfiguration, dataSource.manager, tx);
	}

	async findForUpdate(id: number, projectId: string, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		return await manager.findOne(SelfHealingConfiguration, {
			where: { id, projectId },
			lock:
				manager.connection.options.type === 'postgres' && ctx.trx
					? { mode: 'for_no_key_update' }
					: undefined,
		});
	}

	async list(projectId: string, id?: number): Promise<SelfHealingConfigurationDto[]> {
		const configurations = await this.find({
			where: { projectId, ...(id === undefined ? {} : { id }) },
			order: { id: 'ASC' },
		});
		if (configurations.length === 0) return [];

		const configurationIds = configurations.map((configuration) => configuration.id);
		const configurationId = In(configurationIds);
		const [workflows, reviewers, activity] = await Promise.all([
			this.manager.findBy(SelfHealingConfigurationWorkflow, { configurationId }),
			this.manager.findBy(SelfHealingConfigurationReviewer, { configurationId }),
			this.manager
				.createQueryBuilder(SelfHealingInvestigation, 'investigation')
				.select('investigation.configurationId', 'configurationId')
				.addSelect('MAX(investigation.createdAt)', 'lastActivity')
				.where('investigation.configurationId IN (:...ids)', {
					ids: configurationIds,
				})
				.groupBy('investigation.configurationId')
				.getRawMany<{ configurationId: number; lastActivity: Date | string }>(),
		]);

		const workflowsByConfiguration = groupBy(workflows, 'configurationId');
		const reviewersByConfiguration = groupBy(reviewers, 'configurationId');
		const activityByConfiguration = keyBy(activity, 'configurationId');

		return configurations.map((configuration) => {
			const lastActivity = activityByConfiguration[configuration.id]?.lastActivity;
			return {
				id: configuration.id,
				projectId,
				scope: configuration.scope,
				enabled: configuration.enabled,
				includeAllProjectMembers: configuration.includeAllProjectMembers,
				enabledById: configuration.enabledById,
				workflowIds: (workflowsByConfiguration[configuration.id] ?? []).map(
					(row) => row.workflowId,
				),
				reviewerIds: (reviewersByConfiguration[configuration.id] ?? []).map((row) => row.userId),
				lastActivity: lastActivity ? parseDbTime(lastActivity).toISOString() : null,
			};
		});
	}

	async findForWorkflow(projectId: string, workflowId: string) {
		const query = this.createQueryBuilder('configuration')
			.where('configuration.projectId = :projectId', { projectId })
			.setParameter('workflowId', workflowId);
		return await whereCoversWorkflow(query, 'configuration', ':workflowId').getOne();
	}

	async listProjectWorkflows(projectId: string, workflowIds?: string[]) {
		if (workflowIds?.length === 0) return [];

		const query = this.manager
			.createQueryBuilder(WorkflowEntity, 'workflow')
			.innerJoin(SharedWorkflow, 'owner', 'owner.workflowId = workflow.id AND owner.role = :role', {
				role: 'workflow:owner',
			})
			.where('owner.projectId = :projectId', { projectId })
			.andWhere('workflow.isArchived = :archived', { archived: false })
			.select(['workflow.id', 'workflow.name'])
			.orderBy('workflow.name', 'ASC');
		if (workflowIds) {
			query.andWhere('workflow.id IN (:...workflowIds)', { workflowIds });
		}
		return await query.getMany();
	}

	async saveConfiguration(configuration: SelfHealingConfiguration, ctx: OperationContext) {
		try {
			return await this.managerFor(ctx).save(configuration);
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new ConflictError('This project already has an all-workflows configuration.');
			}

			throw error;
		}
	}

	async findProjectMembersWithEditRole(
		projectId: string,
		roles: ReviewerRoles,
		userIds?: string[],
	) {
		const editRole = editRoleCondition(roles);
		if (!editRole || userIds?.length === 0) return [];

		const query = this.manager
			.createQueryBuilder(User, 'user')
			.innerJoin(ProjectRelation, 'projectMember', 'projectMember.userId = user.id')
			.select(['user.id', 'user.email', 'user.firstName', 'user.lastName'])
			.where('projectMember.projectId = :projectId', { projectId })
			.andWhere('user.disabled = :disabled', { disabled: false })
			.andWhere(editRole, roles);
		if (userIds) {
			query.andWhere('user.id IN (:...userIds)', { userIds });
		}
		return await query.getMany();
	}

	private reviewerMembers(configuration: SelfHealingConfiguration, ctx: OperationContext) {
		const query = this.managerFor(ctx)
			.createQueryBuilder(ProjectRelation, 'projectMember')
			.innerJoin('projectMember.user', 'user')
			.innerJoin(
				SelfHealingConfiguration,
				'configuration',
				'configuration.projectId = projectMember.projectId',
			)
			.where('configuration.id = :configurationId', { configurationId: configuration.id })
			.andWhere('user.disabled = :disabled', { disabled: false });
		return whereReviewer(query, 'configuration', 'projectMember.userId');
	}

	async hasReviewerWithEditRole(
		configuration: SelfHealingConfiguration,
		roles: ReviewerRoles,
		ctx: OperationContext,
	) {
		const editRole = editRoleCondition(roles);
		if (!editRole) return false;

		return await this.reviewerMembers(configuration, ctx).andWhere(editRole, roles).getExists();
	}

	/**
	 * Match the workflow finder: a member can also edit a covered workflow through a share.
	 * Call after selections are saved.
	 */
	async hasReviewerWithSharedWorkflowAccess(
		configuration: SelfHealingConfiguration,
		{ projectRoleSlugs, workflowRoleSlugs }: ReviewerRoles,
		ctx: OperationContext,
	) {
		if (projectRoleSlugs.length === 0 || workflowRoleSlugs.length === 0) return false;

		const query = this.reviewerMembers(configuration, ctx)
			.innerJoin(ProjectRelation, 'shareMember', 'shareMember.userId = projectMember.userId')
			.innerJoin(SharedWorkflow, 'share', 'share.projectId = shareMember.projectId')
			.andWhere('shareMember.role IN (:...projectRoleSlugs)', { projectRoleSlugs })
			.andWhere('share.role IN (:...workflowRoleSlugs)', { workflowRoleSlugs });
		const covered = this.buildCoveredWorkflowIdsSubquery(query, configuration.id);
		return await query.andWhere(`share.workflowId IN (${covered.getQuery()})`).getExists();
	}

	private buildCoveredWorkflowIdsSubquery<T extends ObjectLiteral>(
		query: SelectQueryBuilder<T>,
		configurationId: number,
	) {
		const owned = query
			.subQuery()
			.select('owner.workflowId')
			.from(SharedWorkflow, 'owner')
			.innerJoin(
				SelfHealingConfiguration,
				'coveringConfiguration',
				'coveringConfiguration.projectId = owner.projectId',
			)
			.where('coveringConfiguration.id = :configurationId', { configurationId })
			.andWhere('owner.role = :ownerRole', { ownerRole: 'workflow:owner' });
		return whereCoversWorkflow(owned, 'coveringConfiguration', 'owner.workflowId');
	}

	async replaceSelections(
		configuration: SelfHealingConfiguration,
		input: Pick<SaveSelfHealingConfigurationDto, 'workflowIds' | 'reviewerIds'>,
		ctx: OperationContext,
	) {
		const manager = this.managerFor(ctx);
		const configurationId = configuration.id;
		await manager.delete(SelfHealingConfigurationWorkflow, { configurationId });
		await manager.delete(SelfHealingConfigurationReviewer, { configurationId });

		try {
			if (input.workflowIds.length) {
				await manager.insert(
					SelfHealingConfigurationWorkflow,
					[...new Set(input.workflowIds)].map((workflowId) => ({
						configurationId,
						projectId: configuration.projectId,
						workflowId,
					})),
				);
			}
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new ConflictError('A selected workflow already belongs to another configuration.');
			}

			throw error;
		}

		if (input.reviewerIds.length) {
			await manager.insert(
				SelfHealingConfigurationReviewer,
				[...new Set(input.reviewerIds)].map((userId) => ({ configurationId, userId })),
			);
		}
	}

	async removeWorkflowSelections(workflowIds: string[]) {
		if (workflowIds.length === 0) return;

		const owners = this.manager
			.createQueryBuilder(SharedWorkflow, 'owner')
			.select(['owner.workflowId', 'owner.projectId'])
			.where('owner.role = :role', { role: 'workflow:owner' })
			.andWhere('owner.workflowId IN (:...workflowIds)', { workflowIds });

		// A destination selection can be saved after ownership changes but before cleanup.
		await this.manager
			.createQueryBuilder()
			.delete()
			.from(SelfHealingConfigurationWorkflow)
			.where('workflowId IN (:...workflowIds)')
			.andWhere(`("workflowId", "projectId") NOT IN (${owners.getQuery()})`)
			.setParameters(owners.getParameters())
			.execute();
	}

	async deleteConfiguration(id: number, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		const linkedSuggestions = manager
			.createQueryBuilder(SelfHealingResult, 'result')
			.select('result.suggestionId')
			.where('result.configurationId = :id', { id });

		// Delete suggestions first. Deleting a result does not delete its suggestion.
		await manager
			.createQueryBuilder()
			.delete()
			.from(WorkflowSuggestion)
			.where(`id IN (${linkedSuggestions.getQuery()})`)
			.setParameters(linkedSuggestions.getParameters())
			.execute();
		await manager.delete(SelfHealingConfiguration, { id });
	}

	async isReviewer(configurationId: number, userId: string, ctx: OperationContext) {
		const query = this.managerFor(ctx)
			.createQueryBuilder(SelfHealingConfiguration, 'configuration')
			.where('configuration.id = :configurationId', { configurationId })
			.setParameter('reviewerId', userId);
		return await whereReviewer(query, 'configuration', ':reviewerId').getExists();
	}
}

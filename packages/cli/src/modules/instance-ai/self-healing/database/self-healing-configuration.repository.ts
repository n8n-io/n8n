import type { SelfHealingConfigurationDto, SaveSelfHealingConfigurationDto } from '@n8n/api-types';
import {
	BaseRepository,
	isUniqueConstraintError,
	parseDbTime,
	Person,
	Project,
	ProjectRelation,
	SharedWorkflow,
	SharedWorkflowRepository,
	TransactionRunner,
	User,
	WorkflowEntity,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { IMPLICIT_TEAM_PROJECT_MEMBER_ROLE_SLUGS } from '@n8n/permissions';
import { DataSource, In, type ObjectLiteral, type SelectQueryBuilder } from '@n8n/typeorm';
import groupBy from 'lodash/groupBy';
import keyBy from 'lodash/keyBy';

import { SelfHealingAgentInvestigation } from '../agents/database/self-healing-agent-investigation.entity';
import { SelfHealingConfigurationAgent } from '../agents/database/self-healing-configuration-agent.entity';
import { SelfHealingConfiguration } from './self-healing-configuration.entity';
import { SelfHealingConfigurationReviewer } from './self-healing-configuration-reviewer.entity';
import { SelfHealingConfigurationWorkflow } from './self-healing-configuration-workflow.entity';
import { SelfHealingInvestigation } from './self-healing-investigation.entity';
import type { SelfHealingInboxAccess } from './self-healing-result.repository';

export type ReviewerRoles = {
	projectRoleSlugs: string[];
	globalRoleSlugs: string[];
	workflowRoleSlugs: string[];
};

/** An enabled configuration that covers agents, as the agent sweep reads it. */
export type SelfHealingAgentCoverage = Pick<
	SelfHealingConfiguration,
	| 'id'
	| 'projectId'
	| 'agentScope'
	| 'agentGoals'
	| 'agentScheduleIntervalHours'
	| 'agentTraceThreshold'
	| 'agentPublicationMode'
	| 'enabledById'
	| 'updatedAt'
> & { agentIds: string[] };

// Edit-access conditions for member queries that alias the user as `user` and left-join
// the project relation as `projectMember`. Implicit members have no relation, so only
// their global role grants access. Each returns null when no role grants access.

function editRoleCondition({ projectRoleSlugs, globalRoleSlugs }: ReviewerRoles) {
	const conditions = [
		...(projectRoleSlugs.length ? ['projectMember.role IN (:...projectRoleSlugs)'] : []),
		...(globalRoleSlugs.length ? ['user.role IN (:...globalRoleSlugs)'] : []),
	];
	return conditions.length ? `(${conditions.join(' OR ')})` : null;
}

/** Match the workflow finder: a member can also edit a project workflow through a share. */
function sharedWorkflowEditQuery<T extends ObjectLiteral>(
	query: SelectQueryBuilder<T>,
	{ projectRoleSlugs, workflowRoleSlugs }: ReviewerRoles,
) {
	if (projectRoleSlugs.length === 0 || workflowRoleSlugs.length === 0) return null;

	return query
		.subQuery()
		.select('1')
		.from(ProjectRelation, 'shareMember')
		.innerJoin(SharedWorkflow, 'share', 'share.projectId = shareMember.projectId')
		.innerJoin(SharedWorkflow, 'owner', 'owner.workflowId = share.workflowId')
		.where('shareMember.userId = projectMember.userId')
		.andWhere('shareMember.role IN (:...projectRoleSlugs)', { projectRoleSlugs })
		.andWhere('share.role IN (:...workflowRoleSlugs)', { workflowRoleSlugs })
		.andWhere('owner.projectId = :projectId')
		.andWhere('owner.role = :ownerRole', { ownerRole: 'workflow:owner' });
}

/**
 * Match current project members. Instance owners and admins are implicit members of team
 * projects, as Project settings shows. Personal projects have no implicit members.
 */
function projectMemberCondition<T extends ObjectLiteral>(
	query: SelectQueryBuilder<T>,
	projectIdExpression: string,
	userIdExpression: string,
) {
	const explicit = query
		.createQueryBuilder()
		.select('explicitMember.userId', 'member_id')
		.from(ProjectRelation, 'explicitMember')
		.where(`explicitMember.projectId = ${projectIdExpression}`);
	const implicit = query
		.createQueryBuilder()
		.select('implicitMember.id', 'member_id')
		.from(User, 'implicitMember')
		.innerJoin(Project, 'implicitProject', `implicitProject.id = ${projectIdExpression}`)
		.where('implicitProject.type = :teamProjectType', { teamProjectType: 'team' })
		.andWhere('implicitMember.role IN (:...implicitMemberRoles)', {
			implicitMemberRoles: IMPLICIT_TEAM_PROJECT_MEMBER_ROLE_SLUGS,
		});
	query.setParameters(implicit.getParameters());
	// One EXISTS over both sources lets PostgreSQL start from the members, not from every user.
	return `EXISTS (SELECT 1 FROM (${explicit.getQuery()} UNION ALL ${implicit.getQuery()}) members WHERE members.member_id = ${userIdExpression})`;
}

/**
 * Keep only rows where the user is a person, a current member of the configuration's
 * project and a reviewer, either listed or included with all project members. Only a
 * person can review a fix. Workflow access is checked separately.
 */
export function whereReviewer<T extends ObjectLiteral>(
	query: SelectQueryBuilder<T>,
	configurationAlias: string,
	userIdExpression: string,
	projectIdExpression = `${configurationAlias}.projectId`,
) {
	// A query on `Person` filters on `kind`. The filter value is a parameter of the subquery.
	const person = query
		.createQueryBuilder()
		.select('1')
		.from(Person, 'reviewerPerson')
		.where(`reviewerPerson.id = ${userIdExpression}`);
	query.setParameters(person.getParameters());
	const member = projectMemberCondition(query, projectIdExpression, userIdExpression);
	const explicit = query
		.subQuery()
		.select('1')
		.from(SelfHealingConfigurationReviewer, 'explicitReviewer')
		.where(`explicitReviewer.configurationId = ${configurationAlias}.id`)
		.andWhere(`explicitReviewer.userId = ${userIdExpression}`)
		.getQuery();
	return query.andWhere(
		`(EXISTS (${person.getQuery()}) AND ${member} AND (${configurationAlias}.includeAllProjectMembers = :includeAllProjectMembers OR EXISTS ${explicit}))`,
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

/**
 * Keep only configurations that cover the agent. An explicit selection takes precedence
 * over all-agent coverage, also when its configuration is paused.
 */
function whereCoversAgent<T extends ObjectLiteral>(
	query: SelectQueryBuilder<T>,
	configurationAlias: string,
	agentIdExpression: string,
) {
	const selectedHere = query
		.subQuery()
		.select('1')
		.from(SelfHealingConfigurationAgent, 'ownAgent')
		.where(`ownAgent.configurationId = ${configurationAlias}.id`)
		.andWhere(`ownAgent.agentId = ${agentIdExpression}`)
		.getQuery();
	const selectedInProject = query
		.subQuery()
		.select('1')
		.from(SelfHealingConfigurationAgent, 'projectAgent')
		.where(`projectAgent.projectId = ${configurationAlias}.projectId`)
		.andWhere(`projectAgent.agentId = ${agentIdExpression}`)
		.getQuery();
	return query.andWhere(
		`(EXISTS ${selectedHere} OR (${configurationAlias}.agentScope = :allAgentScope AND NOT EXISTS ${selectedInProject}))`,
		{ allAgentScope: 'all' },
	);
}

@Service()
export class SelfHealingConfigurationRepository extends BaseRepository<SelfHealingConfiguration> {
	constructor(
		dataSource: DataSource,
		tx: TransactionRunner,
		private readonly sharedWorkflows: SharedWorkflowRepository,
	) {
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
		const [workflows, agents, reviewers, activity] = await Promise.all([
			this.manager.findBy(SelfHealingConfigurationWorkflow, { configurationId }),
			this.manager.findBy(SelfHealingConfigurationAgent, { configurationId }),
			this.manager.findBy(SelfHealingConfigurationReviewer, { configurationId }),
			this.createQueryBuilder('configuration')
				.select('configuration.id', 'configurationId')
				.addSelect(
					(query) =>
						query
							.select('investigation.createdAt')
							.from(SelfHealingInvestigation, 'investigation')
							.where('investigation.configurationId = configuration.id')
							.orderBy('investigation.createdAt', 'DESC')
							.limit(1),
					'lastActivity',
				)
				.addSelect(
					(query) =>
						query
							.select('agentInvestigation.createdAt')
							.from(SelfHealingAgentInvestigation, 'agentInvestigation')
							.where('agentInvestigation.configurationId = configuration.id')
							.orderBy('agentInvestigation.createdAt', 'DESC')
							.limit(1),
					'lastAgentActivity',
				)
				.where('configuration.id IN (:...ids)', { ids: configurationIds })
				.getRawMany<{
					configurationId: number;
					lastActivity: Date | string | null;
					lastAgentActivity: Date | string | null;
				}>(),
		]);

		const workflowsByConfiguration = groupBy(workflows, 'configurationId');
		const agentsByConfiguration = groupBy(agents, 'configurationId');
		const reviewersByConfiguration = groupBy(reviewers, 'configurationId');
		const activityByConfiguration = keyBy(activity, 'configurationId');

		return configurations.map((configuration) => {
			const row = activityByConfiguration[configuration.id];
			// The newest investigation of a workflow or of an agent.
			const lastActivity = [row?.lastActivity, row?.lastAgentActivity]
				.flatMap((time) => (time ? [parseDbTime(time)] : []))
				.sort((a, b) => b.getTime() - a.getTime())
				.at(0);
			return {
				id: configuration.id,
				projectId,
				scope: configuration.scope,
				enabled: configuration.enabled,
				includeAllProjectMembers: configuration.includeAllProjectMembers,
				includeSubWorkflows: configuration.includeSubWorkflows,
				enabledById: configuration.enabledById,
				workflowIds: (workflowsByConfiguration[configuration.id] ?? []).map(
					(workflow) => workflow.workflowId,
				),
				reviewerIds: (reviewersByConfiguration[configuration.id] ?? []).map(
					(reviewer) => reviewer.userId,
				),
				agentScope: configuration.agentScope,
				agentIds: (agentsByConfiguration[configuration.id] ?? []).map((agent) => agent.agentId),
				agentGoals: configuration.agentGoals,
				agentScheduleIntervalHours: configuration.agentScheduleIntervalHours,
				agentTraceThreshold: configuration.agentTraceThreshold,
				agentPublicationMode: configuration.agentPublicationMode,
				lastActivity: lastActivity?.toISOString() ?? null,
			};
		});
	}

	async findForWorkflow(projectId: string, workflowId: string) {
		const query = this.createQueryBuilder('configuration')
			.where('configuration.projectId = :projectId', { projectId })
			.setParameter('workflowId', workflowId);
		return await whereCoversWorkflow(query, 'configuration', ':workflowId').getOne();
	}

	/** The configuration that covers the agent, enabled or paused. */
	async findForAgent(projectId: string, agentId: string) {
		const query = this.createQueryBuilder('configuration')
			.where('configuration.projectId = :projectId', { projectId })
			.setParameter('agentId', agentId);
		return await whereCoversAgent(query, 'configuration', ':agentId').getOne();
	}

	/** Enabled configurations that cover agents, for the agent sweep. */
	async listEnabledWithAgentCoverage(): Promise<SelfHealingAgentCoverage[]> {
		const configurations = await this.createQueryBuilder('configuration')
			.where('configuration.enabled = :enabled', { enabled: true })
			.andWhere('configuration.agentScope <> :noAgentScope', { noAgentScope: 'none' })
			.orderBy('configuration.id', 'ASC')
			.getMany();
		if (configurations.length === 0) return [];

		const agents = await this.manager.findBy(SelfHealingConfigurationAgent, {
			configurationId: In(configurations.map(({ id }) => id)),
		});
		const agentsByConfiguration = groupBy(agents, 'configurationId');
		return configurations.map((configuration) => ({
			id: configuration.id,
			projectId: configuration.projectId,
			agentScope: configuration.agentScope,
			agentIds: (agentsByConfiguration[configuration.id] ?? []).map(({ agentId }) => agentId),
			agentGoals: configuration.agentGoals,
			agentScheduleIntervalHours: configuration.agentScheduleIntervalHours,
			agentTraceThreshold: configuration.agentTraceThreshold,
			agentPublicationMode: configuration.agentPublicationMode,
			enabledById: configuration.enabledById,
			updatedAt: configuration.updatedAt,
		}));
	}

	async listAgentIds(configurationId: number, ctx: OperationContext): Promise<string[]> {
		const agents = await this.managerFor(ctx).findBy(SelfHealingConfigurationAgent, {
			configurationId,
		});
		return agents.map(({ agentId }) => agentId);
	}

	async hasWorkflowSelections(configurationId: number, ctx: OperationContext): Promise<boolean> {
		return await this.managerFor(ctx).existsBy(SelfHealingConfigurationWorkflow, {
			configurationId,
		});
	}

	/** The save maps a unique violation to the all-workflows message, so check agents first. */
	async hasAllAgentsConfiguration(
		projectId: string,
		exceptId: number | undefined,
		ctx: OperationContext,
	): Promise<boolean> {
		const query = this.managerFor(ctx)
			.createQueryBuilder(SelfHealingConfiguration, 'configuration')
			.where('configuration.projectId = :projectId', { projectId })
			.andWhere('configuration.agentScope = :agentScope', { agentScope: 'all' });
		if (exceptId !== undefined) {
			query.andWhere('configuration.id <> :exceptId', { exceptId });
		}
		return await query.getExists();
	}

	async hasConfiguration(projectId: string) {
		return await this.existsBy({ projectId });
	}

	/** Count the workflows that an enabled configuration covers. */
	private async countWatchedWorkflows() {
		const query = this.manager
			.createQueryBuilder(WorkflowEntity, 'workflow')
			.innerJoin(SharedWorkflow, 'owner', 'owner.workflowId = workflow.id AND owner.role = :role', {
				role: 'workflow:owner',
			})
			.innerJoin(
				SelfHealingConfiguration,
				'configuration',
				'configuration.projectId = owner.projectId',
			)
			.where('workflow.isArchived = :archived', { archived: false })
			.andWhere('configuration.enabled = :enabled', { enabled: true });
		// One configuration covers a workflow, so no workflow is counted twice.
		return await whereCoversWorkflow(query, 'configuration', 'workflow.id').getCount();
	}

	/** Current adoption counts for the daily telemetry snapshot. */
	async getAdoptionCounts() {
		const [configurations, watchedWorkflowCount] = await Promise.all([
			this.find({
				select: { projectId: true, scope: true, enabled: true, includeSubWorkflows: true },
			}),
			this.countWatchedWorkflows(),
		]);
		const enabled = configurations.filter((configuration) => configuration.enabled);
		return {
			configurationCount: configurations.length,
			enabledProjectCount: new Set(enabled.map(({ projectId }) => projectId)).size,
			allScopeCount: enabled.filter(({ scope }) => scope === 'all').length,
			selectedScopeCount: enabled.filter(({ scope }) => scope === 'selected').length,
			includeSubWorkflowsCount: enabled.filter(({ includeSubWorkflows }) => includeSubWorkflows)
				.length,
			watchedWorkflowCount,
		};
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

	async findProjectMembersWithEditAccess(
		projectId: string,
		roles: ReviewerRoles,
		userIds?: string[],
	) {
		if (userIds?.length === 0) return [];

		// Reviewers are chosen by name and review in their inbox, so they are people.
		const query = this.manager
			.createQueryBuilder(Person, 'user')
			.leftJoin(
				ProjectRelation,
				'projectMember',
				'projectMember.userId = user.id AND projectMember.projectId = :projectId',
				{ projectId },
			)
			.select(['user.id', 'user.email', 'user.firstName', 'user.lastName'])
			.where('user.disabled = :disabled', { disabled: false });
		query.andWhere(projectMemberCondition(query, ':projectId', 'user.id'));
		const sharedWorkflowEdit = sharedWorkflowEditQuery(query, roles);
		const editAccess = [
			editRoleCondition(roles),
			sharedWorkflowEdit && `EXISTS ${sharedWorkflowEdit.getQuery()}`,
		].filter(Boolean);
		if (editAccess.length === 0) return [];

		query.andWhere(`(${editAccess.join(' OR ')})`, roles);
		if (userIds) {
			query.andWhere('user.id IN (:...userIds)', { userIds });
		}
		return await query.getMany();
	}

	private reviewerMembers(
		configuration: Pick<SelfHealingConfiguration, 'id' | 'projectId'>,
		ctx: OperationContext,
	) {
		const query = this.managerFor(ctx)
			.createQueryBuilder(Person, 'user')
			.innerJoin(SelfHealingConfiguration, 'configuration', 'configuration.id = :configurationId', {
				configurationId: configuration.id,
			})
			.leftJoin(
				ProjectRelation,
				'projectMember',
				'projectMember.userId = user.id AND projectMember.projectId = :projectId',
				{ projectId: configuration.projectId },
			)
			.where('user.disabled = :disabled', { disabled: false });
		// A bound project keeps the member lookup independent of the user count on PostgreSQL.
		return whereReviewer(query, 'configuration', 'user.id', ':projectId');
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

	/** Call after selections are saved. */
	async hasReviewerWithSharedWorkflowAccess(
		configuration: SelfHealingConfiguration,
		roles: ReviewerRoles,
		ctx: OperationContext,
	) {
		const query = this.reviewerMembers(configuration, ctx);
		const sharedWorkflowEdit = sharedWorkflowEditQuery(query, roles);
		if (!sharedWorkflowEdit) return false;

		const covered = whereCoversWorkflow(sharedWorkflowEdit, 'configuration', 'share.workflowId');
		return await query.andWhere(`EXISTS ${covered.getQuery()}`).getExists();
	}

	/** Call with workflows of the configuration's project. */
	async hasReviewerWhoCanEditAll(
		configuration: Pick<SelfHealingConfiguration, 'id' | 'projectId'>,
		roles: ReviewerRoles,
		workflowIds: string[],
		ctx: OperationContext,
	) {
		const query = this.reviewerMembers(configuration, ctx);
		const shares = workflowIds.map((workflowId, index) =>
			sharedWorkflowEditQuery(query, roles)?.andWhere(
				`share.workflowId = :sharedWorkflow${index}`,
				{
					[`sharedWorkflow${index}`]: workflowId,
				},
			),
		);
		const editAccess = [
			editRoleCondition(roles),
			shares.every(Boolean) && shares.map((share) => `EXISTS ${share?.getQuery()}`).join(' AND '),
		].filter(Boolean);
		if (editAccess.length === 0) return false;

		return await query.andWhere(`(${editAccess.join(' OR ')})`, roles).getExists();
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

	/** Replace the agent selection. Pass an empty list when the scope is not `selected`. */
	async replaceAgentSelections(
		configuration: SelfHealingConfiguration,
		agentIds: string[],
		ctx: OperationContext,
	): Promise<void> {
		const manager = this.managerFor(ctx);
		const configurationId = configuration.id;
		await manager.delete(SelfHealingConfigurationAgent, { configurationId });
		if (agentIds.length === 0) return;

		try {
			await manager.insert(
				SelfHealingConfigurationAgent,
				[...new Set(agentIds)].map((agentId) => ({
					configurationId,
					projectId: configuration.projectId,
					agentId,
				})),
			);
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new ConflictError('A selected agent already belongs to another configuration.');
			}

			throw error;
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
		await this.managerFor(ctx).delete(SelfHealingConfiguration, { id });
	}

	/**
	 * Tells whether a configuration can send a result to the user. The user must be a
	 * reviewer and must have edit access to a workflow that the configuration covers.
	 */
	async canReceiveResults({ user, ...roles }: SelfHealingInboxAccess) {
		const accessible = this.sharedWorkflows.buildSharedWorkflowIdsSubquery(user, roles);
		const query = this.manager
			.createQueryBuilder(SelfHealingConfiguration, 'configuration')
			.innerJoin(
				SharedWorkflow,
				'owner',
				'owner.projectId = configuration.projectId AND owner.role = :ownerRole',
				{ ownerRole: 'workflow:owner' },
			)
			.where(`owner.workflowId IN (${accessible.getQuery()})`)
			.setParameters(accessible.getParameters())
			.setParameter('reviewerId', user.id);
		whereCoversWorkflow(query, 'configuration', 'owner.workflowId');
		return await whereReviewer(query, 'configuration', ':reviewerId').getExists();
	}

	/**
	 * Tells whether a configuration can send an agent proposal to the user. The user must be
	 * a reviewer and must have a role that can edit the agents of the project.
	 */
	async canReceiveAgentResults(
		userId: string,
		roles: { projectRoleSlugs: string[]; globalRoleSlugs: string[] },
	): Promise<boolean> {
		const query = this.manager
			.createQueryBuilder(SelfHealingConfiguration, 'configuration')
			.where('configuration.agentScope <> :noAgentScope', { noAgentScope: 'none' })
			.setParameter('reviewerId', userId);
		const editAccess: string[] = [];
		if (roles.projectRoleSlugs.length) {
			const projectRole = query
				.subQuery()
				.select('1')
				.from(ProjectRelation, 'agentMember')
				.where('agentMember.projectId = configuration.projectId')
				.andWhere('agentMember.userId = :reviewerId')
				.andWhere('agentMember.role IN (:...agentProjectRoleSlugs)');
			query.setParameter('agentProjectRoleSlugs', roles.projectRoleSlugs);
			editAccess.push(`EXISTS ${projectRole.getQuery()}`);
		}
		if (roles.globalRoleSlugs.length) {
			const globalRole = query
				.subQuery()
				.select('1')
				.from(User, 'agentUser')
				.where('agentUser.id = :reviewerId')
				.andWhere('agentUser.role IN (:...agentGlobalRoleSlugs)');
			query.setParameter('agentGlobalRoleSlugs', roles.globalRoleSlugs);
			editAccess.push(`EXISTS ${globalRole.getQuery()}`);
		}
		if (editAccess.length === 0) return false;

		query.andWhere(`(${editAccess.join(' OR ')})`);
		return await whereReviewer(query, 'configuration', ':reviewerId').getExists();
	}

	async isReviewer(configurationId: number, userId: string, ctx: OperationContext) {
		const query = this.managerFor(ctx)
			.createQueryBuilder(SelfHealingConfiguration, 'configuration')
			.where('configuration.id = :configurationId', { configurationId })
			.setParameter('reviewerId', userId);
		return await whereReviewer(query, 'configuration', ':reviewerId').getExists();
	}
}

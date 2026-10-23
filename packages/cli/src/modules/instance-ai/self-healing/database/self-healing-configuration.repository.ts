import type { SelfHealingConfigurationDto, SaveSelfHealingConfigurationDto } from '@n8n/api-types';
import {
	BaseRepository,
	isUniqueConstraintError,
	parseDbTime,
	SharedWorkflow,
	TransactionRunner,
	WorkflowEntity,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { DataSource, In } from '@n8n/typeorm';
import groupBy from 'lodash/groupBy';
import keyBy from 'lodash/keyBy';

import { WorkflowSuggestion } from '../../workflow-suggestions/database/workflow-suggestion.entity';

import { SelfHealingResult } from './self-healing-result.entity';
import { SelfHealingConfiguration } from './self-healing-configuration.entity';
import { SelfHealingConfigurationReviewer } from './self-healing-configuration-reviewer.entity';
import { SelfHealingConfigurationWorkflow } from './self-healing-configuration-workflow.entity';
import { SelfHealingInvestigation } from './self-healing-investigation.entity';

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
		const selected = await this.createQueryBuilder('configuration')
			.innerJoin(
				SelfHealingConfigurationWorkflow,
				'selection',
				'selection.configurationId = configuration.id',
			)
			.where('configuration.projectId = :projectId', {
				projectId,
			})
			.andWhere('selection.workflowId = :workflowId', { workflowId })
			.getOne();

		// Paused explicit selections still take precedence over all-workflow coverage.
		if (selected) {
			return selected;
		}

		return await this.findOneBy({ projectId, scope: 'all' });
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

	async hasReviewers(configurationId: number, ctx: OperationContext) {
		return await this.managerFor(ctx).existsBy(SelfHealingConfigurationReviewer, {
			configurationId,
		});
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

		await manager.insert(
			SelfHealingConfigurationReviewer,
			[...new Set(input.reviewerIds)].map((userId) => ({ configurationId, userId })),
		);
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
		return await this.managerFor(ctx)
			.createQueryBuilder(SelfHealingConfigurationReviewer, 'reviewer')
			.where('reviewer.configurationId = :configurationId AND reviewer.userId = :userId', {
				configurationId,
				userId,
			})
			.getExists();
	}
}

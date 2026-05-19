import type {
	InsightsAnalystHighlight,
	InsightsAnalystLowImpactWorkflow,
	InsightsAnalystOverview,
	InsightsByWorkflow,
} from '@n8n/api-types';
import {
	ExecutionDataRepository,
	ExecutionEntity,
	ExecutionRepository,
	Project,
	ProjectRelation,
	ProjectRepository,
	SharedWorkflowRepository,
	UserRepository,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { PROJECT_ADMIN_ROLE_SLUG } from '@n8n/permissions';
import { stringify } from 'flatted';
import { DateTime } from 'luxon';
import { createEmptyRunExecutionData } from 'n8n-workflow';
import type { IConnections, INode } from 'n8n-workflow';

import { InsightsByPeriod } from './database/entities/insights-by-period';
import { InsightsMetadata } from './database/entities/insights-metadata';
import { InsightsByPeriodRepository } from './database/repositories/insights-by-period.repository';
import { InsightsMetadataRepository } from './database/repositories/insights-metadata.repository';
import {
	INSIGHTS_ANALYST_DEMO_PROJECT_ID,
	INSIGHTS_ANALYST_DEMO_PROJECT_NAME,
	INSIGHTS_ANALYST_DEMO_WORKFLOWS,
	INSIGHTS_ANALYST_SUGGESTED_PROMPTS,
	type InsightsAnalystDemoWorkflow,
} from './insights-demo.data';
import { InsightsService } from './insights.service';

@Service()
export class InsightsDemoService {
	constructor(
		private readonly projectRepository: ProjectRepository,
		private readonly userRepository: UserRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionDataRepository: ExecutionDataRepository,
		private readonly insightsMetadataRepository: InsightsMetadataRepository,
		private readonly insightsByPeriodRepository: InsightsByPeriodRepository,
		private readonly insightsService: InsightsService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('insights');
	}

	async seed(): Promise<void> {
		await this.deleteLegacyDemoProjects();
		const project = await this.upsertDemoProject();
		await this.linkFirstOwnerToProject(project);
		await this.replaceDemoWorkflows(project);
		this.logger.debug('Insights Analyst demo data seeded');
	}

	async getOverview(): Promise<InsightsAnalystOverview> {
		const endDate = DateTime.utc().toJSDate();
		const startDate = DateTime.utc().minus({ days: 30 }).startOf('day').toJSDate();
		const projectId = INSIGHTS_ANALYST_DEMO_PROJECT_ID;
		const [summary, byTime, byWorkflow] = await Promise.all([
			this.insightsService.getInsightsSummary({ startDate, endDate, projectId }),
			this.insightsService.getInsightsByTime({ startDate, endDate, projectId }),
			this.insightsService.getInsightsByWorkflow({
				startDate,
				endDate,
				projectId,
				take: 25,
				sortBy: 'timeSaved:desc',
			}),
		]);

		const workflowData = byWorkflow.data;
		const completeByTime = byTime.map(({ date, values }) => ({
			date,
			values: {
				total: values.total ?? 0,
				succeeded: values.succeeded ?? 0,
				failed: values.failed ?? 0,
				failureRate: values.failureRate ?? 0,
				averageRunTime: values.averageRunTime ?? 0,
				timeSaved: values.timeSaved ?? 0,
			},
		}));
		return {
			project: {
				id: projectId,
				name: INSIGHTS_ANALYST_DEMO_PROJECT_NAME,
			},
			dateRange: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
			summary,
			byTime: completeByTime,
			byWorkflow,
			highlights: this.getHighlights(workflowData),
			lowImpactWorkflows: this.getLowImpactWorkflows(workflowData),
			suggestedPrompts: INSIGHTS_ANALYST_SUGGESTED_PROMPTS,
		};
	}

	private async upsertDemoProject(): Promise<Project> {
		const project = this.projectRepository.create({
			id: INSIGHTS_ANALYST_DEMO_PROJECT_ID,
			name: INSIGHTS_ANALYST_DEMO_PROJECT_NAME,
			type: 'team',
			icon: { type: 'icon', value: 'chart-column-decreasing' },
			description: 'Seeded project for local Insights Analyst demos.',
		});

		return await this.projectRepository.save(project);
	}

	private async deleteLegacyDemoProjects(): Promise<void> {
		const legacyProjects = await this.projectRepository.find({
			where: { name: INSIGHTS_ANALYST_DEMO_PROJECT_NAME },
			select: { id: true },
		});
		const legacyProjectIds = legacyProjects
			.map(({ id }) => id)
			.filter((id) => id !== INSIGHTS_ANALYST_DEMO_PROJECT_ID);

		if (legacyProjectIds.length === 0) return;

		const legacyWorkflowIds = (
			await this.sharedWorkflowRepository.find({
				where: { projectId: In(legacyProjectIds) },
				select: { workflowId: true },
			})
		).map(({ workflowId }) => workflowId);

		await this.deleteDemoWorkflows(legacyWorkflowIds);
		await this.projectRepository.manager.delete(ProjectRelation, {
			projectId: In(legacyProjectIds),
		});
		await this.projectRepository.delete({ id: In(legacyProjectIds) });
	}

	private async linkFirstOwnerToProject(project: Project): Promise<void> {
		const owner = await this.userRepository.findOne({
			where: { role: { slug: 'global:owner' } },
			relations: { role: true },
		});
		if (!owner) return;

		project.creatorId = owner.id;
		await this.projectRepository.save(project);
		await this.projectRepository.manager.save(ProjectRelation, {
			projectId: project.id,
			userId: owner.id,
			role: { slug: PROJECT_ADMIN_ROLE_SLUG },
		});
	}

	private async replaceDemoWorkflows(project: Project): Promise<void> {
		const workflowIds = INSIGHTS_ANALYST_DEMO_WORKFLOWS.map(({ id }) => id);
		await this.deleteDemoWorkflows(workflowIds);
		await this.workflowRepository.save(
			INSIGHTS_ANALYST_DEMO_WORKFLOWS.map((workflow) => this.createWorkflowEntity(workflow)),
		);
		await this.sharedWorkflowRepository.makeOwner(workflowIds, project.id);

		const workflows = await this.workflowRepository.findBy({ id: In(workflowIds) });
		for (const workflow of workflows) {
			const definition = INSIGHTS_ANALYST_DEMO_WORKFLOWS.find(({ id }) => id === workflow.id);
			if (definition) {
				const metadataRow = await this.createMetadata(definition, project);
				await this.createInsights(definition, metadataRow);
				await this.createExecutions(definition, workflow);
			}
		}
	}

	private async deleteDemoWorkflows(workflowIds: string[]): Promise<void> {
		if (workflowIds.length === 0) return;

		const executionIds = (
			await this.executionRepository.find({
				select: { id: true },
				where: { workflowId: In(workflowIds) },
			})
		).map(({ id }) => id);

		await this.executionDataRepository.deleteMany(executionIds);
		await this.executionRepository.delete({ workflowId: In(workflowIds) });

		const metadata = await this.insightsMetadataRepository.find({
			where: { workflowId: In(workflowIds) },
			select: { metaId: true },
		});
		const metaIds = metadata.map(({ metaId }) => metaId);
		if (metaIds.length > 0) {
			await this.insightsByPeriodRepository.delete({ metaId: In(metaIds) });
			await this.insightsMetadataRepository.delete({ metaId: In(metaIds) });
		}

		await this.sharedWorkflowRepository.delete({ workflowId: In(workflowIds) });
		await this.workflowRepository.delete({ id: In(workflowIds) });
	}

	private createWorkflowEntity(definition: InsightsAnalystDemoWorkflow): WorkflowEntity {
		const workflow = new WorkflowEntity();
		workflow.id = definition.id;
		workflow.name = definition.name;
		workflow.description = definition.story;
		workflow.active = false;
		workflow.isArchived = false;
		workflow.nodes = this.createWorkflowNodes(definition);
		workflow.connections = this.createWorkflowConnections();
		workflow.settings = {
			timeSavedMode: 'fixed',
			timeSavedPerExecution: definition.timeSavedPerExecution,
		};
		workflow.versionId = `00000000-0000-4000-8000-0000000000${definition.id.slice(-2)}`;
		workflow.activeVersionId = null;
		workflow.versionCounter = 1;
		workflow.triggerCount = 1;
		return workflow;
	}

	private createWorkflowNodes(definition: InsightsAnalystDemoWorkflow): INode[] {
		return [
			{
				id: `${definition.id}-trigger`,
				name: 'Schedule Trigger',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1.2,
				position: [240, 300],
				parameters: {},
			},
			{
				id: `${definition.id}-set`,
				name: 'Prepare operation summary',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [520, 300],
				parameters: {},
			},
		];
	}

	private createWorkflowConnections(): IConnections {
		return {
			'Schedule Trigger': {
				main: [[{ node: 'Prepare operation summary', type: 'main', index: 0 }]],
			},
		};
	}

	private async createMetadata(
		definition: InsightsAnalystDemoWorkflow,
		project: Project,
	): Promise<InsightsMetadata> {
		const metadata = new InsightsMetadata();
		metadata.workflowId = definition.id;
		metadata.workflowName = definition.name;
		metadata.projectId = project.id;
		metadata.projectName = project.name;
		return await this.insightsMetadataRepository.save(metadata);
	}

	private async createInsights(
		definition: InsightsAnalystDemoWorkflow,
		metadata: InsightsMetadata,
	): Promise<void> {
		const today = DateTime.utc().startOf('day');
		const events: InsightsByPeriod[] = [];
		for (let daysAgo = 1; daysAgo <= 30; daysAgo++) {
			const inCurrentWeek = daysAgo <= 7;
			const multiplier = inCurrentWeek ? 1 : definition.previousPeriodMultiplier;
			const successes = Math.round(definition.dailySuccesses * multiplier);
			const failures = Math.round(definition.dailyFailures * multiplier);
			const total = successes + failures;
			const periodStart = today.minus({ days: daysAgo }).toJSDate();

			events.push(
				this.createInsight(metadata.metaId, 'success', successes, periodStart),
				this.createInsight(metadata.metaId, 'failure', failures, periodStart),
				this.createInsight(
					metadata.metaId,
					'runtime_ms',
					total * definition.averageRuntimeMs,
					periodStart,
				),
				this.createInsight(
					metadata.metaId,
					'time_saved_min',
					successes * definition.timeSavedPerExecution,
					periodStart,
				),
			);
		}
		await this.insightsByPeriodRepository.save(events);
	}

	private createInsight(
		metaId: number,
		type: InsightsByPeriod['type'],
		value: number,
		periodStart: Date,
	): InsightsByPeriod {
		const insight = new InsightsByPeriod();
		insight.metaId = metaId;
		insight.type = type;
		insight.value = value;
		insight.periodUnit = 'day';
		insight.periodStart = periodStart;
		return insight;
	}

	private async createExecutions(
		definition: InsightsAnalystDemoWorkflow,
		workflow: WorkflowEntity,
	): Promise<void> {
		for (let daysAgo = 1; daysAgo <= 10; daysAgo++) {
			const startedAt = DateTime.utc().minus({ days: daysAgo, hours: daysAgo % 4 });
			const stoppedAt = startedAt.plus({ milliseconds: definition.averageRuntimeMs });
			const execution = new ExecutionEntity();
			execution.finished = true;
			execution.mode = 'webhook';
			execution.status = daysAgo % 5 === 0 && definition.dailyFailures > 0 ? 'error' : 'success';
			execution.createdAt = startedAt.toJSDate();
			execution.startedAt = startedAt.toJSDate();
			execution.stoppedAt = stoppedAt.toJSDate();
			execution.workflowId = workflow.id;
			execution.workflow = workflow;
			execution.retryOf = '';
			execution.retrySuccessId = '';
			execution.waitTill = null;
			execution.storedAt = 'db';
			execution.tracingContext = null;
			execution.deduplicationKey = `insights-analyst-demo:${workflow.id}:${daysAgo}`;
			const savedExecution = await this.executionRepository.save(execution);
			await this.executionDataRepository.save(
				this.executionDataRepository.create({
					executionId: savedExecution.id,
					data: stringify(createEmptyRunExecutionData()),
					workflowData: workflow,
					workflowVersionId: workflow.versionId,
				}),
			);
		}
	}

	private getHighlights(rows: InsightsByWorkflow['data']): InsightsAnalystHighlight[] {
		const byTimeSaved = [...rows].sort((a, b) => b.timeSaved - a.timeSaved);
		const byFailures = [...rows].sort((a, b) => b.failed - a.failed);
		return [
			this.createHighlight('highest-impact', 'Highest automation impact', byTimeSaved[0]),
			this.createHighlight('lowest-impact', 'Lowest time saved per run', byTimeSaved.at(-1)),
			this.createHighlight('needs-attention', 'Needs attention', byFailures[0]),
		].filter((highlight): highlight is InsightsAnalystHighlight => highlight !== null);
	}

	private createHighlight(
		id: string,
		title: string,
		row: InsightsByWorkflow['data'][number] | undefined,
	): InsightsAnalystHighlight | null {
		if (!row?.workflowId) return null;
		const definition = INSIGHTS_ANALYST_DEMO_WORKFLOWS.find(
			({ id: workflowId }) => workflowId === row.workflowId,
		);
		return {
			id,
			title,
			workflowId: row.workflowId,
			workflowName: row.workflowName,
			description: definition?.story ?? row.projectName,
			trend: definition?.trend ?? 'neutral',
			value: id === 'needs-attention' ? row.failed : row.timeSaved,
			unit: id === 'needs-attention' ? 'count' : 'minute',
		};
	}

	private getLowImpactWorkflows(
		rows: InsightsByWorkflow['data'],
	): InsightsAnalystLowImpactWorkflow[] {
		return [...rows]
			.sort((a, b) => a.timeSaved - b.timeSaved)
			.slice(0, 3)
			.flatMap((row) => {
				if (!row.workflowId) return [];
				const definition = INSIGHTS_ANALYST_DEMO_WORKFLOWS.find(({ id }) => id === row.workflowId);
				return [
					{
						workflowId: row.workflowId,
						workflowName: row.workflowName,
						description: definition?.story ?? row.projectName,
						timeSaved: row.timeSaved,
						total: row.total,
					},
				];
			});
	}
}

import { Container } from '@n8n/di';
import type { Workflow } from 'n8n-workflow';

import { StatisticsNames, type WorkflowStatistics } from '@/databases/entities/workflow-statistics';
import { WorkflowStatisticsRepository } from '@/databases/repositories/workflow-statistics.repository';

export async function createWorkflowStatisticsItem(
	workflowId: Workflow['id'],
	data?: Partial<WorkflowStatistics>,
) {
	const entity = Container.get(WorkflowStatisticsRepository).create({
		count: 0,
		latestEvent: new Date().toISOString(),
		name: StatisticsNames.manualSuccess,
		...(data ?? {}),
		workflowId,
	});

	await Container.get(WorkflowStatisticsRepository).insert(entity);

	return entity;
}

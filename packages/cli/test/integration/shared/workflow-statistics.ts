import { GlobalConfig } from '@n8n/config';
import { WorkflowStatisticsRepository, type StatisticsNames } from '@n8n/db';
import { Container } from '@n8n/di';

/**
 * Fold the pending Postgres deltas, so a read sees the same materialised counter that the
 * SQLite path writes directly. No-op on SQLite.
 */
const foldPendingIncrements = async () => {
	if (Container.get(GlobalConfig).database.type !== 'postgresdb') return;

	const repository = Container.get(WorkflowStatisticsRepository);
	await repository.rollupIncrements(repository.manager, 10_000);
};

export const findWorkflowStatistic = async (workflowId: string, name: StatisticsNames) => {
	await foldPendingIncrements();

	return await Container.get(WorkflowStatisticsRepository).findOneBy({ workflowId, name });
};

export const findWorkflowStatistics = async (workflowId: string) => {
	await foldPendingIncrements();

	return await Container.get(WorkflowStatisticsRepository).findBy({ workflowId });
};

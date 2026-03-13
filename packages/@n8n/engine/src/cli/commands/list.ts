import { createDataSource } from '../../database/data-source';
import { WorkflowExecution } from '../../database/entities/workflow-execution.entity';

export async function listCommand(args: string[]): Promise<void> {
	let workflowId: string | undefined;
	let status: string | undefined;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--workflow' && args[i + 1]) workflowId = args[++i];
		if (args[i] === '--status' && args[i + 1]) status = args[++i];
	}

	const dataSource = createDataSource();
	await dataSource.initialize();

	const qb = dataSource
		.getRepository(WorkflowExecution)
		.createQueryBuilder('we')
		.select([
			'we.id',
			'we.workflowId',
			'we.workflowVersion',
			'we.status',
			'we.mode',
			'we.startedAt',
			'we.completedAt',
			'we.durationMs',
		])
		.orderBy('we.createdAt', 'DESC')
		.limit(50);

	if (workflowId) qb.andWhere('we.workflowId = :workflowId', { workflowId });
	if (status) qb.andWhere('we.status = :status', { status });

	const executions = await qb.getMany();

	if (executions.length === 0) {
		console.log('No executions found.');
	} else {
		console.table(
			executions.map((e) => ({
				id: e.id.substring(0, 8) + '...',
				workflow: e.workflowId.substring(0, 8) + '...',
				version: e.workflowVersion,
				status: e.status,
				mode: e.mode,
				started: e.startedAt?.toISOString() ?? '-',
				duration: e.durationMs != null ? `${e.durationMs}ms` : '-',
			})),
		);
	}

	await dataSource.destroy();
}

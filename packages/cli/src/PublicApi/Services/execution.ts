import { In, Equal, Not, ObjectLiteral, LessThan } from 'typeorm';
import { Db, IExecutionFlattedDb } from '../..';
import { ExecutionStatus } from '../publicApiRequest';

function getStatusCondition(status: ExecutionStatus): ObjectLiteral {
	const condition: ObjectLiteral = {};

	if (status === 'success') {
		condition.finished = true;
	} else if (status === 'running') {
		condition.stoppedAt = Equal(null);
	} else if (status === 'waiting') {
		condition.waitTill = Not(null);
	} else if (status === 'error') {
		condition.stoppedAt = Not(null);
	}
	return condition;
}

function getExecutionSelectableProperties(): Array<keyof IExecutionFlattedDb> {
	return [
		'id',
		'data',
		'mode',
		'retryOf',
		'retrySuccessId',
		'startedAt',
		'stoppedAt',
		'workflowId',
		'waitTill',
	];
}

export async function getExecutions(data: {
	limit: number;
	lastId?: number;
	workflowIds?: number[];
	status?: ExecutionStatus;
}): Promise<IExecutionFlattedDb[]> {
	const executions = await Db.collections.Execution.find({
		select: getExecutionSelectableProperties(),
		where: {
			...(data.lastId && { id: LessThan(data.lastId) }),
			...(data.status && { ...getStatusCondition(data.status) }),
			...(data.workflowIds && { workflowId: In(data.workflowIds) }),
		},
		order: { id: 'DESC' },
		take: data.limit,
	});
	return executions;
}

export async function getExecutionsCount(data: {
	limit: number;
	lastId?: number;
	workflowIds?: number[];
	status?: ExecutionStatus;
}): Promise<number> {
	const executions = await Db.collections.Execution.count({
		where: {
			id: LessThan(data.lastId),
			...(data.status && { ...getStatusCondition(data.status) }),
			...(data.workflowIds && { workflowId: In(data.workflowIds) }),
		},
		take: data.limit,
	});
	return executions;
}

export async function getExecutionInWorkflows(
	id: number,
	workflows: number[],
): Promise<IExecutionFlattedDb | undefined> {
	const execution = await Db.collections.Execution.findOne({
		where: {
			id,
			workflowId: In(workflows),
		},
	});
	return execution;
}

export async function deleteExecution(execution: IExecutionFlattedDb): Promise<void> {
	await Db.collections.Execution.remove(execution);
}

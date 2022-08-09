import { parse } from 'flatted';
import { In, Not, Raw, ObjectLiteral, LessThan, IsNull } from 'typeorm';

import { Db, IExecutionFlattedDb, IExecutionResponseApi } from '../../../..';
import { ExecutionStatus } from '../../../types';

function prepareExecutionData(
	execution: IExecutionFlattedDb | undefined,
): IExecutionResponseApi | undefined {
	if (!execution) return undefined;

	// @ts-ignore
	if (!execution.data) return execution;

	return {
		...execution,
		data: parse(execution.data) as object,
	};
}

function getStatusCondition(status: ExecutionStatus): ObjectLiteral {
	const condition: ObjectLiteral = {};

	if (status === 'success') {
		condition.finished = true;
	} else if (status === 'waiting') {
		condition.waitTill = Not(IsNull());
	} else if (status === 'error') {
		condition.stoppedAt = Not(IsNull());
		condition.finished = false;
	}

	return condition;
}

function getExecutionSelectableProperties(includeData?: boolean): Array<keyof IExecutionFlattedDb> {
	const selectFields: Array<keyof IExecutionFlattedDb> = [
		'id',
		'mode',
		'retryOf',
		'retrySuccessId',
		'startedAt',
		'stoppedAt',
		'workflowId',
		'waitTill',
		'finished',
	];

	if (includeData) selectFields.push('data');

	return selectFields;
}

export async function getExecutions(data: {
	limit: number;
	includeData?: boolean;
	lastId?: number;
	workflowIds?: number[];
	status?: ExecutionStatus;
	excludedExecutionsIds?: number[];
}): Promise<IExecutionResponseApi[]> {
	const where = {
		...(data.lastId && { id: LessThan(data.lastId) }),
		...(data.status && { ...getStatusCondition(data.status) }),
		...(data.workflowIds && { workflowId: In(data.workflowIds.map(String)) }),
		...(data.excludedExecutionsIds && { id: Not(In(data.excludedExecutionsIds)) }),
	};

	if (data.lastId && data.excludedExecutionsIds) {
		where.id = Raw((id) => `${id} < :lastId AND ${id} NOT IN (:...excludedExecutionsIds)`, {
			lastId: data.lastId,
			excludedExecutionsIds: data.excludedExecutionsIds,
		});
	}

	const executions = await Db.collections.Execution.find({
		select: getExecutionSelectableProperties(data.includeData),
		where,
		order: { id: 'DESC' },
		take: data.limit,
	});

	return executions.map((execution) => prepareExecutionData(execution)) as IExecutionResponseApi[];
}

export async function getExecutionsCount(data: {
	limit: number;
	lastId?: number;
	workflowIds?: number[];
	status?: ExecutionStatus;
	excludedWorkflowIds?: number[];
}): Promise<number> {
	const executions = await Db.collections.Execution.count({
		where: {
			...(data.lastId && { id: LessThan(data.lastId) }),
			...(data.status && { ...getStatusCondition(data.status) }),
			...(data.workflowIds && { workflowId: In(data.workflowIds) }),
			...(data.excludedWorkflowIds && { workflowId: Not(In(data.excludedWorkflowIds)) }),
		},
		take: data.limit,
	});

	return executions;
}

export async function getExecutionInWorkflows(
	id: number,
	workflows: number[],
	includeData?: boolean,
): Promise<IExecutionResponseApi | undefined> {
	const execution = await Db.collections.Execution.findOne({
		select: getExecutionSelectableProperties(includeData),
		where: {
			id,
			workflowId: In(workflows),
		},
	});

	return prepareExecutionData(execution);
}

export async function deleteExecution(
	execution: IExecutionResponseApi | undefined,
): Promise<IExecutionFlattedDb> {
	// @ts-ignore
	return Db.collections.Execution.remove(execution);
}

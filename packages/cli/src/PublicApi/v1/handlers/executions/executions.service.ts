import { parse } from 'flatted';
import { In, Not, Raw, LessThan, IsNull, FindOperator } from 'typeorm';

import { Db, IExecutionFlattedDb, IExecutionResponseApi } from '../../../..';
import { ExecutionEntity } from '../../../../databases/entities/ExecutionEntity';
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

function getStatusCondition(status: ExecutionStatus) {
	const condition: {
		finished?: boolean;
		waitTill?: FindOperator<ExecutionEntity>;
		stoppedAt?: FindOperator<ExecutionEntity>;
	} = {};

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

export async function getExecutions(params: {
	limit: number;
	includeData?: boolean;
	lastId?: number;
	workflowIds?: number[];
	status?: ExecutionStatus;
	excludedExecutionsIds?: number[];
}): Promise<IExecutionResponseApi[]> {
	type WhereClause = Record<
		string,
		string | boolean | FindOperator<number | Partial<ExecutionEntity>>
	>;

	let where: WhereClause = {};

	if (params.lastId && params.excludedExecutionsIds?.length) {
		where.id = Raw((id) => `${id} < :lastId AND ${id} NOT IN (:...excludedExecutionsIds)`, {
			lastId: params.lastId,
			excludedExecutionsIds: params.excludedExecutionsIds,
		});
	} else if (params.lastId) {
		where.id = LessThan(params.lastId);
	} else if (params.excludedExecutionsIds?.length) {
		where.id = Not(In(params.excludedExecutionsIds));
	}

	if (params.status) {
		where = { ...where, ...getStatusCondition(params.status) };
	}

	if (params.workflowIds) {
		where = { ...where, workflowId: In(params.workflowIds) };
	}

	const executions = await Db.collections.Execution.find({
		select: getExecutionSelectableProperties(params.includeData),
		where,
		order: { id: 'DESC' },
		take: params.limit,
	});

	return executions.map(prepareExecutionData) as IExecutionResponseApi[];
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

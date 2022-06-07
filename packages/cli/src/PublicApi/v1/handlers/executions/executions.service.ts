import { parse } from 'flatted';
import { In, Not, ObjectLiteral, LessThan, IsNull } from 'typeorm';
import { Db, ExecutionDataFormat, IExecutionFlattedDb, IExecutionResponse } from '../../../..';
import { ExecutionStatus } from '../../../types';

function prepareExecutionData(
	execution: IExecutionFlattedDb | undefined,
	format: ExecutionDataFormat,
): IExecutionResponse | IExecutionFlattedDb | undefined {
	if (execution === undefined || format === 'flat') {
		return execution;
	}

	if (format === 'empty') {
		return {
			id: execution.id,
			data: '',
			retryOf: execution.retryOf,
			retrySuccessId: execution.retrySuccessId,
			waitTill: execution.waitTill,
			workflowData: execution.workflowData,
		} as IExecutionFlattedDb;
	}
	return {
		id: execution.id,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		data: parse(execution.data),
		retryOf: execution.retryOf,
		retrySuccessId: execution.retrySuccessId,
		waitTill: execution.waitTill,
		workflowData: execution.workflowData,
	} as IExecutionResponse;
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
		'finished',
	];
}

export async function getExecutions(data: {
	limit: number;
	dataFormat?: ExecutionDataFormat;
	lastId?: number;
	workflowIds?: number[];
	status?: ExecutionStatus;
	excludedExecutionsIds?: number[];
}): Promise<IExecutionResponse[] | IExecutionFlattedDb[]> {
	const executions = await Db.collections.Execution.find({
		select: getExecutionSelectableProperties(),
		where: {
			...(data.lastId && { id: LessThan(data.lastId) }),
			...(data.status && { ...getStatusCondition(data.status) }),
			...(data.workflowIds && { workflowId: In(data.workflowIds.map(String)) }),
			...(data.excludedExecutionsIds && { id: Not(In(data.excludedExecutionsIds)) }),
		},
		order: { id: 'DESC' },
		take: data.limit,
	});

	return executions.map((execution) =>
		prepareExecutionData(execution, data.dataFormat ?? 'unflatted'),
	) as IExecutionResponse[] | IExecutionFlattedDb[];
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
	executionDataFormat: ExecutionDataFormat,
): Promise<IExecutionResponse | IExecutionFlattedDb | undefined> {
	const execution = await Db.collections.Execution.findOne({
		select: getExecutionSelectableProperties(),
		where: {
			id,
			workflowId: In(workflows),
		},
	});
	return prepareExecutionData(execution, executionDataFormat);
}

export async function deleteExecution(
	execution: IExecutionResponse | IExecutionFlattedDb | undefined,
): Promise<void> {
	await Db.collections.Execution.remove(execution as IExecutionFlattedDb);
}

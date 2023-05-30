import type { DeleteResult, FindOptionsWhere } from 'typeorm';
import { In, Not, Raw, LessThan, IsNull } from 'typeorm';

import * as Db from '@/Db';
import type { IExecutionBase, IExecutionFlattedDb } from '@/Interfaces';
import type { ExecutionStatus } from 'n8n-workflow';
import Container from 'typedi';
import { ExecutionRepository } from '@/databases/repositories';
import type { ExecutionEntity } from '@/databases/entities/ExecutionEntity';

function getStatusCondition(status: ExecutionStatus) {
	const condition: Pick<
		FindOptionsWhere<IExecutionFlattedDb>,
		'finished' | 'waitTill' | 'stoppedAt'
	> = {};

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

function getExecutionSelectableProperties(): Array<keyof ExecutionEntity> {
	return [
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
}

export async function getExecutions(params: {
	limit: number;
	includeData?: boolean;
	lastId?: string;
	workflowIds?: string[];
	status?: ExecutionStatus;
	excludedExecutionsIds?: string[];
}): Promise<IExecutionBase[]> {
	let where: FindOptionsWhere<IExecutionFlattedDb> = {};

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

	const executions = await Container.get(ExecutionRepository).findMultipleExecutions(
		{
			select: getExecutionSelectableProperties(),
			where,
			order: { id: 'DESC' },
			take: params.limit,
			relations: ['executionData'],
		},
		{
			includeData: params.includeData,
			unflattenData: true,
		},
	);

	return executions;
}

export async function getExecutionsCount(data: {
	limit: number;
	lastId?: string;
	workflowIds?: string[];
	status?: ExecutionStatus;
	excludedWorkflowIds?: string[];
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
	id: string,
	workflowIds: string[],
	includeData?: boolean,
): Promise<IExecutionBase | undefined> {
	return Container.get(ExecutionRepository).findSingleExecution(id, {
		where: {
			workflowId: In(workflowIds),
		},
		includeData,
		unflattenData: true,
	});
}

export async function deleteExecution(execution: IExecutionBase): Promise<DeleteResult> {
	return Container.get(ExecutionRepository).deleteExecution(execution.id as string);
}

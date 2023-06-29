import type { DeleteResult, FindOptionsWhere } from 'typeorm';
import { In, Not, Raw, LessThan } from 'typeorm';

import * as Db from '@/Db';
import type { IExecutionBase, IExecutionFlattedDb } from '@/Interfaces';
import type { ExecutionStatus } from 'n8n-workflow';
import Container from 'typedi';
import { ExecutionRepository } from '@/databases/repositories';

function getStatusCondition(status: ExecutionStatus | ExecutionStatus[]) {
	const condition: Pick<FindOptionsWhere<IExecutionFlattedDb>, 'status'> = {};
	if (typeof status === 'string') {
		status = [status];
	}
	// Prevent breaking change
	const output = new Set<string>();
	for (const currFilter of status) {
		if (currFilter === 'error') {
			output.add('error');
			output.add('crashed');
			output.add('failed');
		} else {
			output.add(currFilter);
		}
	}
	condition.status = In(Array.from(output));
	return condition;
}

export async function getExecutions(params: {
	limit: number;
	includeData?: boolean;
	lastId?: string;
	workflowIds?: string[];
	status?: ExecutionStatus | ExecutionStatus[];
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

	return Container.get(ExecutionRepository).findMultipleExecutions(
		{
			select: [
				'id',
				'mode',
				'retryOf',
				'retrySuccessId',
				'startedAt',
				'stoppedAt',
				'workflowId',
				'waitTill',
				'finished',
			],
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
}

export async function getExecutionsCount(data: {
	limit: number;
	lastId?: string;
	workflowIds?: string[];
	status?: ExecutionStatus | ExecutionStatus[];
	excludedWorkflowIds?: string[];
}): Promise<number> {
	// TODO: Consider moving this to the repository as well

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

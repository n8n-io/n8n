import Container from 'typedi';
import type { ExecutionData } from '@db/entities/ExecutionData';
import type { ExecutionEntity } from '@db/entities/ExecutionEntity';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { ExecutionDataRepository } from '@db/repositories/executionData.repository';

export async function createManyExecutions(
	amount: number,
	workflow: WorkflowEntity,
	callback: (workflow: WorkflowEntity) => Promise<ExecutionEntity>,
) {
	const executionsRequests = [...Array(amount)].map(async (_) => await callback(workflow));
	return await Promise.all(executionsRequests);
}

/**
 * Store a execution in the DB and assign it to a workflow.
 */
export async function createExecution(
	attributes: Partial<ExecutionEntity & ExecutionData>,
	workflow: WorkflowEntity,
) {
	const { data, finished, mode, startedAt, stoppedAt, waitTill, status, deletedAt } = attributes;

	const execution = await Container.get(ExecutionRepository).save({
		finished: finished ?? true,
		mode: mode ?? 'manual',
		startedAt: startedAt ?? new Date(),
		...(workflow !== undefined && { workflowId: workflow.id }),
		stoppedAt: stoppedAt ?? new Date(),
		waitTill: waitTill ?? null,
		status,
		deletedAt,
	});

	await Container.get(ExecutionDataRepository).save({
		data: data ?? '[]',
		workflowData: workflow ?? {},
		executionId: execution.id,
	});

	return execution;
}

/**
 * Store a successful execution in the DB and assign it to a workflow.
 */
export async function createSuccessfulExecution(workflow: WorkflowEntity) {
	return await createExecution({ finished: true, status: 'success' }, workflow);
}

/**
 * Store an error execution in the DB and assign it to a workflow.
 */
export async function createErrorExecution(workflow: WorkflowEntity) {
	return await createExecution(
		{ finished: false, stoppedAt: new Date(), status: 'error' },
		workflow,
	);
}

/**
 * Store a waiting execution in the DB and assign it to a workflow.
 */
export async function createWaitingExecution(workflow: WorkflowEntity) {
	return await createExecution(
		{ finished: false, waitTill: new Date(), status: 'waiting' },
		workflow,
	);
}

export async function getAllExecutions() {
	return await Container.get(ExecutionRepository).find();
}

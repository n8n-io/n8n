import Container from 'typedi';
import type { ExecutionData } from '@/databases/entities/execution-data';
import type { ExecutionEntity } from '@/databases/entities/execution-entity';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { ExecutionDataRepository } from '@/databases/repositories/execution-data.repository';
import { ExecutionMetadataRepository } from '@/databases/repositories/execution-metadata.repository';

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
	attributes: Partial<
		Omit<ExecutionEntity, 'metadata'> &
			ExecutionData & { metadata: Array<{ key: string; value: string }> }
	>,
	workflow: WorkflowEntity,
) {
	const { data, finished, mode, startedAt, stoppedAt, waitTill, status, deletedAt, metadata } =
		attributes;

	const execution = await Container.get(ExecutionRepository).save({
		finished: finished ?? true,
		mode: mode ?? 'manual',
		startedAt: startedAt ?? new Date(),
		...(workflow !== undefined && { workflowId: workflow.id }),
		stoppedAt: stoppedAt ?? new Date(),
		waitTill: waitTill ?? null,
		status: status ?? 'success',
		deletedAt,
	});

	if (metadata?.length) {
		const metadataToSave = metadata.map(({ key, value }) => ({
			key,
			value,
			execution: { id: execution.id },
		}));

		await Container.get(ExecutionMetadataRepository).save(metadataToSave);
	}

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

import { Container } from '@n8n/di';
import type { AnnotationVote } from 'n8n-workflow';

import type { ExecutionData } from '@/databases/entities/execution-data';
import type { ExecutionEntity } from '@/databases/entities/execution-entity';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { AnnotationTagRepository } from '@/databases/repositories/annotation-tag.repository.ee';
import { ExecutionDataRepository } from '@/databases/repositories/execution-data.repository';
import { ExecutionMetadataRepository } from '@/databases/repositories/execution-metadata.repository';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { ExecutionService } from '@/executions/execution.service';
import { Telemetry } from '@/telemetry';
import { mockInstance } from '@test/mocking';

mockInstance(Telemetry);

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
		createdAt: new Date(),
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

export async function annotateExecution(
	executionId: string,
	annotation: { vote?: AnnotationVote | null; tags?: string[] },
	sharedWorkflowIds: string[],
) {
	await Container.get(ExecutionService).annotate(executionId, annotation, sharedWorkflowIds);
}

export async function getAllExecutions() {
	return await Container.get(ExecutionRepository).find();
}

export async function createAnnotationTags(annotationTags: string[]) {
	const tagRepository = Container.get(AnnotationTagRepository);
	return await tagRepository.save(annotationTags.map((name) => tagRepository.create({ name })));
}

import { mockInstance } from '@n8n/backend-test-utils';
import type { ExecutionEntity, ExecutionData } from '@n8n/db';
import {
	ExecutionDataRepository,
	ExecutionMetadataRepository,
	ExecutionRepository,
	AnnotationTagRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { AnnotationVote, IWorkflowBase } from 'n8n-workflow';

import { ExecutionService } from '@/executions/execution.service';
import { Telemetry } from '@/telemetry';

mockInstance(Telemetry);

export async function createManyExecutions(
	amount: number,
	workflow: IWorkflowBase,
	callback: (workflow: IWorkflowBase) => Promise<ExecutionEntity>,
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
	workflow: IWorkflowBase,
) {
	const {
		data,
		finished,
		mode,
		startedAt,
		stoppedAt,
		waitTill,
		status,
		deletedAt,
		metadata,
		createdAt,
	} = attributes;

	const execution = await Container.get(ExecutionRepository).save({
		finished: finished ?? true,
		mode: mode ?? 'manual',
		createdAt: createdAt ?? new Date(),
		startedAt: startedAt === undefined ? new Date() : startedAt,
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
export async function createSuccessfulExecution(workflow: IWorkflowBase) {
	return await createExecution({ finished: true, status: 'success' }, workflow);
}

/**
 * Store an error execution in the DB and assign it to a workflow.
 */
export async function createErrorExecution(workflow: IWorkflowBase) {
	return await createExecution(
		{ finished: false, stoppedAt: new Date(), status: 'error' },
		workflow,
	);
}

/**
 * Store a waiting execution in the DB and assign it to a workflow.
 */
export async function createWaitingExecution(workflow: IWorkflowBase) {
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

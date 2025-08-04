'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createManyExecutions = createManyExecutions;
exports.createExecution = createExecution;
exports.createSuccessfulExecution = createSuccessfulExecution;
exports.createErrorExecution = createErrorExecution;
exports.createWaitingExecution = createWaitingExecution;
exports.annotateExecution = annotateExecution;
exports.getAllExecutions = getAllExecutions;
exports.createAnnotationTags = createAnnotationTags;
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const execution_service_1 = require('@/executions/execution.service');
const telemetry_1 = require('@/telemetry');
(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
async function createManyExecutions(amount, workflow, callback) {
	const executionsRequests = [...Array(amount)].map(async (_) => await callback(workflow));
	return await Promise.all(executionsRequests);
}
async function createExecution(attributes, workflow) {
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
	const execution = await di_1.Container.get(db_1.ExecutionRepository).save({
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
		await di_1.Container.get(db_1.ExecutionMetadataRepository).save(metadataToSave);
	}
	await di_1.Container.get(db_1.ExecutionDataRepository).save({
		data: data ?? '[]',
		workflowData: workflow ?? {},
		executionId: execution.id,
	});
	return execution;
}
async function createSuccessfulExecution(workflow) {
	return await createExecution({ finished: true, status: 'success' }, workflow);
}
async function createErrorExecution(workflow) {
	return await createExecution(
		{ finished: false, stoppedAt: new Date(), status: 'error' },
		workflow,
	);
}
async function createWaitingExecution(workflow) {
	return await createExecution(
		{ finished: false, waitTill: new Date(), status: 'waiting' },
		workflow,
	);
}
async function annotateExecution(executionId, annotation, sharedWorkflowIds) {
	await di_1.Container.get(execution_service_1.ExecutionService).annotate(
		executionId,
		annotation,
		sharedWorkflowIds,
	);
}
async function getAllExecutions() {
	return await di_1.Container.get(db_1.ExecutionRepository).find();
}
async function createAnnotationTags(annotationTags) {
	const tagRepository = di_1.Container.get(db_1.AnnotationTagRepository);
	return await tagRepository.save(annotationTags.map((name) => tagRepository.create({ name })));
}
//# sourceMappingURL=executions.js.map

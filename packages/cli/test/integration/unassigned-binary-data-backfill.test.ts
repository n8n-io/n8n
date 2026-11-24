import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { BinaryDataRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import type { IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';

import { DatabaseManager } from '@/binary-data/database.manager';
import { UnassignedBinaryDataBackfillService } from '@/binary-data/unassigned-binary-data-backfill.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';

import {
	createExecution,
	createManyExecutions,
	createSuccessfulExecution,
} from './shared/db/executions';

const ONE_MINUTE_MS = 60_000;

let workflow: IWorkflowBase;
let backfillService: UnassignedBinaryDataBackfillService;

const neverAborted = () => new AbortController().signal;

const storeUnassignedFile = async () => {
	const { fileId } = await Container.get(DatabaseManager).store(
		{ type: 'execution', workflowId: workflow.id, executionId: '' },
		Buffer.from('content'),
		{},
	);
	return fileId;
};

const createExecutionReferringTo = async (
	fileId: string,
	mode: WorkflowExecuteMode = 'webhook',
	parentExecution?: { executionId: string; workflowId: string },
) =>
	await createExecution(
		{
			mode,
			data: stringify({
				parentExecution,
				resultData: {
					runData: {
						Webhook: [
							{ data: { main: [[{ json: {}, binary: { file: { id: `database:${fileId}` } } }]] } },
						],
					},
				},
			}),
		},
		workflow,
	);

const findSourceId = async (fileId: string) =>
	(await Container.get(BinaryDataRepository).findSourceByFileId(fileId))?.sourceId;

beforeAll(async () => {
	await testDb.init();
	backfillService = Container.get(UnassignedBinaryDataBackfillService);
});

beforeEach(async () => {
	await testDb.truncate(['BinaryDataFile', 'ExecutionEntity', 'WorkflowEntity', 'Settings']);
	workflow = await createWorkflow();
});

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(async () => {
	await testDb.terminate();
});

it('should assign an unassigned file to the webhook execution that refers to it', async () => {
	const fileId = await storeUnassignedFile();
	const execution = await createExecutionReferringTo(fileId);

	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);

	expect(await findSourceId(fileId)).toBe(execution.id);
});

it('should leave a file unassigned when only a non-webhook execution refers to it', async () => {
	const fileId = await storeUnassignedFile();
	await createExecutionReferringTo(fileId, 'manual');

	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);

	expect(await findSourceId(fileId)).toBe('temp');
});

it('should leave a file unassigned when only a sub-execution refers to it', async () => {
	const fileId = await storeUnassignedFile();
	await createExecutionReferringTo(fileId, 'webhook', {
		executionId: '1',
		workflowId: workflow.id,
	});

	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);

	expect(await findSourceId(fileId)).toBe('temp');
});

it('should leave a file unassigned when no execution refers to it', async () => {
	const fileId = await storeUnassignedFile();
	await createExecutionReferringTo(await storeUnassignedFile());

	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);

	expect(await findSourceId(fileId)).toBe('temp');
});

it('should keep the first execution when a later one refers to the same file', async () => {
	const fileId = await storeUnassignedFile();
	const first = await createExecutionReferringTo(fileId);
	await createExecutionReferringTo(fileId);

	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);

	expect(await findSourceId(fileId)).toBe(first.id);
});

it('should continue after an execution with unreadable data', async () => {
	await createExecution({ mode: 'webhook', data: 'not flatted' }, workflow);
	const fileId = await storeUnassignedFile();
	const execution = await createExecutionReferringTo(fileId);

	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);

	expect(await findSourceId(fileId)).toBe(execution.id);
});

it('should fail and do the execution again when its data cannot be read for now', async () => {
	const fileId = await storeUnassignedFile();
	const execution = await createExecutionReferringTo(fileId);
	vi.spyOn(Container.get(ExecutionPersistence), 'findSingleExecution').mockRejectedValueOnce(
		new Error('store unreachable'),
	);

	await expect(backfillService.backfill(neverAborted(), ONE_MINUTE_MS)).rejects.toThrow(
		'store unreachable',
	);
	expect(await findSourceId(fileId)).toBe('temp');

	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);
	expect(await findSourceId(fileId)).toBe(execution.id);
});

it('should cover executions beyond the first ID range', async () => {
	const firstFileId = await storeUnassignedFile();
	const first = await createExecutionReferringTo(firstFileId);
	await createManyExecutions(450, workflow, createSuccessfulExecution);
	const lastFileId = await storeUnassignedFile();
	const last = await createExecutionReferringTo(lastFileId);

	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);

	expect(await findSourceId(firstFileId)).toBe(first.id);
	expect(await findSourceId(lastFileId)).toBe(last.id);
});

it('should continue after an execution without run data', async () => {
	await createExecution({ mode: 'webhook', data: '[]' }, workflow);
	const fileId = await storeUnassignedFile();
	const execution = await createExecutionReferringTo(fileId);

	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);

	expect(await findSourceId(fileId)).toBe(execution.id);
});

it('should read no execution when no file is unassigned', async () => {
	await createExecution({ mode: 'webhook' }, workflow);
	const findSingleExecution = vi.spyOn(Container.get(ExecutionPersistence), 'findSingleExecution');

	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);

	expect(findSingleExecution).not.toHaveBeenCalled();
});

it('should stop inside a range when the signal aborts, and continue from there', async () => {
	const fileIds = [await storeUnassignedFile(), await storeUnassignedFile()];
	const executions = [
		await createExecutionReferringTo(fileIds[0]),
		await createExecutionReferringTo(fileIds[1]),
	];
	const controller = new AbortController();
	const databaseManager = Container.get(DatabaseManager);
	const assignToExecution = databaseManager.assignToExecution.bind(databaseManager);
	vi.spyOn(databaseManager, 'assignToExecution').mockImplementationOnce(async (...args) => {
		await assignToExecution(...args);
		controller.abort();
	});

	await backfillService.backfill(controller.signal, ONE_MINUTE_MS);
	expect(await Promise.all(fileIds.map(findSourceId))).toEqual([executions[0].id, 'temp']);

	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);
	expect(await findSourceId(fileIds[1])).toBe(executions[1].id);
});

it('should continue in a later call when the first call has no time', async () => {
	const fileId = await storeUnassignedFile();
	const execution = await createExecutionReferringTo(fileId);

	await backfillService.backfill(neverAborted(), 0);
	expect(await findSourceId(fileId)).toBe('temp');

	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);
	expect(await findSourceId(fileId)).toBe(execution.id);
});

it('should stop when the signal aborts', async () => {
	const fileId = await storeUnassignedFile();
	await createExecutionReferringTo(fileId);

	await backfillService.backfill(AbortSignal.abort(), ONE_MINUTE_MS);

	expect(await findSourceId(fileId)).toBe('temp');
});

it('should not cover an execution created after the first call', async () => {
	await createExecutionReferringTo(await storeUnassignedFile());
	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);

	const laterFileId = await storeUnassignedFile();
	await createExecutionReferringTo(laterFileId);
	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);

	expect(await findSourceId(laterFileId)).toBe('temp');
});

it('should give the same result when two calls run in parallel', async () => {
	const fileIds = await Promise.all([storeUnassignedFile(), storeUnassignedFile()]);
	const executions = [
		await createExecutionReferringTo(fileIds[0]),
		await createExecutionReferringTo(fileIds[1]),
	];

	await Promise.all([
		backfillService.backfill(neverAborted(), ONE_MINUTE_MS),
		backfillService.backfill(neverAborted(), ONE_MINUTE_MS),
	]);

	expect(await Promise.all(fileIds.map(findSourceId))).toEqual(executions.map(({ id }) => id));
});

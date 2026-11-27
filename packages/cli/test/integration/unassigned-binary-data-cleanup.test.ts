import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { BinaryDataRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IWorkflowBase } from 'n8n-workflow';

import { DatabaseManager } from '@/binary-data/database.manager';
import { UnassignedBinaryDataBackfillService } from '@/binary-data/unassigned-binary-data-backfill.service';
import { UnassignedBinaryDataCleanupService } from '@/binary-data/unassigned-binary-data-cleanup.service';

const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
const TWO_DAYS_MS = 48 * ONE_HOUR_MS;

let workflow: IWorkflowBase;
let backfillService: UnassignedBinaryDataBackfillService;
let cleanupService: UnassignedBinaryDataCleanupService;

const neverAborted = () => new AbortController().signal;

const storeFile = async (executionId: string, ageMs: number) => {
	const { fileId } = await Container.get(DatabaseManager).store(
		{ type: 'execution', workflowId: workflow.id, executionId },
		Buffer.from('content'),
		{},
	);
	await Container.get(BinaryDataRepository).update(
		{ fileId },
		{ createdAt: new Date(Date.now() - ageMs) },
	);
	return fileId;
};

const storeUnassignedFile = async (ageMs: number) => await storeFile('', ageMs);

const storeManyUnassignedFiles = async (count: number, ageMs: number) =>
	await Promise.all(Array.from({ length: count }, async () => await storeUnassignedFile(ageMs)));

const startBackfill = async () => await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);

const completeBackfill = async () => {
	await startBackfill();
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(Date.now() + ONE_HOUR_MS);
	await backfillService.backfill(neverAborted(), ONE_MINUTE_MS);
	vi.useRealTimers();
};

const fileExists = async (fileId: string) =>
	await Container.get(BinaryDataRepository).existsBy({ fileId });

const countFiles = async () => await Container.get(BinaryDataRepository).count();

beforeAll(async () => {
	await testDb.init();
	backfillService = Container.get(UnassignedBinaryDataBackfillService);
	cleanupService = Container.get(UnassignedBinaryDataCleanupService);
});

beforeEach(async () => {
	await testDb.truncate(['BinaryDataFile', 'ExecutionEntity', 'WorkflowEntity', 'Settings']);
	workflow = await createWorkflow();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

afterAll(async () => {
	await testDb.terminate();
});

it('should delete a file that stayed unassigned for more than one day', async () => {
	await completeBackfill();
	const fileId = await storeUnassignedFile(TWO_DAYS_MS);

	const deleted = await cleanupService.deleteStaleFiles(neverAborted());

	expect(deleted).toBe(1);
	expect(await fileExists(fileId)).toBe(false);
});

it('should keep a file that is unassigned for less than one day', async () => {
	await completeBackfill();
	const fileId = await storeUnassignedFile(ONE_HOUR_MS);

	const deleted = await cleanupService.deleteStaleFiles(neverAborted());

	expect(deleted).toBe(0);
	expect(await fileExists(fileId)).toBe(true);
});

it('should keep a file that is assigned to an execution', async () => {
	await completeBackfill();
	const fileId = await storeFile('123', TWO_DAYS_MS);

	await cleanupService.deleteStaleFiles(neverAborted());

	expect(await fileExists(fileId)).toBe(true);
});

it('should delete nothing before the backfill starts', async () => {
	const fileId = await storeUnassignedFile(TWO_DAYS_MS);

	const deleted = await cleanupService.deleteStaleFiles(neverAborted());

	expect(deleted).toBe(0);
	expect(await fileExists(fileId)).toBe(true);
});

it('should delete nothing while the backfill is not complete', async () => {
	const fileId = await storeUnassignedFile(TWO_DAYS_MS);
	await startBackfill();

	const deleted = await cleanupService.deleteStaleFiles(neverAborted());

	expect(deleted).toBe(0);
	expect(await fileExists(fileId)).toBe(true);
});

it('should delete more files than one batch holds', async () => {
	await completeBackfill();
	await storeManyUnassignedFiles(101, TWO_DAYS_MS);

	const deleted = await cleanupService.deleteStaleFiles(neverAborted());

	expect(deleted).toBe(101);
	expect(await countFiles()).toBe(0);
});

it('should stop after the current batch when the signal aborts', async () => {
	await completeBackfill();
	await storeManyUnassignedFiles(101, TWO_DAYS_MS);

	const deleted = await cleanupService.deleteStaleFiles(AbortSignal.abort());

	expect(deleted).toBe(100);
	expect(await countFiles()).toBe(1);
});

it('should give the same result when two calls run in parallel', async () => {
	await completeBackfill();
	await storeManyUnassignedFiles(150, TWO_DAYS_MS);
	const recentFileId = await storeUnassignedFile(ONE_HOUR_MS);

	await Promise.all([
		cleanupService.deleteStaleFiles(neverAborted()),
		cleanupService.deleteStaleFiles(neverAborted()),
	]);

	expect(await countFiles()).toBe(1);
	expect(await fileExists(recentFileId)).toBe(true);
});

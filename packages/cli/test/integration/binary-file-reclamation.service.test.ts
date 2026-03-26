jest.unmock('node:fs');
jest.unmock('node:fs/promises');

import { mockLogger, createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
import { BinaryFileReclamationConfig } from '@n8n/config';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings, StorageConfig } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { EventService } from '@/events/event.service';
import { BinaryFileReclamationService } from '@/services/pruning/binary-file-reclamation.service';

import { createExecution } from './shared/db/executions';

describe('BinaryFileReclamationService', () => {
	let service: BinaryFileReclamationService;
	let config: BinaryFileReclamationConfig;
	let eventService: EventService;
	let workflow: IWorkflowBase;
	let tmpDir: string;
	let storagePath: string;

	async function createBinaryDataOnDisk(
		executionId: string,
		workflowId: string,
		sizeBytes: number = 1024,
	): Promise<string> {
		const binaryPath = path.join(storagePath, 'workflows', workflowId, 'executions', executionId);
		await fs.mkdir(binaryPath, { recursive: true });
		await fs.writeFile(path.join(binaryPath, 'binary_data'), Buffer.alloc(sizeBytes));
		return binaryPath;
	}

	async function pathExists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	async function findAllExecutions() {
		return await Container.get(ExecutionRepository).find({
			order: { id: 'asc' },
			withDeleted: true,
		});
	}

	beforeAll(async () => {
		await testDb.init();

		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'n8n-reclamation-test-'));
		storagePath = path.join(tmpDir, 'storage');

		const instanceSettings = Container.get(InstanceSettings);
		instanceSettings.markAsLeader();

		Object.defineProperty(instanceSettings, 'n8nFolder', { value: tmpDir });
		Object.defineProperty(instanceSettings, 'instanceType', { value: 'main' });

		const storageConfig = Container.get(StorageConfig);
		Object.defineProperty(storageConfig, 'storagePath', { value: storagePath });

		config = Container.get(BinaryFileReclamationConfig);
		config.enabled = true;
		config.maxStorageBytes = 5_000; // 5KB threshold — tests create 1KB files
		config.targetRatio = 0.6; // target: 3KB
		config.batchSize = 100;

		eventService = mockInstance(EventService);

		service = new BinaryFileReclamationService(
			mockLogger(),
			instanceSettings,
			Container.get(ExecutionRepository),
			config,
			storageConfig,
			eventService,
		);

		workflow = await createWorkflow();
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionEntity']);
		(service as unknown as Record<string, unknown>)['lastReclaimedAt'] = null;
		jest.clearAllMocks();

		// Clean up storage between tests
		await fs.rm(storagePath, { recursive: true, force: true });
	});

	afterAll(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
		await testDb.terminate();
	});

	test('should delete binary data on disk but keep execution records in DB', async () => {
		const now = new Date();
		const exec1 = await createExecution(
			{ status: 'success', finished: true, startedAt: now, stoppedAt: now },
			workflow,
		);
		const exec2 = await createExecution(
			{ status: 'success', finished: true, startedAt: now, stoppedAt: now },
			workflow,
		);

		// Create 3KB each = 6KB total, exceeds 5KB threshold
		const path1 = await createBinaryDataOnDisk(exec1.id, workflow.id, 3072);
		const path2 = await createBinaryDataOnDisk(exec2.id, workflow.id, 3072);

		await (service as unknown as { checkAndReclaim: () => Promise<void> }).checkAndReclaim();

		expect(await pathExists(path1)).toBe(false);
		expect(await pathExists(path2)).toBe(false);

		const executions = await findAllExecutions();
		expect(executions).toHaveLength(2);
		expect(executions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: exec1.id }),
				expect.objectContaining({ id: exec2.id }),
			]),
		);

		expect(eventService.emit).toHaveBeenCalledWith(
			'binary-files-reclaimed',
			expect.objectContaining({
				totalExecutionsProcessed: 2,
			}),
		);
	});

	test('should process oldest executions first', async () => {
		const oldDate = new Date('2020-01-01');
		const midDate = new Date('2022-01-01');
		const newDate = new Date('2024-01-01');

		const execOld = await createExecution(
			{ status: 'success', finished: true, startedAt: oldDate, stoppedAt: oldDate },
			workflow,
		);
		const execMid = await createExecution(
			{ status: 'success', finished: true, startedAt: midDate, stoppedAt: midDate },
			workflow,
		);
		const execNew = await createExecution(
			{ status: 'success', finished: true, startedAt: newDate, stoppedAt: newDate },
			workflow,
		);

		// 2KB each = 6KB total, exceeds 5KB threshold
		// With batchSize=2, first batch processes oldest two (execOld, execMid)
		// After deleting those: 2KB remaining < 3KB target — stops before execNew
		await createBinaryDataOnDisk(execOld.id, workflow.id, 2048);
		await createBinaryDataOnDisk(execMid.id, workflow.id, 2048);
		await createBinaryDataOnDisk(execNew.id, workflow.id, 2048);

		config.batchSize = 2;

		await (service as unknown as { checkAndReclaim: () => Promise<void> }).checkAndReclaim();

		// Oldest two should be deleted
		expect(
			await pathExists(path.join(storagePath, 'workflows', workflow.id, 'executions', execOld.id)),
		).toBe(false);
		expect(
			await pathExists(path.join(storagePath, 'workflows', workflow.id, 'executions', execMid.id)),
		).toBe(false);
		// Newest should be preserved (already below target)
		expect(
			await pathExists(path.join(storagePath, 'workflows', workflow.id, 'executions', execNew.id)),
		).toBe(true);

		config.batchSize = 100;
	});

	test('should stop after reaching target size', async () => {
		const date1 = new Date('2020-01-01');
		const date2 = new Date('2021-01-01');
		const date3 = new Date('2022-01-01');

		const exec1 = await createExecution(
			{ status: 'success', finished: true, startedAt: date1, stoppedAt: date1 },
			workflow,
		);
		const exec2 = await createExecution(
			{ status: 'success', finished: true, startedAt: date2, stoppedAt: date2 },
			workflow,
		);
		const exec3 = await createExecution(
			{ status: 'success', finished: true, startedAt: date3, stoppedAt: date3 },
			workflow,
		);

		// 2KB each = 6KB total, exceeds 5KB threshold
		// After deleting first batch (2 execs), 2KB left < 3KB target — should stop
		await createBinaryDataOnDisk(exec1.id, workflow.id, 2048);
		await createBinaryDataOnDisk(exec2.id, workflow.id, 2048);
		const path3 = await createBinaryDataOnDisk(exec3.id, workflow.id, 2048);

		config.batchSize = 2;

		await (service as unknown as { checkAndReclaim: () => Promise<void> }).checkAndReclaim();

		// Third execution's binary data should still exist
		expect(await pathExists(path3)).toBe(true);

		expect(eventService.emit).toHaveBeenCalledWith(
			'binary-files-reclaimed',
			expect.objectContaining({
				totalExecutionsProcessed: 2,
			}),
		);

		config.batchSize = 100;
	});

	test('should handle executions without binary data on disk gracefully', async () => {
		const date1 = new Date('2020-01-01');
		const date2 = new Date('2021-01-01');
		const date3 = new Date('2022-01-01');

		await createExecution(
			{ status: 'success', finished: true, startedAt: date1, stoppedAt: date1 },
			workflow,
		);
		await createExecution(
			{ status: 'success', finished: true, startedAt: date2, stoppedAt: date2 },
			workflow,
		);
		const exec3 = await createExecution(
			{ status: 'success', finished: true, startedAt: date3, stoppedAt: date3 },
			workflow,
		);

		// Only create binary data for exec3, making total > threshold
		await createBinaryDataOnDisk(exec3.id, workflow.id, 6144);

		await (service as unknown as { checkAndReclaim: () => Promise<void> }).checkAndReclaim();

		const executions = await findAllExecutions();
		expect(executions).toHaveLength(3);
	});

	test('should process multiple batches until target is reached', async () => {
		config.batchSize = 2;
		const executions = [];
		const paths = [];

		for (let i = 0; i < 5; i++) {
			const date = new Date(2020 + i, 0, 1);
			const exec = await createExecution(
				{ status: 'success', finished: true, startedAt: date, stoppedAt: date },
				workflow,
			);
			executions.push(exec);
			// 2KB each = 10KB total, well above 5KB threshold
			paths.push(await createBinaryDataOnDisk(exec.id, workflow.id, 2048));
		}

		await (service as unknown as { checkAndReclaim: () => Promise<void> }).checkAndReclaim();

		// Should have deleted enough to get below target (3KB)
		// That means at least 4 executions' binary data deleted (leaving 2KB < 3KB)
		const deletedCount = (await Promise.all(paths.map(async (p) => !(await pathExists(p))))).filter(
			Boolean,
		).length;
		expect(deletedCount).toBeGreaterThanOrEqual(4);

		const dbExecutions = await findAllExecutions();
		expect(dbExecutions).toHaveLength(5);

		config.batchSize = 100;
	});

	test('should leave execution records fully intact after reclamation', async () => {
		const now = new Date();
		const exec = await createExecution(
			{
				status: 'success',
				finished: true,
				startedAt: now,
				stoppedAt: now,
				mode: 'webhook',
			},
			workflow,
		);

		await createBinaryDataOnDisk(exec.id, workflow.id, 6144);

		await (service as unknown as { checkAndReclaim: () => Promise<void> }).checkAndReclaim();

		const [result] = await findAllExecutions();
		expect(result).toBeDefined();
		expect(result.id).toBe(exec.id);
		expect(result.status).toBe('success');
		expect(result.finished).toBe(true);
		expect(result.mode).toBe('webhook');
		expect(result.workflowId).toBe(workflow.id);
		expect(result.deletedAt).toBeNull();
	});

	test('should not start reclamation when below threshold', async () => {
		const now = new Date();
		const exec = await createExecution(
			{ status: 'success', finished: true, startedAt: now, stoppedAt: now },
			workflow,
		);
		// 1KB < 5KB threshold — should not reclaim
		const binaryPath = await createBinaryDataOnDisk(exec.id, workflow.id, 1024);

		await (service as unknown as { checkAndReclaim: () => Promise<void> }).checkAndReclaim();

		expect(await pathExists(binaryPath)).toBe(true);
		expect(eventService.emit).not.toHaveBeenCalled();
	});

	test('should terminate when executions are exhausted even if above target', async () => {
		const now = new Date();
		const exec = await createExecution(
			{ status: 'success', finished: true, startedAt: now, stoppedAt: now },
			workflow,
		);

		await createBinaryDataOnDisk(exec.id, workflow.id, 6144);

		await (service as unknown as { checkAndReclaim: () => Promise<void> }).checkAndReclaim();

		expect(eventService.emit).toHaveBeenCalledWith(
			'binary-files-reclaimed',
			expect.objectContaining({
				totalExecutionsProcessed: 1,
			}),
		);
	});

	test('should not reclaim when storage directory is empty', async () => {
		await fs.mkdir(storagePath, { recursive: true });

		await (service as unknown as { checkAndReclaim: () => Promise<void> }).checkAndReclaim();

		expect(eventService.emit).not.toHaveBeenCalled();
	});

	test('should not reclaim when storage directory does not exist', async () => {
		await (service as unknown as { checkAndReclaim: () => Promise<void> }).checkAndReclaim();

		expect(eventService.emit).not.toHaveBeenCalled();
	});
});

import type { Logger } from '@n8n/backend-common';
import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	DbConnectionOptions,
	TransactionRunner,
	WorkflowPublicationOutboxRepository,
} from '@n8n/db';
import type { WorkflowPublicationOutboxStatus } from '@n8n/db';
import { Container } from '@n8n/di';
import type { QueryRunner } from '@n8n/typeorm';
import { DataSource, Like } from '@n8n/typeorm';
import { sleep } from '@n8n/utils/sleep';
import type { Span, Tracing } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import { WorkflowPublicationOutboxCleanupService } from '@/workflows/publication/workflow-publication-outbox-cleanup.service';
import { WorkflowPublicationOutboxCleanupTask } from '@/workflows/publication/workflow-publication-outbox-cleanup.task';

const BATCH_SIZE = 100;
const COMPLETED_RETENTION_SECONDS = Time.hours.toSeconds;
const FAILED_RETENTION_SECONDS = 7 * Time.days.toSeconds;

const OLD_COMPLETED = 3000;
const FRESH_COMPLETED = 200;
const OLD_FAILED = 100;
const OLD_PARTIAL = 100;
const OLD_PENDING = 1;
const OLD_IN_PROGRESS = 1;

const isPostgres = process.env.DB_TYPE === 'postgresdb';

describe('WorkflowPublicationOutboxCleanupTask', () => {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const tracing = mock<Tracing>();
	const eventService = mock<EventService>();
	const signal = new AbortController().signal;
	let repository: WorkflowPublicationOutboxRepository;
	let config: WorkflowsConfig;
	let task: WorkflowPublicationOutboxCleanupTask;
	let oldStamp: Date;

	beforeAll(async () => {
		await testDb.init();
		repository = Container.get(WorkflowPublicationOutboxRepository);
		config = Container.get(WorkflowsConfig);
		config.publicationOutboxCleanupBatchSize = BATCH_SIZE;
		tracing.startSpan.mockImplementation(async (_options, spanCb) => await spanCb(mock<Span>()));
		task = new WorkflowPublicationOutboxCleanupTask(
			config,
			new WorkflowPublicationOutboxCleanupService(
				logger,
				config,
				repository,
				tracing,
				eventService,
			),
		);
		oldStamp = new Date(Date.now() - 2 * COMPLETED_RETENTION_SECONDS * Time.seconds.toMilliseconds);
	});

	beforeEach(async () => {
		eventService.emit.mockClear();
		await testDb.truncate(['WorkflowPublicationOutbox']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function insertRows(
		prefix: string,
		count: number,
		status: WorkflowPublicationOutboxStatus,
		updatedAt: Date,
	): Promise<void> {
		const rows = Array.from({ length: count }, (_, i) => ({
			workflowId: `${prefix}-${i}`,
			publishedVersionId: 'v-1',
			status,
			reason: 'publish' as const,
			errorMessage: null,
			createdAt: updatedAt,
			updatedAt,
		}));
		for (let start = 0; start < rows.length; start += 500) {
			await repository.insert(rows.slice(start, start + 500));
		}
	}

	async function countRows(prefix: string): Promise<number> {
		return await repository.countBy({ workflowId: Like(`${prefix}-%`) });
	}

	function deletedTotal(): number {
		return eventService.emit.mock.calls
			.filter(([name]) => name === 'workflow-publication-outbox-cleanup')
			.reduce((sum, [, payload]) => sum + (payload as { deletedCount: number }).deletedCount, 0);
	}

	it('should delete each expired completed row once across overlapping runs', async () => {
		await insertRows('old-completed', OLD_COMPLETED, 'completed', oldStamp);
		await insertRows('fresh-completed', FRESH_COMPLETED, 'completed', new Date());
		await insertRows('old-failed', OLD_FAILED, 'failed', oldStamp);
		await insertRows('old-partial', OLD_PARTIAL, 'partial_success', oldStamp);
		await insertRows('old-pending', OLD_PENDING, 'pending', oldStamp);
		await insertRows('old-in-progress', OLD_IN_PROGRESS, 'in_progress', oldStamp);

		// A run that loses a batch to another run ends early, so one more run settles the table.
		await Promise.all(Array.from({ length: 4 }, async () => await task.run(signal)));
		await task.run(signal);

		expect(await countRows('old-completed')).toBe(0);
		expect(await countRows('fresh-completed')).toBe(FRESH_COMPLETED);
		expect(await countRows('old-failed')).toBe(OLD_FAILED);
		expect(await countRows('old-partial')).toBe(OLD_PARTIAL);
		expect(await countRows('old-pending')).toBe(OLD_PENDING);
		expect(await countRows('old-in-progress')).toBe(OLD_IN_PROGRESS);
		expect(deletedTotal()).toBe(OLD_COMPLETED);
	});

	// A second connection holds one batch open in a transaction, so this connection
	// has to wait on the row locks like a main whose lease was reclaimed mid-pass.
	describe.skipIf(!isPostgres)('across two connections', () => {
		const ROWS = 150;
		let otherConnection: DataSource;
		let otherRunner: QueryRunner;
		let otherRepository: WorkflowPublicationOutboxRepository;

		beforeAll(async () => {
			otherConnection = new DataSource(Container.get(DbConnectionOptions).getOptions());
			await otherConnection.initialize();
		});

		beforeEach(async () => {
			otherRunner = otherConnection.createQueryRunner();
			await otherRunner.startTransaction();
			otherRepository = new WorkflowPublicationOutboxRepository(
				{ manager: otherRunner.manager } as DataSource,
				Container.get(GlobalConfig),
				Container.get(TransactionRunner),
			);
		});

		afterEach(async () => {
			if (otherRunner.isTransactionActive) await otherRunner.rollbackTransaction();
			await otherRunner.release();
		});

		afterAll(async () => {
			await otherConnection.destroy();
		});

		async function isPending(promise: Promise<unknown>): Promise<boolean> {
			return await Promise.race([promise.then(() => false), sleep(250).then(() => true)]);
		}

		it('should wait behind an uncommitted batch and count no row twice', async () => {
			await insertRows('old-completed', ROWS, 'completed', oldStamp);
			const heldByOther = await otherRepository.deleteTerminalOlderThan(
				COMPLETED_RETENTION_SECONDS,
				FAILED_RETENTION_SECONDS,
				BATCH_SIZE,
			);
			expect(heldByOther).toBe(BATCH_SIZE);

			const run = task.run(signal);
			expect(await isPending(run)).toBe(true);
			await otherRunner.commitTransaction();
			await run;

			const remaining = await countRows('old-completed');
			expect(heldByOther + deletedTotal()).toBe(ROWS - remaining);

			await task.run(signal);

			expect(await countRows('old-completed')).toBe(0);
			expect(heldByOther + deletedTotal()).toBe(ROWS);
		});
	});
});

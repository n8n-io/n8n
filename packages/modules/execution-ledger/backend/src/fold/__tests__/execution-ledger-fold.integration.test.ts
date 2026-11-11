import { mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	DbLockService,
	FoldStepRegistry,
	FoldTransactionLostError,
	TransactionRunner,
	type ExecutionLedgerFoldStep,
	type ExecutionLedgerRow,
	type OperationContext,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import type { ErrorReporter } from 'n8n-core';

import { ExecutionLedgerRepository } from '../../database/repositories/execution-ledger.repository';
import { ledgerRow } from '../../__tests__/ledger-rows';
import { ExecutionLedgerFoldService } from '../execution-ledger-fold.service';
import { FoldStepFailedError } from '../fold-step-failed.error';

describe('ExecutionLedgerFoldService', () => {
	let repository: ExecutionLedgerRepository;
	let txRunner: TransactionRunner;
	let registry: FoldStepRegistry;
	let service: ExecutionLedgerFoldService;

	/** A step that records what it saw by appending marker rows in the fold transaction. */
	const markerStep = (
		name: string,
		fold: (rows: readonly ExecutionLedgerRow[], ctx: OperationContext) => Promise<void> = async (
			rows,
			ctx,
		) => {
			await repository.append(ledgerRow({ executionId: `${name}:${rows.length}` }), ctx);
		},
	): ExecutionLedgerFoldStep => ({
		name,
		fold: async (rows, ctx) => {
			await fold(rows, ctx);
			return undefined;
		},
	});

	const appendRows = async (...executionIds: string[]) => {
		for (const executionId of executionIds) {
			await txRunner.run({}, async (ctx) => {
				await repository.append(ledgerRow({ executionId }), ctx);
			});
		}
	};

	const ledgerExecutionIds = async () =>
		await txRunner.run({}, async (ctx) =>
			(await repository.claimBatch(100, ctx)).map((r) => r.executionId),
		);

	beforeAll(async () => {
		await testModules.loadModules(['execution-ledger'], {
			'execution-ledger': async () => await import('../../execution-ledger.module.js'),
		});
		await testDb.init();
		repository = Container.get(ExecutionLedgerRepository);
		txRunner = Container.get(TransactionRunner);
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionLedgerEntity']);
		registry = new FoldStepRegistry();
		service = new ExecutionLedgerFoldService(
			mockLogger(),
			mock<ErrorReporter>(),
			Container.get(DbLockService),
			repository,
			registry,
		);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('removes the folded rows from the ledger and keeps the step writes', async () => {
		registry.register(markerStep('first'));
		registry.register(markerStep('second'));
		await appendRows('run-1', 'run-2');

		expect(await service.foldBatch()).toBe(2);

		expect(await ledgerExecutionIds()).toEqual(['first:2', 'second:2']);
	});

	it('leaves the rows in the ledger when no step is registered', async () => {
		await appendRows('run-1');

		expect(await service.foldBatch()).toBe(0);

		expect(await ledgerExecutionIds()).toEqual(['run-1']);
	});

	it('rolls the whole batch back into the ledger when a step fails', async () => {
		registry.register(markerStep('first'));
		registry.register(
			markerStep('failing', async () => {
				throw new Error('upsert failed');
			}),
		);
		await appendRows('run-1', 'run-2');

		const error = await service.foldBatch().catch((e: unknown) => e);

		expect(error).toBeInstanceOf(FoldStepFailedError);
		expect(error).toMatchObject({ step: 'failing', attempt: 1 });
		expect(await ledgerExecutionIds()).toEqual(['run-1', 'run-2']);
	});

	it('runs the after-commit work once the fold committed', async () => {
		let ledgerAtWorkTime: string[] | undefined;
		registry.register({
			name: 'with_work',
			fold: async () => async () => {
				ledgerAtWorkTime = await ledgerExecutionIds();
			},
		});
		await appendRows('run-1');

		await service.foldBatch();

		expect(ledgerAtWorkTime).toEqual([]);
	});

	it('throws FoldTransactionLostError when the database ends the transaction', async () => {
		registry.register(
			markerStep('lost', async (_rows, ctx) => {
				// Ends the transaction, as SQLite does by itself on a full disk.
				const manager: EntityManager = repository['table'].managerFor(ctx);
				await manager.query('ROLLBACK');
				throw new Error('database or disk is full');
			}),
		);
		await appendRows('run-1');

		const error = await service.foldBatch().catch((e: unknown) => e);

		expect(error).toBeInstanceOf(FoldTransactionLostError);
		expect(await ledgerExecutionIds()).toEqual(['run-1']);
	});

	describe('when two folds overlap', () => {
		// Each fold holds a connection, so Postgres needs a pool of two.
		const poolTooSmall = () => {
			const { type, postgresdb } = Container.get(GlobalConfig).database;
			return type === 'postgresdb' && postgresdb.poolSize < 2;
		};

		it('skips the second fold while the first holds the lock', async (context) => {
			if (poolTooSmall()) context.skip();

			const firstInStep = createDeferredPromise();
			const releaseFirst = createDeferredPromise();
			registry.register(
				markerStep('slow', async () => {
					firstInStep.resolve();
					await releaseFirst.promise;
				}),
			);
			await appendRows('run-1');

			const first = service.foldBatch();
			await firstInStep.promise;

			expect(await service.foldBatch()).toBe(0);

			releaseFirst.resolve();
			expect(await first).toBe(1);
		});
	});
});

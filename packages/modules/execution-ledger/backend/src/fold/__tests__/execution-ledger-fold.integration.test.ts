import type { EventService } from '@n8n/backend-services';
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
import { DataSource, type EntityManager } from '@n8n/typeorm';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import type { ErrorReporter } from 'n8n-core';

import { LedgerCheckBypass, unknownOutcomeRow } from '../../__tests__/ledger-check-bypass';
import { ledgerRow } from '../../__tests__/ledger-rows';
import { ExecutionLedgerParkedEntity } from '../../database/entities/execution-ledger-parked.entity';
import { ExecutionLedgerEntity } from '../../database/entities/execution-ledger.entity';
import { ExecutionLedgerParkedRepository } from '../../database/repositories/execution-ledger-parked.repository';
import { ExecutionLedgerRepository } from '../../database/repositories/execution-ledger.repository';
import { ExecutionLedgerFoldService } from '../execution-ledger-fold.service';

describe('ExecutionLedgerFoldService', () => {
	let repository: ExecutionLedgerRepository;
	let txRunner: TransactionRunner;
	let registry: FoldStepRegistry;
	let service: ExecutionLedgerFoldService;
	let bypass: LedgerCheckBypass;

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
			(await repository.claimBatch(100, ctx)).rows.map((r) => r.executionId),
		);

	const parkedRows = async () =>
		await Container.get(DataSource)
			.getRepository(ExecutionLedgerParkedEntity)
			.find({ order: { step: 'ASC', ledgerId: 'ASC' } });

	const ledgerRowsInOrder = async () =>
		await Container.get(DataSource)
			.getRepository(ExecutionLedgerEntity)
			.find({ order: { id: 'ASC' } });

	const failingStep = (name: string, message = `${name} failed`) =>
		markerStep(name, async () => {
			throw new Error(message);
		});

	beforeAll(async () => {
		await testModules.loadModules(['execution-ledger'], {
			'execution-ledger': async () => await import('../../execution-ledger.module.js'),
		});
		await testDb.init();
		repository = Container.get(ExecutionLedgerRepository);
		txRunner = Container.get(TransactionRunner);
		bypass = new LedgerCheckBypass();
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionLedgerEntity', 'ExecutionLedgerParkedEntity']);
		registry = new FoldStepRegistry();
		service = new ExecutionLedgerFoldService(
			mockLogger(),
			mock<ErrorReporter>(),
			Container.get(DbLockService),
			repository,
			registry,
			mock<EventService>(),
			Container.get(ExecutionLedgerParkedRepository),
		);
	});

	afterEach(async () => {
		await bypass.restore();
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

	it('commits a batch that holds a row with no project', async () => {
		let seenProjectIds: Array<string | null> = [];
		registry.register(
			markerStep('reader', async (rows) => {
				seenProjectIds = rows.map((r) => r.projectId);
			}),
		);
		await repository.append(ledgerRow({ projectId: null }), {});
		await repository.append(ledgerRow(), {});

		expect(await service.foldBatch()).toBe(2);

		expect(seenProjectIds).toEqual([null, 'project-1']);
		expect(await ledgerExecutionIds()).toEqual([]);
	});

	it('leaves the rows in the ledger when no step is registered', async () => {
		await appendRows('run-1');

		expect(await service.foldBatch()).toBe(0);

		expect(await ledgerExecutionIds()).toEqual(['run-1']);
	});

	it('commits the batch and parks it for a step that fails, keeping the other step writes', async () => {
		registry.register(markerStep('first'));
		registry.register(failingStep('failing', 'upsert failed'));
		await appendRows('run-1', 'run-2');

		await expect(service.foldBatch()).resolves.toBe(2);

		expect(await ledgerExecutionIds()).toEqual(['first:2']);
		expect(await parkedRows()).toHaveLength(2);
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

	describe('when a step fails twice', () => {
		it('parks the batch on the first foldBatch call and removes the rows from the ledger', async () => {
			registry.register(failingStep('failing'));
			await appendRows('run-1', 'run-2');

			await expect(service.foldBatch()).resolves.toBe(2);

			expect(await ledgerRowsInOrder()).toEqual([]);
			expect((await parkedRows()).map((r) => r.executionId)).toEqual(['run-1', 'run-2']);
		});

		it('keeps the work of a step that throws on its first call only and parks nothing', async () => {
			let calls = 0;
			registry.register(
				markerStep('flaky', async (rows, ctx) => {
					calls++;
					if (calls === 1) {
						await repository.append(ledgerRow({ executionId: 'discarded' }), ctx);
						throw new Error('deadlock detected');
					}
					await repository.append(ledgerRow({ executionId: `flaky:${rows.length}` }), ctx);
				}),
			);
			await appendRows('run-1', 'run-2');

			await expect(service.foldBatch()).resolves.toBe(2);

			expect(calls).toBe(2);
			expect(await ledgerExecutionIds()).toEqual(['flaky:2']);
			expect(await parkedRows()).toEqual([]);
		});

		it('parks the batch for the failing step and saves the other steps', async () => {
			registry.register(markerStep('before'));
			registry.register(failingStep('failing', 'upsert failed'));
			registry.register(markerStep('after'));
			await appendRows('run-1', 'run-2');
			const original = await ledgerRowsInOrder();

			expect(await service.foldBatch()).toBe(2);

			expect(await ledgerExecutionIds()).toEqual(['before:2', 'after:2']);
			const saved = await parkedRows();
			expect(saved).toHaveLength(2);
			saved.forEach((parkedRow, i) => {
				expect(parkedRow).toMatchObject({
					step: 'failing',
					ledgerId: original[i].id,
					error: 'upsert failed',
					executionId: original[i].executionId,
					entityType: original[i].entityType,
					entityName: original[i].entityName,
					entityId: original[i].entityId,
					projectId: original[i].projectId,
					mode: original[i].mode,
					source: original[i].source,
					event: original[i].event,
					outcome: original[i].outcome,
					blockedBy: original[i].blockedBy,
					runtimeMs: original[i].runtimeMs,
					timeSavedMin: original[i].timeSavedMin,
					origin: original[i].origin,
					eventId: original[i].eventId,
				});
				expect(parkedRow.occurredAt.getTime()).toBe(original[i].occurredAt.getTime());
			});
		});

		it('parks a row with no project for the failing step', async () => {
			registry.register(failingStep('failing'));
			await repository.append(ledgerRow({ projectId: null }), {});

			expect(await service.foldBatch()).toBe(1);

			expect(await parkedRows()).toMatchObject([{ step: 'failing', projectId: null }]);
		});

		it('parks each row once for each of two failing steps in one run', async () => {
			registry.register(failingStep('first'));
			registry.register(failingStep('second'));
			await appendRows('run-1', 'run-2');
			expect(await service.foldBatch()).toBe(2);

			expect(await ledgerExecutionIds()).toEqual([]);
			const saved = await parkedRows();
			expect(saved.map((r) => [r.step, r.executionId])).toEqual([
				['first', 'run-1'],
				['first', 'run-2'],
				['second', 'run-1'],
				['second', 'run-2'],
			]);
		});

		it('parks nothing and keeps the rows when the transaction ends inside the step', async () => {
			registry.register(
				markerStep('lost', async (_rows, ctx) => {
					const manager: EntityManager = repository['table'].managerFor(ctx);
					await manager.query('ROLLBACK');
					throw new Error('database or disk is full');
				}),
			);
			await appendRows('run-1');

			const error = await service.foldBatch().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(FoldTransactionLostError);
			expect(await parkedRows()).toEqual([]);
			expect(await ledgerExecutionIds()).toEqual(['run-1']);
		});
	});

	describe('when a row has an unknown outcome', () => {
		it('parks it once as unreadable and gives the other rows to the steps', async () => {
			registry.register(markerStep('seen'));
			await appendRows('run-1');
			await bypass.insert(unknownOutcomeRow({ executionId: 'run-2' }));
			await appendRows('run-3');

			expect(await service.foldBatch()).toBe(3);

			expect(await ledgerExecutionIds()).toEqual(['seen:2']);
			const saved = await parkedRows();
			expect(saved).toHaveLength(1);
			expect(saved[0]).toMatchObject({
				step: '_unreadable',
				executionId: 'run-2',
				outcome: 'unknown_outcome',
			});
		});

		it('parks it and runs no step when it is the only row', async () => {
			const seen = vi.fn();
			registry.register(markerStep('seen', async () => seen()));
			await bypass.insert(unknownOutcomeRow());

			expect(await service.foldBatch()).toBe(1);

			expect(seen).not.toHaveBeenCalled();
			expect(await parkedRows()).toHaveLength(1);
		});

		it('keeps it in the ledger when the transaction is lost and the batch rolls back', async () => {
			registry.register(
				markerStep('lost', async (_rows, ctx) => {
					const manager: EntityManager = repository['table'].managerFor(ctx);
					await manager.query('ROLLBACK');
					throw new Error('database or disk is full');
				}),
			);
			await appendRows('run-1');
			await bypass.insert(unknownOutcomeRow({ executionId: 'run-2' }));

			await service.foldBatch().catch(() => undefined);

			expect(await parkedRows()).toEqual([]);
			expect((await ledgerRowsInOrder()).map((r) => r.executionId)).toEqual(['run-1', 'run-2']);
		});
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

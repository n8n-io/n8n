import {
	createTeamProject,
	createWorkflow,
	mockLogger,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import {
	EXECUTION_LEDGER_BLOCKED_BY,
	EXECUTION_LEDGER_ENTITY_TYPES,
	EXECUTION_LEDGER_ORIGINS,
	EXECUTION_LEDGER_OUTCOMES,
	ExecutionLedger,
	type ExecutionLedgerEndedFacts,
	type ExecutionLedgerStartedFacts,
	type Project,
	TransactionRunner,
	type WorkflowEntity,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { version as uuidVersion } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { ledgerRow } from './ledger-rows';
import { ExecutionLedgerRepository } from '../database/repositories/execution-ledger.repository';
import { ExecutionLedgerRowWriter } from '../execution-ledger-row.writer';

const ENDED_OUTCOMES = EXECUTION_LEDGER_OUTCOMES.filter((o) => o !== 'none' && o !== 'blocked');
const BLOCKED_REASONS = EXECUTION_LEDGER_BLOCKED_BY.filter((b) => b !== 'none');

describe('ExecutionLedgerRowWriter', () => {
	const logger = mockLogger();
	const errorReporter = mock<ConstructorParameters<typeof ExecutionLedger>[1]>();
	let ledger: ExecutionLedger;
	let repository: ExecutionLedgerRepository;
	let txRunner: TransactionRunner;
	let project: Project;
	let workflow: WorkflowEntity;

	const claimAll = async () =>
		await txRunner.run({}, async (ctx) => await repository.claimBatch(100, ctx));

	const startedFacts = (
		overrides: Partial<ExecutionLedgerStartedFacts> = {},
	): ExecutionLedgerStartedFacts => ({
		executionId: 'exec-1',
		workflowId: workflow.id,
		workflowName: workflow.name,
		mode: 'trigger',
		occurredAt: new Date('2026-10-30T10:00:00.123Z'),
		...overrides,
	});

	const endedFacts = (
		overrides: Partial<ExecutionLedgerEndedFacts> = {},
	): ExecutionLedgerEndedFacts =>
		({
			...startedFacts(),
			outcome: 'success',
			runtimeMs: 1500,
			timeSavedMin: 4,
			...overrides,
		}) as ExecutionLedgerEndedFacts;

	beforeAll(async () => {
		await testModules.loadModules(['execution-ledger'], {
			'execution-ledger': async () => await import('../execution-ledger.module.js'),
		});
		await testDb.init();
		repository = Container.get(ExecutionLedgerRepository);
		txRunner = Container.get(TransactionRunner);
		ledger = new ExecutionLedger(logger, errorReporter);
		ledger.setImplementation(Container.get(ExecutionLedgerRowWriter));

		project = await createTeamProject();
		workflow = await createWorkflow({ name: 'Nightly sync' }, project);
	});

	beforeEach(async () => {
		vi.clearAllMocks();
		await testDb.truncate(['ExecutionLedgerEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('started', () => {
		it('inserts a row in the transaction of the caller', async () => {
			await txRunner.run({}, async (ctx) => await ledger.recordStarted(startedFacts(), ctx));

			const [row] = await claimAll();
			expect(row).toMatchObject({
				executionId: 'exec-1',
				entityType: 'workflow',
				entityName: 'Nightly sync',
				entityId: workflow.id,
				projectId: project.id,
				mode: 'trigger',
				source: 'none',
				event: 'started',
				outcome: 'none',
				blockedBy: 'none',
				origin: 'v1',
			});
			expect(uuidVersion(row.eventId)).toBe(7);
		});

		it('inserts no row when the transaction rolls back', async () => {
			await expect(
				txRunner.run({}, async (ctx) => {
					await ledger.recordStarted(startedFacts(), ctx);
					throw new Error('execution insert failed');
				}),
			).rejects.toThrow('execution insert failed');

			expect(await claimAll()).toEqual([]);
		});

		it('skips a workflow without an owner project and keeps the transaction usable', async () => {
			const unowned = await createWorkflow({ name: 'Unowned' });

			await txRunner.run({}, async (ctx) => {
				await ledger.recordStarted(startedFacts({ workflowId: unowned.id }), ctx);
				await ledger.recordStarted(startedFacts({ executionId: 'exec-2' }), ctx);
			});

			expect((await claimAll()).map((r) => r.executionId)).toEqual(['exec-2']);
			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(errorReporter.error).toHaveBeenCalledTimes(1);
		});

		it.each(['none', 'user', 'instance_ai'] as const)('stores the source %s', async (source) => {
			const facts = startedFacts(source === 'none' ? {} : { source });
			await txRunner.run({}, async (ctx) => await ledger.recordStarted(facts, ctx));

			expect((await claimAll())[0].source).toBe(source);
		});

		it.each(['manual', 'webhook', 'integrated', 'evaluation'] as const)(
			'stores the mode %s',
			async (mode) => {
				await txRunner.run(
					{},
					async (ctx) => await ledger.recordStarted(startedFacts({ mode }), ctx),
				);

				expect((await claimAll())[0].mode).toBe(mode);
			},
		);

		it('stores a long name cut to 128 characters', async () => {
			const workflowName = `${'a'.repeat(127)}😀😀`;
			await txRunner.run(
				{},
				async (ctx) => await ledger.recordStarted(startedFacts({ workflowName }), ctx),
			);

			expect((await claimAll())[0].entityName).toBe(`${'a'.repeat(127)}😀`);
		});
	});

	describe('ended', () => {
		it.each(ENDED_OUTCOMES)('inserts the outcome %s outside a transaction', async (outcome) => {
			await ledger.recordEnded(endedFacts({ outcome }));

			expect(await claimAll()).toEqual([
				expect.objectContaining({
					event: 'ended',
					outcome,
					blockedBy: 'none',
					runtimeMs: 1500,
					timeSavedMin: 4,
					projectId: project.id,
				}),
			]);
		});

		it.each(ENDED_OUTCOMES)('inserts the outcome %s in a transaction', async (outcome) => {
			await txRunner.run(
				{},
				async (ctx) => await ledger.recordEndedInTransaction(endedFacts({ outcome }), ctx),
			);

			expect(await claimAll()).toEqual([expect.objectContaining({ event: 'ended', outcome })]);
		});

		it.each(BLOCKED_REASONS)('inserts a run blocked by %s', async (blockedBy) => {
			await ledger.recordEnded(endedFacts({ outcome: 'blocked', blockedBy }));

			expect(await claimAll()).toEqual([
				expect.objectContaining({ outcome: 'blocked', blockedBy }),
			]);
		});

		it('logs a workflow without an owner project and does not throw', async () => {
			const unowned = await createWorkflow({ name: 'Unowned' });

			await ledger.recordEnded(endedFacts({ workflowId: unowned.id }));

			expect(await claimAll()).toEqual([]);
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining('no owner project'),
				expect.objectContaining({ workflowId: unowned.id }),
			);
		});
	});

	// The writer only writes `workflow` and `v1`. Engine v2 and agents append the other values.
	describe('values the writer does not produce', () => {
		it.each(
			EXECUTION_LEDGER_ENTITY_TYPES.flatMap((t) =>
				EXECUTION_LEDGER_ORIGINS.map((o) => [t, o] as const),
			),
		)('stores the entity type %s from origin %s', async (entityType, origin) => {
			const row = ledgerRow({ entityType, origin });
			await repository.append(row, {});

			expect(await claimAll()).toEqual([{ ...row, id: expect.any(String) }]);
		});
	});
});

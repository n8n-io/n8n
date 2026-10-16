import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { WorkflowExecuteMode } from 'n8n-workflow';

import { ExecutionLedgerFoldService } from '@/execution-ledger/execution-ledger-fold.service';
import '@/execution-quota/execution-quota.participant';

import { ExecutionQuotaExceededError } from '../execution-quota-exceeded.error';
import { ExecutionQuotaService } from '../execution-quota.service';

/** The execution ledger is Postgres only. */
const isPostgres = () => Container.get(GlobalConfig).database.type === 'postgresdb';

describe('ExecutionQuotaService', () => {
	let quotaService: ExecutionQuotaService;
	let foldService: ExecutionLedgerFoldService;
	let project: Project;

	beforeAll(async () => {
		await testDb.init();
		quotaService = Container.get(ExecutionQuotaService);
		foldService = Container.get(ExecutionLedgerFoldService);
	});

	beforeEach(async () => {
		project = await createTeamProject();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const admit = async (workflowId: string, mode: WorkflowExecuteMode = 'webhook') =>
		await quotaService.admit({ workflowId, projectId: project.id, mode });

	const usedToday = async (scopeType: 'workflow' | 'project', scopeId: string) => {
		const { tablePrefix } = Container.get(GlobalConfig).database;
		const rows: Array<{ used: string | null }> = await Container.get(DataSource).query(
			`SELECT SUM("used") AS used FROM "${tablePrefix}execution_quota_usage"
			WHERE "scopeType" = $1 AND "scopeId" = $2`,
			[scopeType, scopeId],
		);
		return Number(rows[0].used ?? 0);
	};

	const drainLedger = async () => {
		while ((await foldService.foldBatch()) > 0) {}
	};

	it('never admits more than the limit under concurrent starts while the fold runs', async (ctx) => {
		if (!isPostgres()) ctx.skip();
		const workflow = await createWorkflow({}, project);
		const limit = 10;
		await quotaService.setLimit({ scopeType: 'workflow', scopeId: workflow.id }, 'day', limit);

		let folding = true;
		const foldLoop = (async () => {
			while (folding) await foldService.foldBatch();
		})();

		const burst = await Promise.allSettled(
			Array.from({ length: 60 }, async () => await admit(workflow.id)),
		);
		folding = false;
		await foldLoop;

		const admitted = burst.filter((r) => r.status === 'fulfilled').length;
		const refusals = burst.filter((r) => r.status === 'rejected');
		expect(admitted).toBeLessThanOrEqual(limit);
		for (const refusal of refusals) {
			expect(refusal.status === 'rejected' && refusal.reason).toBeInstanceOf(
				ExecutionQuotaExceededError,
			);
		}

		// Early refusals leave room, so sequential starts fill the quota exactly.
		let sequential = 0;
		while (true) {
			try {
				await admit(workflow.id);
				sequential++;
			} catch (error) {
				expect(error).toBeInstanceOf(ExecutionQuotaExceededError);
				break;
			}
		}
		expect(admitted + sequential).toBe(limit);

		await drainLedger();
		expect(await usedToday('workflow', workflow.id)).toBe(limit);
	});

	it('shares a project quota across the workflows of the project', async (ctx) => {
		if (!isPostgres()) ctx.skip();
		const first = await createWorkflow({}, project);
		const second = await createWorkflow({}, project);
		await quotaService.setLimit({ scopeType: 'project', scopeId: project.id }, 'month', 3);

		await admit(first.id);
		await admit(second.id);
		await drainLedger();
		await admit(first.id);

		await expect(admit(second.id)).rejects.toThrow(ExecutionQuotaExceededError);
		await drainLedger();
		expect(await usedToday('project', project.id)).toBe(3);
	});

	it('does not count manual executions', async (ctx) => {
		if (!isPostgres()) ctx.skip();
		const workflow = await createWorkflow({}, project);
		await quotaService.setLimit({ scopeType: 'workflow', scopeId: workflow.id }, 'day', 1);

		await admit(workflow.id, 'manual');
		await admit(workflow.id, 'manual');

		await expect(admit(workflow.id)).resolves.toBeDefined();
	});

	it('gives the run back when it is refunded', async (ctx) => {
		if (!isPostgres()) ctx.skip();
		const workflow = await createWorkflow({}, project);
		await quotaService.setLimit({ scopeType: 'workflow', scopeId: workflow.id }, 'day', 1);

		const charge = await admit(workflow.id);
		await charge?.refund();

		await expect(admit(workflow.id)).resolves.toBeDefined();
		await expect(admit(workflow.id)).rejects.toThrow(ExecutionQuotaExceededError);
	});

	it('emits the folded aggregate after commit', async (ctx) => {
		if (!isPostgres()) ctx.skip();
		const workflow = await createWorkflow({}, project);
		await quotaService.setLimit({ scopeType: 'workflow', scopeId: workflow.id }, 'day', 5);
		await drainLedger();
		const folded = vi.fn();
		foldService.on('folded', folded);

		await admit(workflow.id);
		await admit(workflow.id);
		await drainLedger();

		expect(folded).toHaveBeenCalledWith(
			expect.objectContaining({
				workflows: expect.arrayContaining([
					expect.objectContaining({ workflowId: workflow.id, started: 2 }),
				]),
			}),
		);
		foldService.off('folded', folded);
	});
});

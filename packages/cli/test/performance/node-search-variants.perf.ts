/**
 * Evidence for the two query decisions behind the node content search. Both
 * findings are load-bearing, so this file exists to make them reproducible
 * rather than folklore:
 *
 *  1. `workflow_entity.updatedAt` needs an index (migration
 *     AddUpdatedAtIndexToWorkflowEntity1786525332822). Without it, an
 *     `ORDER BY updatedAt ... LIMIT n` sorts the whole table.
 *  2. Sharing must be expressed as `EXISTS`, not `id IN (subquery)`. The `IN`
 *     form makes SQLite drive from `shared_workflow` and sort every match in a
 *     temp B-tree, which throws away the index entirely.
 *  3. The keyset cursor must be a row-value comparison `(updatedAt, id) < (?, ?)`,
 *     not the logically equivalent OR form. The OR form triggers a MULTI-INDEX OR
 *     plan that materialises and sorts every row older than the cursor on every
 *     batch — turning the batched scan quadratic.
 *
 * Run with: pnpm test:performance
 */
import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { seedCorpus } from './shared';

const CORPUS = 20_000;
const SAMPLES = 15;

/** Shape of an `EXPLAIN QUERY PLAN` row in SQLite. */
type PlanRow = { detail: string };

/** SQLite-only: uses EXPLAIN QUERY PLAN and sqlite_master. See
 * node-search-postgres-plan.perf.ts for the Postgres equivalent. */
const isSqlite = () => Container.get(GlobalConfig).database.type === 'sqlite';

describe('node search SQL variants', () => {
	let ds: DataSource;
	const report: string[] = [];

	beforeAll(async () => {
		if (!isSqlite()) return;
		await testDb.init();
		await seedCorpus(CORPUS);
		ds = Container.get(DataSource);
	});

	afterAll(async () => {
		if (!isSqlite()) return;
		console.log(`\n${'='.repeat(78)}\nSQL VARIANTS (${CORPUS} workflows)\n${'='.repeat(78)}`);
		report.forEach((l) => console.log(l));
		console.log('='.repeat(78));
		await testDb.terminate();
	});

	it('EXISTS keeps the updatedAt index; IN (subquery) discards it', async () => {
		if (!isSqlite()) return;

		const bench = async (label: string, sql: string) => {
			const params = ['%step 3 of flow%'];
			const samples: number[] = [];
			for (let i = 0; i < SAMPLES; i++) {
				const t0 = performance.now();
				await ds.query(sql, params);
				samples.push(performance.now() - t0);
			}
			samples.sort((a, b) => a - b);
			const plan = await ds.query<PlanRow[]>(`EXPLAIN QUERY PLAN ${sql}`, params);
			const p50 = samples[Math.floor(samples.length / 2)];
			report.push(`\n  ${label}\n    p50=${p50.toFixed(1)}ms`);
			plan.forEach((p) => report.push(`      ${p.detail}`));
			return { p50, plan: plan.map((p) => p.detail).join(' | ') };
		};

		const SELECT =
			'SELECT w.updatedAt AS w_updatedAt, w.id, w.name, w.nodes FROM workflow_entity w';
		const LIKE = "LOWER(w.nodes) LIKE ? ESCAPE '\\'";
		const TAIL = 'ORDER BY w_updatedAt DESC LIMIT 100';

		const inForm = await bench(
			'sharing as: w.id IN (SELECT workflowId FROM shared_workflow)',
			`${SELECT} WHERE w.id IN (SELECT sw.workflowId FROM shared_workflow sw) AND ${LIKE} ${TAIL}`,
		);
		const existsForm = await bench(
			'sharing as: EXISTS (... WHERE sw.workflowId = w.id)   [shipped]',
			`${SELECT} WHERE EXISTS (SELECT 1 FROM shared_workflow sw WHERE sw.workflowId = w.id) AND ${LIKE} ${TAIL}`,
		);

		// The IN form materialises and sorts; the EXISTS form walks the index.
		expect(inForm.plan).toContain('TEMP B-TREE FOR ORDER BY');
		expect(existsForm.plan).toContain('IDX_workflow_entity_updatedAt');
		expect(existsForm.p50).toBeLessThan(inForm.p50);
	});

	it('row-value cursor keeps the index seek; the OR form materialises per batch', async () => {
		if (!isSqlite()) return;

		// Cursor positioned 100 rows in — where batch 2 of the keyset scan starts.
		const [cursorRow] = await ds.query<Array<{ updatedAt: string; id: string }>>(
			'SELECT updatedAt, id FROM workflow_entity ORDER BY updatedAt DESC, id DESC LIMIT 1 OFFSET 99',
		);

		const SELECT = 'SELECT w.updatedAt AS w_updatedAt, w.id FROM workflow_entity w';
		const WHERE =
			"WHERE EXISTS (SELECT 1 FROM shared_workflow sw WHERE sw.workflowId = w.id) AND LOWER(w.nodes) LIKE ? ESCAPE '\\'";
		const TAIL = 'ORDER BY w_updatedAt DESC, w.id DESC LIMIT 100';

		const bench = async (label: string, cursorSql: string, params: unknown[]) => {
			const sql = `${SELECT} ${WHERE} AND ${cursorSql} ${TAIL}`;
			const samples: number[] = [];
			for (let i = 0; i < SAMPLES; i++) {
				const t0 = performance.now();
				await ds.query(sql, params);
				samples.push(performance.now() - t0);
			}
			samples.sort((a, b) => a - b);
			const plan = await ds.query<PlanRow[]>(`EXPLAIN QUERY PLAN ${sql}`, params);
			const p50 = samples[Math.floor(samples.length / 2)];
			report.push(`\n  ${label}\n    p50=${p50.toFixed(1)}ms`);
			plan.forEach((p) => report.push(`      ${p.detail}`));
			return { p50, plan: plan.map((p) => p.detail).join(' | ') };
		};

		const pattern = '%step 3 of flow%';
		const orForm = await bench(
			'cursor as: updatedAt < ? OR (updatedAt = ? AND id < ?)',
			'(w.updatedAt < ? OR (w.updatedAt = ? AND w.id < ?))',
			[pattern, cursorRow.updatedAt, cursorRow.updatedAt, cursorRow.id],
		);
		const rowValue = await bench(
			'cursor as: (updatedAt, id) < (?, ?)   [shipped]',
			'(w.updatedAt, w.id) < (?, ?)',
			[pattern, cursorRow.updatedAt, cursorRow.id],
		);

		// The OR form materialises and sorts; the row value seeks and stops at the limit.
		expect(orForm.plan).toContain('MULTI-INDEX OR');
		expect(rowValue.plan).not.toContain('MULTI-INDEX OR');
		expect(rowValue.plan).toContain('IDX_workflow_entity_updatedAt');
		expect(rowValue.p50).toBeLessThan(orForm.p50);
	});

	it('dropping the updatedAt index regresses the shipped shape', async () => {
		if (!isSqlite()) return;

		const shipped = `SELECT w.updatedAt AS w_updatedAt, w.id FROM workflow_entity w
			WHERE EXISTS (SELECT 1 FROM shared_workflow sw WHERE sw.workflowId = w.id)
			AND LOWER(w.nodes) LIKE ? ESCAPE '\\' ORDER BY w_updatedAt DESC LIMIT 100`;

		const time = async () => {
			const t0 = performance.now();
			await ds.query(shipped, ['%step 3 of flow%']);
			return performance.now() - t0;
		};

		await time();
		const withIndex = await time();

		await ds.query('DROP INDEX IF EXISTS IDX_workflow_entity_updatedAt');
		const withoutIndex = await time();
		await ds.query(
			'CREATE INDEX IF NOT EXISTS IDX_workflow_entity_updatedAt ON workflow_entity (updatedAt)',
		);

		report.push(
			`\n  updatedAt index present: ${withIndex.toFixed(1)}ms   dropped: ${withoutIndex.toFixed(1)}ms`,
		);
		expect(withIndex).toBeLessThan(withoutIndex);
	});
});

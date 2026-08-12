/**
 * Evidence for the Postgres-specific planner hint in
 * `WorkflowRepository.getManyWithSharingSubquery`.
 *
 * Postgres cannot estimate the selectivity of `LIKE '%…%'`, so it assumes the
 * filter matches almost nothing and picks a sequential scan with a top-N sort
 * over the whole table instead of walking the `updatedAt` index and stopping at
 * the limit. `SET LOCAL enable_seqscan = off` corrects that choice without
 * changing the query, and costs nothing when no index can help (a query that
 * matches nothing scans everything either way).
 *
 * SQLite does not need this — see node-search-variants.perf.ts.
 *
 * Run with: pnpm test:performance (against Postgres)
 */
import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { seedCorpus } from './shared';

const CORPUS = 20_000;

const isPostgres = () => Container.get(GlobalConfig).database.type === 'postgresdb';

describe('postgres planner hint', () => {
	let ds: DataSource;
	let table: string;
	let sharedTable: string;
	const report: string[] = [];

	beforeAll(async () => {
		if (!isPostgres()) return;
		await testDb.init();
		await seedCorpus(CORPUS);

		ds = Container.get(DataSource);
		// Match a real instance, where autovacuum has long since analysed.
		await ds.query('ANALYZE');

		const config = Container.get(GlobalConfig);
		const schema = config.database.postgresdb.schema;
		const prefix = config.database.tablePrefix;
		table = `${schema}.${prefix}workflow_entity`;
		sharedTable = `${schema}.${prefix}shared_workflow`;
	});

	afterAll(async () => {
		if (!isPostgres()) return;
		console.log(`\n${'='.repeat(78)}\nPOSTGRES PLANNER (${CORPUS} workflows)\n${'='.repeat(78)}`);
		report.forEach((l) => console.log(l));
		console.log('='.repeat(78));
		await testDb.terminate();
	});

	it('enable_seqscan=off makes a matching query use the updatedAt index', async () => {
		if (!isPostgres()) return;

		const sql = `SELECT w."updatedAt" AS w_updatedAt, w.id, w.nodes FROM ${table} w
			WHERE EXISTS (SELECT 1 FROM ${sharedTable} sw WHERE sw."workflowId" = w.id)
			AND LOWER(w.nodes::text) LIKE $1 ESCAPE '\\'
			ORDER BY w."updatedAt" DESC LIMIT 100`;

		const measure = async (label: string, pattern: string, hint: boolean) => {
			const runner = ds.createQueryRunner();
			await runner.connect();
			await runner.startTransaction();
			if (hint) await runner.query('SET LOCAL enable_seqscan = off');
			const t0 = performance.now();
			await runner.query(sql, [pattern]);
			const ms = performance.now() - t0;
			const plan = (await runner.query(`EXPLAIN ${sql}`, [pattern])) as Array<
				Record<string, string>
			>;
			await runner.rollbackTransaction();
			await runner.release();
			const planText = plan.map((r) => Object.values(r)[0]).join(' | ');
			report.push(`\n  ${label}\n    ${ms.toFixed(1)}ms\n    ${planText.slice(0, 200)}`);
			return { ms, planText };
		};

		const plain = await measure('matching, default planner', '%step 3 of flow%', false);
		const hinted = await measure('matching, enable_seqscan=off', '%step 3 of flow%', true);

		expect(plain.planText).toContain('Seq Scan');
		expect(hinted.planText).toContain('IDX_');
		expect(hinted.ms).toBeLessThan(plain.ms);
	});

	it('does not regress a query that matches nothing', async () => {
		if (!isPostgres()) return;

		const sql = `SELECT w.id FROM ${table} w
			WHERE EXISTS (SELECT 1 FROM ${sharedTable} sw WHERE sw."workflowId" = w.id)
			AND LOWER(w.nodes::text) LIKE $1 ESCAPE '\\'
			ORDER BY w."updatedAt" DESC LIMIT 100`;

		const measure = async (hint: boolean) => {
			const runner = ds.createQueryRunner();
			await runner.connect();
			await runner.startTransaction();
			if (hint) await runner.query('SET LOCAL enable_seqscan = off');
			const t0 = performance.now();
			await runner.query(sql, ['%qqxzptvnomatch%']);
			const ms = performance.now() - t0;
			await runner.rollbackTransaction();
			await runner.release();
			return ms;
		};

		const plain = await measure(false);
		const hinted = await measure(true);
		report.push(`\n  no match: default ${plain.toFixed(1)}ms, hinted ${hinted.toFixed(1)}ms`);

		// Proving absence scans everything either way; the hint must not make it
		// meaningfully worse.
		expect(hinted).toBeLessThan(plain * 2);
	});
});

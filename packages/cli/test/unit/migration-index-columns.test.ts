import { parseIndexColumns } from '../migration/shared/index-columns';

/**
 * Lives in `test/unit` rather than beside the helper: `test/migration/**` only runs in the two
 * database-backed suites, and this needs no database. Every DDL string below was read back from a
 * real engine — Postgres 16.15 via `pg_indexes.indexdef`, SQLite via `sqlite_master.sql` — not
 * hand-written, because the exact quoting and parenthesisation is the whole point.
 */
describe('parseIndexColumns', () => {
	describe('the shapes this helper is used for today', () => {
		it.each([
			[
				'postgres, quoted leading column',
				'CREATE INDEX "IDX_activity_event_project" ON public.activity_event USING btree ("projectId", id)',
				['projectId', 'id'],
			],
			[
				'postgres, unquoted columns',
				'CREATE INDEX "IDX_probe" ON public.t_probe USING btree (monkey, zebra, alpha)',
				['monkey', 'zebra', 'alpha'],
			],
			[
				'postgres, single column, unique',
				'CREATE UNIQUE INDEX "PK_c2c1e9fdda754a6bf7f664d7e04" ON public.activity_event USING btree (id)',
				['id'],
			],
			[
				'sqlite, quoted columns',
				'CREATE INDEX "IDX_activity_event_project" ON "activity_event" ("projectId", "id")',
				['projectId', 'id'],
			],
			[
				'sqlite, partial index with an unparenthesised predicate',
				'CREATE INDEX "IDX_partial" ON "t_partial" ("owner", "createdAt") WHERE "deleted" = 0',
				['owner', 'createdAt'],
			],
		])('reads %s', (_label, definition, expected) => {
			expect(parseIndexColumns(definition)).toEqual(expected);
		});
	});

	/**
	 * These are the shapes that break the "last parenthesised group" rule. None of them exist in
	 * the schema yet, so nothing is wrong today — but this is a shared helper under
	 * `test/migration/shared`, and the eight migration tests that currently inline this query are
	 * its likely callers. A silent wrong answer here reads as a passing column-order assertion.
	 */
	describe('shapes where the last parenthesised group is not the column list', () => {
		it('reads the columns of a postgres partial index, not its WHERE clause', () => {
			// `pg_indexes.indexdef` always parenthesises the predicate, so every partial index on
			// Postgres hits this.
			const definition =
				'CREATE INDEX "IDX_partial" ON public.t_partial USING btree (owner, "createdAt") WHERE (deleted = false)';

			expect(parseIndexColumns(definition)).toEqual(['owner', 'createdAt']);
		});

		it('reads the columns of a sqlite partial index whose predicate is parenthesised', () => {
			const definition =
				'CREATE INDEX "IDX_partial" ON "t_partial" ("owner", "createdAt") WHERE ("deleted" = 0)';

			expect(parseIndexColumns(definition)).toEqual(['owner', 'createdAt']);
		});

		it('keeps a postgres expression index whole', () => {
			const definition = 'CREATE INDEX "IDX_expr" ON public.t_expr USING btree (lower(name))';

			expect(parseIndexColumns(definition)).toEqual(['lower(name)']);
		});

		it('keeps a sqlite expression index whole', () => {
			const definition = 'CREATE INDEX "IDX_expr" ON "t_expr" (lower("name"))';

			expect(parseIndexColumns(definition)).toEqual(['lower("name")']);
		});

		it('does not split a multi-argument function across columns', () => {
			const definition =
				'CREATE INDEX "IDX_coalesce" ON public.t USING btree (coalesce(a, b), "createdAt")';

			expect(parseIndexColumns(definition)).toEqual(['coalesce(a, b)', 'createdAt']);
		});
	});
});

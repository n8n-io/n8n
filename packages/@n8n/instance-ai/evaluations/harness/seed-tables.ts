// ---------------------------------------------------------------------------
// Scenario seed data tables (TRUST-311)
//
// A case's execution scenarios share one pre-created data table per declared
// name; rows are reset + seeded per scenario. These helpers dedupe the
// declared union, describe it to the agent, and reseed rows before each run.
// ---------------------------------------------------------------------------

import type { InstanceAiEvalSeedDataTable } from '@n8n/api-types';

import { type EvalLogger } from './logger';
import type { N8nClient } from '../clients/n8n-client';
import type { ExecutionScenario } from '../types';

/** Per-scenario row-seeding context: the run's thread and the name→real-id map
 *  of the tables created empty before the build turn (TRUST-311 follow-up). */
export interface ScenarioSeedContext {
	threadId: string;
	tableIdsByName: Record<string, string>;
}

/** Max distinct scenario seed tables per case — mirrors the restore-thread
 *  DTO's `dataTables` cap, since the whole union is sent in one call. */
const MAX_SEED_DATA_TABLES = 20;

/**
 * Deduplicate the data tables an execution-scenario case declares
 * (`seedDataTables`) into the union a case shares across its scenarios
 * (TRUST-311). A table name is unique per project and the built workflow binds
 * it by name, so a case shares ONE table per name across its scenarios; the
 * first declaration wins. A later same-name declaration with a different shape
 * (columns/rows) is dropped with a warning — the by-name binding can only
 * resolve to one table, so keeping the first silently would be data loss for the
 * author. Throws if the distinct-name union exceeds the restore-thread DTO's cap
 * (the whole union is created in one call). The returned tables carry their
 * declared `rows`, but the pre-build creation seeds only the schema — rows are
 * reset+seeded per scenario (`reseedScenarioTables`).
 */
export function dedupeScenarioSeedTables(
	scenarios: ExecutionScenario[],
	logger: EvalLogger,
): InstanceAiEvalSeedDataTable[] {
	const byName = new Map<string, InstanceAiEvalSeedDataTable>();
	for (const scenario of scenarios) {
		for (const table of scenario.seedDataTables ?? []) {
			const existing = byName.get(table.name);
			if (existing) {
				if (!sameSeedTableShape(existing, table)) {
					logger.warn(
						`  Scenario seed table "${table.name}" is declared more than once with different columns/rows; keeping the first declaration and ignoring the rest.`,
					);
				}
				continue;
			}
			byName.set(table.name, table);
		}
	}
	if (byName.size > MAX_SEED_DATA_TABLES) {
		throw new Error(
			`A case declares ${String(byName.size)} distinct scenario seed data tables, exceeding the ${String(MAX_SEED_DATA_TABLES)}-table restore limit; reduce the number of distinct table names.`,
		);
	}
	return [...byName.values()];
}

/**
 * A note appended to the build's opening message naming the data tables that
 * already exist in the workspace (created empty before the build turn) so the
 * agent discovers and binds the REAL table (via the Data Table node's
 * list/schema) instead of creating a duplicate — the production-faithful flow
 * where the user's table pre-exists (TRUST-311 follow-up). Empty when the case
 * declares no scenario seed tables.
 */
export function buildSeededTablesNote(tables: InstanceAiEvalSeedDataTable[]): string {
	if (tables.length === 0) return '';
	const lines = tables.map((table) => {
		const columns = table.columns.map((column) => `${column.name}: ${column.type}`).join(', ');
		return `- "${table.name}" (columns: ${columns})`;
	});
	return `\n\nThe following data table(s) already exist in this workspace — reuse them (look them up with the Data Table node's list/schema) instead of creating new ones:\n${lines.join('\n')}`;
}

/**
 * True when any scenario declares seed tables. All of a case's scenarios share
 * one table per name, so their per-scenario row reset+seed
 * (`reseedScenarioTables`) must run serially — concurrent scenarios would race
 * on the shared table's rows. Callers gate scenario concurrency to 1 for such
 * cases.
 */
export function scenariosRequireSerialSeeding(scenarios: ExecutionScenario[]): boolean {
	return scenarios.some((scenario) => (scenario.seedDataTables?.length ?? 0) > 0);
}

/**
 * Reset + row-seed a scenario's declared data tables into their pre-seeded real
 * ids, just before that scenario executes (TRUST-311). Clears whatever rows a
 * prior scenario — or a build-time self-verification execution — left, then
 * inserts this scenario's declared rows, so each scenario runs against exactly
 * the state it declared (and scenarios may carry different rows for the same
 * table). `tableIdsByName` maps the declared table name to the real id created
 * before the build turn; a name missing from it means the table was never
 * pre-seeded, which is a harness bug, so throw rather than silently skip.
 */
export async function reseedScenarioTables(
	client: N8nClient,
	scenario: ExecutionScenario,
	threadId: string,
	tableIdsByName: Record<string, string>,
	logger: EvalLogger,
): Promise<void> {
	for (const table of scenario.seedDataTables ?? []) {
		const tableId = tableIdsByName[table.name];
		if (!tableId) {
			throw new Error(
				`Scenario "${scenario.name}" declares seed table "${table.name}" that was not pre-seeded before the build; cannot bind its rows.`,
			);
		}
		await client.seedDataTableRows(threadId, tableId, table.rows ?? []);
		logger.verbose(
			`    [${scenario.name}] reseeded data table "${table.name}" (${String((table.rows ?? []).length)} row(s))`,
		);
	}
}

/** Two seed tables bind the same way iff their columns + rows match (the id
 *  differs per declaration and is cosmetic under by-name seeding). */
function sameSeedTableShape(
	a: InstanceAiEvalSeedDataTable,
	b: InstanceAiEvalSeedDataTable,
): boolean {
	return (
		JSON.stringify({ columns: a.columns, rows: a.rows }) ===
		JSON.stringify({ columns: b.columns, rows: b.rows })
	);
}

/** Agent scenarios don't seed data-table rows (tables exist but stay empty) — shared warning for both orchestration paths. */
export function warnAgentSeedDataTablesIgnored(
	logger: EvalLogger,
	scenarioName: string,
	seedDataTables: unknown[] | undefined,
): void {
	if ((seedDataTables?.length ?? 0) > 0) {
		logger.warn(
			`    [${scenarioName}] seedDataTables are not seeded on the agent execution path — tables exist but stay empty`,
		);
	}
}

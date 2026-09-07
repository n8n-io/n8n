import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import { SEED_NAME_RE } from '../harness/conversation-seed';
import type { EvalLogger } from '../harness/logger';
import {
	buildSeededTablesNote,
	dedupeScenarioSeedTables,
	evictLeftoverSeedTables,
	reseedScenarioTables,
	scenariosRequireSerialSeeding,
	uniquifyScenarioTableNames,
} from '../harness/seed-tables';
import type { ExecutionScenario } from '../types';

// TRUST-311 follow-up: scenario data tables are created EMPTY before the build
// turn (so the agent discovers the real table and binds its real id), then row-
// seeded per scenario just before that scenario executes (so build-time row
// mutations don't leak across scenarios, and scenarios can carry different rows).
// These unit the pure pieces; the pre-build/per-scenario wiring is integration.

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

function scenario(overrides: Partial<ExecutionScenario> = {}): ExecutionScenario {
	return {
		name: 'scenario',
		description: 'd',
		dataSetup: 'setup',
		successCriteria: 'ok',
		...overrides,
	};
}

const jobApplications = {
	id: 'job-applications-1234',
	name: 'Job Applications',
	columns: [{ name: 'application_id', type: 'string' as const }],
	rows: [{ application_id: 'row_001' }],
};

describe('dedupeScenarioSeedTables', () => {
	it('returns the union of scenario seed tables deduped by name (first wins)', () => {
		const dup = {
			...jobApplications,
			id: 'applications-2222',
			rows: [{ application_id: 'row_002' }],
		};
		const tables = dedupeScenarioSeedTables(
			[scenario({ seedDataTables: [jobApplications] }), scenario({ seedDataTables: [dup] })],
			silentLogger,
		);

		expect(tables).toEqual([jobApplications]); // first declaration wins
	});

	it('returns an empty array when no scenario declares a seed table', () => {
		expect(
			dedupeScenarioSeedTables([scenario(), scenario({ seedDataTables: [] })], silentLogger),
		).toEqual([]);
	});

	it('warns when a later scenario redeclares the same name with a DIFFERENT shape', () => {
		const warn = vi.fn();
		const logger = { ...silentLogger, warn };
		const conflicting = {
			...jobApplications,
			id: 'applications-2222',
			rows: [{ application_id: 'row_002' }],
		};

		dedupeScenarioSeedTables(
			[
				scenario({ seedDataTables: [jobApplications] }),
				scenario({ seedDataTables: [conflicting] }),
			],
			logger,
		);

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('Job Applications'));
	});

	it('does not warn when the same name is redeclared identically', () => {
		const warn = vi.fn();
		const logger = { ...silentLogger, warn };

		dedupeScenarioSeedTables(
			[
				scenario({ seedDataTables: [jobApplications] }),
				scenario({ seedDataTables: [{ ...jobApplications }] }),
			],
			logger,
		);

		expect(warn).not.toHaveBeenCalled();
	});

	it('throws when the deduped union exceeds the 20-table cap', () => {
		const tables = Array.from({ length: 21 }, (_, i) => ({
			id: `table-id-${String(i).padStart(4, '0')}`,
			name: `Table ${String(i)}`,
			columns: [{ name: 'application_id', type: 'string' as const }],
		}));

		expect(() =>
			dedupeScenarioSeedTables([scenario({ seedDataTables: tables })], silentLogger),
		).toThrow(/20/);
	});
});

describe('buildSeededTablesNote', () => {
	it('is empty when there are no tables', () => {
		expect(buildSeededTablesNote([])).toBe('');
	});

	it('names each table and its columns so the agent binds the real table', () => {
		const note = buildSeededTablesNote([jobApplications]);

		expect(note).toContain('Job Applications');
		expect(note).toContain('application_id');
		expect(note).toContain('string');
	});
});

describe('scenariosRequireSerialSeeding', () => {
	it('is true when any scenario declares seed tables', () => {
		expect(
			scenariosRequireSerialSeeding([scenario(), scenario({ seedDataTables: [jobApplications] })]),
		).toBe(true);
	});

	it('is false when no scenario declares seed tables', () => {
		expect(scenariosRequireSerialSeeding([scenario(), scenario({ seedDataTables: [] })])).toBe(
			false,
		);
	});
});

function makeClient(seedDataTableRows: Mock): N8nClient {
	return { seedDataTableRows } as unknown as N8nClient;
}

describe('reseedScenarioTables', () => {
	it('clears + seeds each declared table by its bound real id', async () => {
		const seedDataTableRows = vi.fn().mockResolvedValue(undefined);
		const client = makeClient(seedDataTableRows);

		await reseedScenarioTables(
			client,
			scenario({ seedDataTables: [jobApplications] }),
			'thread-1',
			{ 'Job Applications': 'dt-real-1' },
			silentLogger,
		);

		expect(seedDataTableRows).toHaveBeenCalledWith('thread-1', 'dt-real-1', jobApplications.rows);
	});

	it('seeds an empty row set when a table declares no rows', async () => {
		const seedDataTableRows = vi.fn().mockResolvedValue(undefined);
		const client = makeClient(seedDataTableRows);
		const noRows = { ...jobApplications, rows: undefined };

		await reseedScenarioTables(
			client,
			scenario({ seedDataTables: [noRows] }),
			'thread-1',
			{ 'Job Applications': 'dt-real-1' },
			silentLogger,
		);

		expect(seedDataTableRows).toHaveBeenCalledWith('thread-1', 'dt-real-1', []);
	});

	it('does nothing when the scenario declares no seed tables', async () => {
		const seedDataTableRows = vi.fn();
		const client = makeClient(seedDataTableRows);

		await reseedScenarioTables(client, scenario(), 'thread-1', {}, silentLogger);

		expect(seedDataTableRows).not.toHaveBeenCalled();
	});

	it('throws when a declared table was not pre-seeded (missing from the id map)', async () => {
		const seedDataTableRows = vi.fn();
		const client = makeClient(seedDataTableRows);

		await expect(
			reseedScenarioTables(
				client,
				scenario({ seedDataTables: [jobApplications] }),
				'thread-1',
				{}, // Job Applications not in the map
				silentLogger,
			),
		).rejects.toThrow(/Job Applications/);
		expect(seedDataTableRows).not.toHaveBeenCalled();
	});
});

describe('uniquifyScenarioTableNames', () => {
	it('suffixes each table so two runs of one case do not contend for the name', () => {
		const [first] = uniquifyScenarioTableNames([jobApplications]);
		const [second] = uniquifyScenarioTableNames([jobApplications]);

		expect(first.name).toMatch(/^Job Applications \[seed [0-9a-f]{8}\]$/);
		expect(second.name).not.toBe(first.name);
		expect(SEED_NAME_RE.exec(first.name)?.[1]).toBe('Job Applications');
	});

	it('shares one suffix across a case, and keeps columns and rows intact', () => {
		const other = { ...jobApplications, id: 'other-1234', name: 'Other' };
		const [a, b] = uniquifyScenarioTableNames([jobApplications, other]);

		expect(a.name.replace('Job Applications', '')).toBe(b.name.replace('Other', ''));
		expect(a.columns).toEqual(jobApplications.columns);
		expect(a.rows).toEqual(jobApplications.rows);
	});

	it('keeps the suffixed name inside the 128-char column bound', () => {
		const [long] = uniquifyScenarioTableNames([{ ...jobApplications, name: 'x'.repeat(200) }]);
		expect(long.name.length).toBe(128);
	});
});

describe('evictLeftoverSeedTables', () => {
	const leftover = { id: 'left-1', name: 'Job Applications [seed 1a2b3c4d]' };

	function evictClient(
		tables: Array<{ id: string; name: string }>,
		deleteDataTable: Mock = vi.fn(),
	): N8nClient {
		return {
			getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
			listDataTables: vi.fn().mockResolvedValue(tables),
			deleteDataTable,
		} as unknown as N8nClient;
	}

	it('deletes a leftover seed table for a declared name', async () => {
		const deleteDataTable = vi.fn();
		await evictLeftoverSeedTables(
			evictClient([leftover], deleteDataTable),
			[jobApplications],
			new Set(['left-1']),
			silentLogger,
		);
		expect(deleteDataTable).toHaveBeenCalledWith('project-1', 'left-1');
	});

	// The snapshot is taken before any build on the lane, so a table created DURING
	// the run belongs to an in-flight iteration — deleting it would break that run.
	it('leaves a table absent from the pre-run snapshot alone', async () => {
		const deleteDataTable = vi.fn();
		await evictLeftoverSeedTables(
			evictClient([leftover], deleteDataTable),
			[jobApplications],
			new Set(['someone-else']),
			silentLogger,
		);
		expect(deleteDataTable).not.toHaveBeenCalled();
	});

	// A name past the column bound loses its tail before the suffix goes on, so the
	// stored base is the truncated one — matching on the declared name found nothing
	// and the leftover accumulated run after run.
	it('matches a leftover whose base was truncated to fit the column bound', async () => {
		const deleteDataTable = vi.fn();
		const longName = 'x'.repeat(200);
		const [stored] = uniquifyScenarioTableNames([{ ...jobApplications, name: longName }]);
		await evictLeftoverSeedTables(
			evictClient([{ id: 'left-long', name: stored.name }], deleteDataTable),
			[{ ...jobApplications, name: longName }],
			new Set(['left-long']),
			silentLogger,
		);
		expect(deleteDataTable).toHaveBeenCalledWith('project-1', 'left-long');
	});

	it('never touches a table without the seed suffix, or one of another case', async () => {
		const deleteDataTable = vi.fn();
		await evictLeftoverSeedTables(
			evictClient(
				[
					{ id: 'real', name: 'Job Applications' },
					{ id: 'other', name: 'Invoices [seed 1a2b3c4d]' },
				],
				deleteDataTable,
			),
			[jobApplications],
			new Set(['real', 'other']),
			silentLogger,
		);
		expect(deleteDataTable).not.toHaveBeenCalled();
	});

	it('does nothing without a snapshot, and never fails the build on an API error', async () => {
		const deleteDataTable = vi.fn();
		await evictLeftoverSeedTables(
			evictClient([leftover], deleteDataTable),
			[jobApplications],
			undefined,
			silentLogger,
		);
		expect(deleteDataTable).not.toHaveBeenCalled();

		const broken = {
			getPersonalProjectId: vi.fn().mockRejectedValue(new Error('boom')),
		} as unknown as N8nClient;
		await expect(
			evictLeftoverSeedTables(broken, [jobApplications], new Set(['left-1']), silentLogger),
		).resolves.toBeUndefined();
	});
});

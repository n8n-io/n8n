import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { seedScenarioDataTables } from '../harness/runner';
import type { ExecutionScenario } from '../types';

// TRUST-311: a fresh execution-scenario case (no seedThread/seedFile) must still
// get its declared data tables created + row-seeded before the scenario executes.
// The seeding reuses the restore-thread path, but under the tables' EXACT declared
// names (uniquifyNames:false) so the built workflow's by-name references resolve.

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

function makeClient(restoreThread: Mock): { client: N8nClient; restoreThread: Mock } {
	return { client: { restoreThread } as unknown as N8nClient, restoreThread };
}

function scenario(overrides: Partial<ExecutionScenario> = {}): ExecutionScenario {
	return {
		name: 'scenario',
		description: 'd',
		dataSetup: 'setup',
		successCriteria: 'ok',
		...overrides,
	};
}

describe('seedScenarioDataTables', () => {
	it('seeds a scenario table under its exact name and returns the created ids', async () => {
		const restoreThread = vi.fn().mockResolvedValue({
			restored: 0,
			workflowIds: [],
			dataTableIds: ['dt-new-1'],
		});
		const { client } = makeClient(restoreThread);

		const tables = [
			{
				id: 'job-applications-1234',
				name: 'Job Applications',
				columns: [{ name: 'application_id', type: 'string' as const }],
				rows: [{ application_id: 'row_001' }],
			},
		];

		const ids = await seedScenarioDataTables(
			client,
			'thread-1',
			[scenario({ seedDataTables: tables })],
			silentLogger,
		);

		expect(ids).toEqual(['dt-new-1']);
		// No messages, no workflows — just the tables, under exact names.
		expect(restoreThread).toHaveBeenCalledWith('thread-1', [], [], tables, {
			uniquifyNames: false,
		});
	});

	it('dedupes tables by name across scenarios (a case shares one named table)', async () => {
		const restoreThread = vi.fn().mockResolvedValue({
			restored: 0,
			workflowIds: [],
			dataTableIds: ['dt-a'],
		});
		const { client } = makeClient(restoreThread);

		const first = {
			id: 'applications-1111',
			name: 'Job Applications',
			columns: [{ name: 'application_id', type: 'string' as const }],
			rows: [{ application_id: 'row_001' }],
		};
		const dupName = {
			id: 'applications-2222',
			name: 'Job Applications',
			columns: [{ name: 'application_id', type: 'string' as const }],
			rows: [{ application_id: 'row_002' }],
		};

		await seedScenarioDataTables(
			client,
			'thread-1',
			[scenario({ seedDataTables: [first] }), scenario({ seedDataTables: [dupName] })],
			silentLogger,
		);

		// restoreThread(threadId, messages, workflows, tables, opts) — the 4th arg is the tables.
		const passedTables = (restoreThread.mock.calls[0] as unknown[])[3];
		expect(passedTables).toEqual([first]); // first declaration wins; dup name dropped
	});

	it('does nothing when no scenario declares a seed table', async () => {
		const restoreThread = vi.fn();
		const { client } = makeClient(restoreThread);

		const ids = await seedScenarioDataTables(
			client,
			'thread-1',
			[scenario(), scenario({ seedDataTables: [] })],
			silentLogger,
		);

		expect(ids).toEqual([]);
		expect(restoreThread).not.toHaveBeenCalled();
	});

	it('warns when a later scenario redeclares the same name with a DIFFERENT shape', async () => {
		const restoreThread = vi.fn().mockResolvedValue({
			restored: 0,
			workflowIds: [],
			dataTableIds: ['dt-a'],
		});
		const { client } = makeClient(restoreThread);
		const warn = vi.fn();
		const logger = { ...silentLogger, warn };

		const first = {
			id: 'applications-1111',
			name: 'Job Applications',
			columns: [{ name: 'application_id', type: 'string' as const }],
			rows: [{ application_id: 'row_001' }],
		};
		const conflicting = {
			...first,
			id: 'applications-2222',
			rows: [{ application_id: 'row_002' }],
		};

		await seedScenarioDataTables(
			client,
			'thread-1',
			[scenario({ seedDataTables: [first] }), scenario({ seedDataTables: [conflicting] })],
			logger,
		);

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('Job Applications'));
	});

	it('does not warn when the same name is redeclared identically', async () => {
		const restoreThread = vi.fn().mockResolvedValue({
			restored: 0,
			workflowIds: [],
			dataTableIds: ['dt-a'],
		});
		const { client } = makeClient(restoreThread);
		const warn = vi.fn();
		const logger = { ...silentLogger, warn };

		const table = {
			id: 'applications-1111',
			name: 'Job Applications',
			columns: [{ name: 'application_id', type: 'string' as const }],
			rows: [{ application_id: 'row_001' }],
		};

		await seedScenarioDataTables(
			client,
			'thread-1',
			[scenario({ seedDataTables: [table] }), scenario({ seedDataTables: [{ ...table }] })],
			logger,
		);

		expect(warn).not.toHaveBeenCalled();
	});

	it('throws (without seeding) when the deduped union exceeds the 20-table cap', async () => {
		const restoreThread = vi.fn();
		const { client } = makeClient(restoreThread);

		const tables = Array.from({ length: 21 }, (_, i) => ({
			id: `table-id-${String(i).padStart(4, '0')}`,
			name: `Table ${String(i)}`,
			columns: [{ name: 'application_id', type: 'string' as const }],
		}));

		await expect(
			seedScenarioDataTables(
				client,
				'thread-1',
				[scenario({ seedDataTables: tables })],
				silentLogger,
			),
		).rejects.toThrow(/20/);
		expect(restoreThread).not.toHaveBeenCalled();
	});
});

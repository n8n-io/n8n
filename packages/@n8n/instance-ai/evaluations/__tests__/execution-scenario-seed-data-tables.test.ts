import { EvalTestCaseSchema } from '../harness/schema';

// TRUST-311: an execution scenario can declare typed seed data tables (with rows)
// so a string id like `row_001` lands in a `string` column instead of being
// rejected by a `number` column. The field reuses api-types'
// `instanceAiEvalSeedDataTableSchema`, extended to carry optional `rows`.
describe('executionScenarios[].seedDataTables', () => {
	function caseWith(seedDataTables: unknown) {
		return {
			complexity: 'simple' as const,
			tags: [],
			conversation: [{ role: 'user' as const, text: 'do the thing' }],
			executionScenarios: [
				{
					name: 'scenario-1',
					description: 'seeded scenario',
					dataSetup: 'a job application already exists',
					successCriteria: 'the workflow reads it',
					seedDataTables,
				},
			],
		};
	}

	it('preserves a typed seed table with a string id column and a string-id row', () => {
		const seedDataTables = [
			{
				id: 'job-applications-tbl',
				name: 'Job Applications',
				columns: [
					{ name: 'id', type: 'string' as const },
					{ name: 'is_active', type: 'boolean' as const },
				],
				rows: [{ id: 'row_001', is_active: true }],
			},
		];

		const result = EvalTestCaseSchema.safeParse(caseWith(seedDataTables));

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.executionScenarios?.[0].seedDataTables).toEqual(seedDataTables);
	});

	it('is optional — a scenario without seed tables still parses', () => {
		const result = EvalTestCaseSchema.safeParse({
			complexity: 'simple' as const,
			tags: [],
			conversation: [{ role: 'user' as const, text: 'do the thing' }],
			executionScenarios: [
				{
					name: 'scenario-1',
					description: 'plain scenario',
					dataSetup: 'nothing',
					successCriteria: 'ok',
				},
			],
		});

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data.executionScenarios?.[0].seedDataTables).toBeUndefined();
	});

	it('rejects a too-short table id at load time (restore needs >=8 chars to remap)', () => {
		const result = EvalTestCaseSchema.safeParse(
			caseWith([
				{
					id: 'short',
					name: 'Job Applications',
					columns: [{ name: 'id', type: 'string' as const }],
				},
			]),
		);

		expect(result.success).toBe(false);
	});

	it('rejects an unknown column type', () => {
		const result = EvalTestCaseSchema.safeParse(
			caseWith([
				{
					id: 'job-applications-tbl',
					name: 'Job Applications',
					columns: [{ name: 'id', type: 'uuid' }],
				},
			]),
		);

		expect(result.success).toBe(false);
	});
});

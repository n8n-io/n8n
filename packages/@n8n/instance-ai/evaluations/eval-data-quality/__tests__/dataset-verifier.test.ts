import { verifyDataset } from '../dataset-verifier';
import { datasetSidecarSchema, type DatasetSidecar, type SemanticJudgeFn } from '../types';

const baseColumns = [
	{ name: 'input', type: 'string' as const },
	{ name: 'expected_output', type: 'string' as const },
	{ name: 'actual_output', type: 'string' as const },
];

function sidecar(overrides: Partial<DatasetSidecar> = {}): DatasetSidecar {
	return datasetSidecarSchema.parse({
		minRowCount: 3,
		columns: baseColumns,
		inputColumns: ['input'],
		expectedOutputColumns: ['expected_output'],
		actualOutputColumns: ['actual_output'],
		...overrides,
	});
}

describe('verifyDataset', () => {
	it('passes when row count, columns, and required cells are all valid', async () => {
		const result = await verifyDataset({
			rows: [
				{ input: 'a', expected_output: 'X', actual_output: null },
				{ input: 'b', expected_output: 'Y', actual_output: null },
				{ input: 'c', expected_output: 'Z', actual_output: null },
			],
			dataTableColumns: baseColumns,
			sidecar: sidecar(),
			requestedRowCount: 3,
		});

		expect(result.passed).toBe(true);
		expect(result.findings).toEqual([]);
		expect(result.rowCount).toBe(3);
	});

	it('fails when row count is below minRowCount', async () => {
		const result = await verifyDataset({
			rows: [{ input: 'a', expected_output: 'X', actual_output: null }],
			dataTableColumns: baseColumns,
			sidecar: sidecar({ minRowCount: 3 }),
			requestedRowCount: 3,
		});

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'row_count_below_minimum' })]),
		);
	});

	it('emits a warning (not error) when below requested but above minimum', async () => {
		const result = await verifyDataset({
			rows: [
				{ input: 'a', expected_output: 'X', actual_output: null },
				{ input: 'b', expected_output: 'Y', actual_output: null },
				{ input: 'c', expected_output: 'Z', actual_output: null },
			],
			dataTableColumns: baseColumns,
			sidecar: sidecar({ minRowCount: 3 }),
			requestedRowCount: 25,
		});

		const warning = result.findings.find((f) => f.code === 'row_count_below_request');
		expect(warning).toMatchObject({ severity: 'warning' });
		expect(result.passed).toBe(true);
	});

	it('flags missing required columns', async () => {
		const result = await verifyDataset({
			rows: [
				{ input: 'a', expected_output: 'X' },
				{ input: 'b', expected_output: 'Y' },
				{ input: 'c', expected_output: 'Z' },
			],
			dataTableColumns: [
				{ name: 'input', type: 'string' },
				{ name: 'expected_output', type: 'string' },
			],
			sidecar: sidecar(),
			requestedRowCount: 3,
		});

		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'missing_column', column: 'actual_output' }),
			]),
		);
		expect(result.passed).toBe(false);
	});

	it('flags type mismatches', async () => {
		const result = await verifyDataset({
			rows: [
				{ input: 'a', expected_output: 'X', actual_output: null },
				{ input: 'b', expected_output: 'Y', actual_output: null },
				{ input: 'c', expected_output: 'Z', actual_output: null },
			],
			dataTableColumns: [
				{ name: 'input', type: 'number' },
				{ name: 'expected_output', type: 'string' },
				{ name: 'actual_output', type: 'string' },
			],
			sidecar: sidecar(),
			requestedRowCount: 3,
		});

		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'column_type_mismatch', column: 'input' }),
			]),
		);
	});

	it('warns about unexpected columns but does not fail', async () => {
		const result = await verifyDataset({
			rows: [
				{ input: 'a', expected_output: 'X', actual_output: null },
				{ input: 'b', expected_output: 'Y', actual_output: null },
				{ input: 'c', expected_output: 'Z', actual_output: null },
			],
			dataTableColumns: [...baseColumns, { name: 'extra', type: 'string' }],
			sidecar: sidecar(),
			requestedRowCount: 3,
		});

		expect(result.passed).toBe(true);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'unexpected_column', severity: 'warning' }),
			]),
		);
	});

	it('ignores DataTable system columns when comparing', async () => {
		const result = await verifyDataset({
			rows: [
				{ input: 'a', expected_output: 'X', actual_output: null },
				{ input: 'b', expected_output: 'Y', actual_output: null },
				{ input: 'c', expected_output: 'Z', actual_output: null },
			],
			dataTableColumns: [
				{ name: 'id', type: 'number' },
				{ name: 'createdAt', type: 'date' },
				{ name: 'updatedAt', type: 'date' },
				...baseColumns,
			],
			sidecar: sidecar(),
			requestedRowCount: 3,
		});

		expect(result.passed).toBe(true);
		expect(result.findings).toEqual([]);
	});

	it('flags empty values in required columns', async () => {
		const result = await verifyDataset({
			rows: [
				{ input: '', expected_output: 'X', actual_output: null },
				{ input: 'b', expected_output: null, actual_output: null },
				{ input: 'c', expected_output: 'Z', actual_output: null },
			],
			dataTableColumns: baseColumns,
			sidecar: sidecar(),
			requestedRowCount: 3,
		});

		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'required_cell_empty', column: 'input', rowIndex: 0 }),
				expect.objectContaining({
					code: 'required_cell_empty',
					column: 'expected_output',
					rowIndex: 1,
				}),
			]),
		);
	});

	it('flags reserved actual_* columns when they are populated by generation', async () => {
		const result = await verifyDataset({
			rows: [
				{ input: 'a', expected_output: 'X', actual_output: 'leaked' },
				{ input: 'b', expected_output: 'Y', actual_output: null },
				{ input: 'c', expected_output: 'Z', actual_output: null },
			],
			dataTableColumns: baseColumns,
			sidecar: sidecar(),
			requestedRowCount: 3,
		});

		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'reserved_cell_populated',
					column: 'actual_output',
					rowIndex: 0,
				}),
			]),
		);
	});

	it('runs the LLM judge for each declared semantic criterion', async () => {
		const judge = jest.fn<ReturnType<SemanticJudgeFn>, Parameters<SemanticJudgeFn>>(
			async ({ column }) => {
				await Promise.resolve();
				if (column === 'input') {
					return { failures: [{ rowIndex: 1, reason: 'not a question' }] };
				}
				return { failures: [] };
			},
		);

		const result = await verifyDataset(
			{
				rows: [
					{ input: 'What is X?', expected_output: 'X', actual_output: null },
					{ input: 'banana', expected_output: 'Y', actual_output: null },
					{ input: 'When?', expected_output: 'Z', actual_output: null },
				],
				dataTableColumns: baseColumns,
				sidecar: sidecar({
					semanticCriteria: [
						{ column: 'input', criterion: 'Each input is a question.', allowEmpty: false },
						{ column: 'expected_output', criterion: 'Each output is a label.', allowEmpty: false },
					],
				}),
				requestedRowCount: 3,
			},
			{ judge },
		);

		expect(judge).toHaveBeenCalledTimes(2);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'semantic_criterion_failed',
					column: 'input',
					rowIndex: 1,
				}),
			]),
		);
		expect(result.passed).toBe(false);
	});

	it('skips empty values when judge criterion does not allow empty', async () => {
		const judge = jest.fn<ReturnType<SemanticJudgeFn>, Parameters<SemanticJudgeFn>>(
			async ({ samples }) => {
				await Promise.resolve();
				expect(samples.map((sample) => sample.rowIndex)).toEqual([0, 2]);
				return { failures: [] };
			},
		);

		await verifyDataset(
			{
				rows: [
					{ input: 'a', expected_output: 'X', actual_output: null },
					{ input: 'a', expected_output: '', actual_output: null },
					{ input: 'b', expected_output: 'Z', actual_output: null },
				],
				dataTableColumns: baseColumns,
				sidecar: sidecar({
					semanticCriteria: [
						{ column: 'expected_output', criterion: 'Output is a label.', allowEmpty: false },
					],
				}),
				requestedRowCount: 3,
			},
			{ judge },
		);
	});
});

import type {
	DatasetFinding,
	DatasetVerifierInput,
	DatasetVerifierOptions,
	DatasetVerifierResult,
} from './types';

const SYSTEM_COLUMN_NAMES = new Set(['id', 'createdAt', 'updatedAt']);

export async function verifyDataset(
	input: DatasetVerifierInput,
	options: DatasetVerifierOptions = {},
): Promise<DatasetVerifierResult> {
	const findings: DatasetFinding[] = [];

	findings.push(...verifyRowCount(input));
	findings.push(...verifyColumns(input));
	findings.push(...verifyCellPopulation(input));

	if (options.judge) {
		findings.push(...(await verifySemantic(input, options.judge)));
	}

	const passed = findings.every((finding) => finding.severity !== 'error');
	return {
		passed,
		findings,
		rowCount: input.rows.length,
	};
}

function verifyRowCount(input: DatasetVerifierInput): DatasetFinding[] {
	const findings: DatasetFinding[] = [];
	const { rows, sidecar, requestedRowCount } = input;

	if (rows.length < sidecar.minRowCount) {
		findings.push({
			severity: 'error',
			code: 'row_count_below_minimum',
			message: `Dataset contains ${rows.length} rows, expected at least ${sidecar.minRowCount}.`,
		});
	}

	if (rows.length < requestedRowCount) {
		findings.push({
			severity: 'warning',
			code: 'row_count_below_request',
			message: `Dataset contains ${rows.length} rows, fewer than the requested ${requestedRowCount}.`,
		});
	}

	return findings;
}

function verifyColumns(input: DatasetVerifierInput): DatasetFinding[] {
	const findings: DatasetFinding[] = [];
	const expected = new Map(input.sidecar.columns.map((column) => [column.name, column.type]));
	const actual = new Map(
		input.dataTableColumns
			.filter((column) => !SYSTEM_COLUMN_NAMES.has(column.name))
			.map((column) => [column.name, column.type]),
	);

	for (const [name, type] of expected) {
		const actualType = actual.get(name);
		if (actualType === undefined) {
			findings.push({
				severity: 'error',
				code: 'missing_column',
				message: `Expected DataTable column "${name}" was not present.`,
				column: name,
			});
			continue;
		}
		if (actualType !== type) {
			findings.push({
				severity: 'error',
				code: 'column_type_mismatch',
				message: `Column "${name}" has type "${actualType}", expected "${type}".`,
				column: name,
			});
		}
	}

	for (const [name] of actual) {
		if (!expected.has(name)) {
			findings.push({
				severity: 'warning',
				code: 'unexpected_column',
				message: `DataTable contains an unexpected column "${name}".`,
				column: name,
			});
		}
	}

	return findings;
}

function verifyCellPopulation(input: DatasetVerifierInput): DatasetFinding[] {
	const findings: DatasetFinding[] = [];
	const { rows, sidecar } = input;

	const requiredColumns = new Set([...sidecar.inputColumns, ...sidecar.expectedOutputColumns]);
	const mustBeEmptyColumns = new Set(sidecar.actualOutputColumns);

	rows.forEach((row, rowIndex) => {
		for (const column of requiredColumns) {
			if (isEmptyCell(row[column])) {
				findings.push({
					severity: 'error',
					code: 'required_cell_empty',
					message: `Row ${rowIndex} has an empty value in required column "${column}".`,
					column,
					rowIndex,
				});
			}
		}
		for (const column of mustBeEmptyColumns) {
			if (!isEmptyCell(row[column])) {
				findings.push({
					severity: 'error',
					code: 'reserved_cell_populated',
					message: `Row ${rowIndex} populated reserved column "${column}" — it must be filled by eval runs only.`,
					column,
					rowIndex,
				});
			}
		}
	});

	return findings;
}

async function verifySemantic(
	input: DatasetVerifierInput,
	judge: NonNullable<DatasetVerifierOptions['judge']>,
): Promise<DatasetFinding[]> {
	const findings: DatasetFinding[] = [];

	for (const criterion of input.sidecar.semanticCriteria) {
		const samples = collectSamples(input.rows, criterion.column, criterion.allowEmpty);
		if (samples.length === 0) continue;

		const verdict = await judge({
			column: criterion.column,
			criterion: criterion.criterion,
			samples,
		});

		for (const failure of verdict.failures) {
			findings.push({
				severity: 'error',
				code: 'semantic_criterion_failed',
				message: `Row ${failure.rowIndex} failed criterion "${criterion.criterion}" on column "${criterion.column}": ${failure.reason}`,
				column: criterion.column,
				rowIndex: failure.rowIndex,
			});
		}
	}

	return findings;
}

function collectSamples(
	rows: DatasetVerifierInput['rows'],
	column: string,
	allowEmpty: boolean,
): Array<{ rowIndex: number; value: unknown }> {
	const samples: Array<{ rowIndex: number; value: unknown }> = [];
	rows.forEach((row, rowIndex) => {
		const value = row[column];
		if (!allowEmpty && isEmptyCell(value)) {
			return;
		}
		samples.push({ rowIndex, value });
	});
	return samples;
}

function isEmptyCell(value: unknown): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === 'string' && value.trim().length === 0) return true;
	return false;
}

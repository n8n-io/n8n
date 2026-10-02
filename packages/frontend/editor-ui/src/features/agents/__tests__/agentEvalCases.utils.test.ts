import { describe, expect, it } from 'vitest';

import {
	isDataTableDataset,
	resolveCaseColumns,
	toAgentEvalCase,
	toAgentEvalCases,
	toCaseSource,
	toDataTableRow,
	type AgentEvalCaseColumns,
} from '../utils/agentEvalCases.utils';
import type { AgentEvalDatasetRecord, AgentEvalDataTableDataset } from '../agentEvals.types';

const columns: AgentEvalCaseColumns = { input: 'input', whatToCheck: 'criteria' };

const datasetBase = {
	id: 'dataset-1',
	name: 'Test cases',
	description: null,
	agentId: 'agent-1',
	columnMapping: { input: 'input', criteria: 'criteria' },
	createdById: 'user-1',
	createdAt: '2026-08-05T00:00:00.000Z',
	updatedAt: '2026-08-05T00:00:00.000Z',
};

const dataTableDataset = {
	...datasetBase,
	datasetSource: 'data_table',
	datasetRef: { dataTableId: 'table-1' },
} as AgentEvalDatasetRecord;

const googleSheetsDataset = {
	...datasetBase,
	datasetSource: 'google_sheets',
	datasetRef: { credentialId: 'cred-1', spreadsheetId: 'sheet-1', sheetName: 'Cases' },
} as AgentEvalDatasetRecord;

describe('agentEvalCases.utils', () => {
	describe('resolveCaseColumns', () => {
		it('returns null for a null mapping', () => {
			expect(resolveCaseColumns(null)).toBeNull();
		});

		it('resolves both columns from a full mapping', () => {
			expect(resolveCaseColumns({ input: 'request', criteria: 'check' })).toEqual({
				input: 'request',
				whatToCheck: 'check',
			});
		});

		it('resolves a mapping with no criteria column to a null check column', () => {
			expect(resolveCaseColumns({ input: 'request' })).toEqual({
				input: 'request',
				whatToCheck: null,
			});
		});

		// Nothing in `agentEvalColumnMappingSchema` forbids naming one column for two
		// roles, and writing both fields there would let the check overwrite the request.
		it('treats a criteria that aliases the input column as absent', () => {
			expect(resolveCaseColumns({ input: 'text', criteria: 'text' })).toEqual({
				input: 'text',
				whatToCheck: null,
			});
		});

		it('ignores an expectedOutput column, which the cases view does not read', () => {
			expect(resolveCaseColumns({ input: 'request', expectedOutput: 'answer' })).toEqual({
				input: 'request',
				whatToCheck: null,
			});
		});
	});

	describe('isDataTableDataset', () => {
		it('accepts a data table dataset', () => {
			expect(isDataTableDataset(dataTableDataset)).toBe(true);
		});

		it('rejects a google sheets dataset', () => {
			expect(isDataTableDataset(googleSheetsDataset)).toBe(false);
		});
	});

	describe('toCaseSource', () => {
		it('bundles the dataset id, its table and its resolved columns', () => {
			expect(toCaseSource(dataTableDataset as AgentEvalDataTableDataset)).toEqual({
				datasetId: 'dataset-1',
				dataTableId: 'table-1',
				columns: { input: 'input', whatToCheck: 'criteria' },
			});
		});

		it('returns null when the mapping names no input column, so callers fall back to read-only', () => {
			const unmapped = { ...datasetBase, columnMapping: null } as AgentEvalDataTableDataset;
			expect(toCaseSource(unmapped)).toBeNull();
		});
	});

	describe('toAgentEvalCase', () => {
		it('maps a row through the resolved columns', () => {
			expect(
				toAgentEvalCase({ id: 7, input: 'Plan a trip', criteria: 'Asks for dates' }, columns),
			).toEqual({ rowId: 7, input: 'Plan a trip', whatToCheck: 'Asks for dates' });
		});

		it('returns null for a row with no numeric id, which could not be saved back', () => {
			expect(
				toAgentEvalCase({ input: 'Plan a trip', criteria: 'Asks for dates' }, columns),
			).toBeNull();
		});

		it('leaves the check empty when the dataset maps no criteria column', () => {
			const mapped = toAgentEvalCase(
				{ id: 1, input: 'Plan a trip', criteria: 'ignored' },
				{
					input: 'input',
					whatToCheck: null,
				},
			);
			expect(mapped).toEqual({ rowId: 1, input: 'Plan a trip', whatToCheck: '' });
		});

		it('renders non-string cells as text', () => {
			const mapped = toAgentEvalCase({ id: 1, input: 42, criteria: true }, columns);
			expect(mapped).toEqual({ rowId: 1, input: '42', whatToCheck: 'true' });
		});

		it('renders a date cell as an ISO string', () => {
			const mapped = toAgentEvalCase(
				{ id: 1, input: new Date('2026-08-05T12:00:00.000Z'), criteria: null },
				columns,
			);
			expect(mapped).toEqual({
				rowId: 1,
				input: '2026-08-05T12:00:00.000Z',
				whatToCheck: '',
			});
		});

		it('renders a missing column as empty rather than "undefined"', () => {
			expect(toAgentEvalCase({ id: 1 }, columns)).toEqual({
				rowId: 1,
				input: '',
				whatToCheck: '',
			});
		});
	});

	describe('toAgentEvalCases', () => {
		it('maps rows in order', () => {
			const cases = toAgentEvalCases(
				[
					{ id: 1, input: 'first', criteria: 'a' },
					{ id: 2, input: 'second', criteria: 'b' },
				],
				columns,
			);
			expect(cases.map((c) => c.rowId)).toEqual([1, 2]);
		});

		it('drops rows with no numeric id instead of rendering unsaveable cases', () => {
			const cases = toAgentEvalCases(
				[
					{ id: 1, input: 'first', criteria: 'a' },
					{ input: 'orphan', criteria: 'b' },
				],
				columns,
			);
			expect(cases).toHaveLength(1);
			expect(cases[0].input).toBe('first');
		});

		it('returns an empty list for no rows', () => {
			expect(toAgentEvalCases([], columns)).toEqual([]);
		});
	});

	describe('toDataTableRow', () => {
		it('writes only the mapped columns', () => {
			expect(
				toDataTableRow({ input: 'Plan a trip', whatToCheck: 'Asks for dates' }, columns),
			).toEqual({ input: 'Plan a trip', criteria: 'Asks for dates' });
		});

		it('omits the check column when the dataset maps none', () => {
			expect(
				toDataTableRow(
					{ input: 'Plan a trip', whatToCheck: 'dropped' },
					{
						input: 'input',
						whatToCheck: null,
					},
				),
			).toEqual({ input: 'Plan a trip' });
		});

		it('cannot overwrite the request when both roles name one column', () => {
			const columns = resolveCaseColumns({ input: 'text', criteria: 'text' });
			expect(columns).not.toBeNull();

			expect(toDataTableRow({ input: 'the request', whatToCheck: 'the check' }, columns!)).toEqual({
				text: 'the request',
			});
		});

		it("uses the dataset's own column names rather than the generated defaults", () => {
			expect(
				toDataTableRow(
					{ input: 'Plan a trip', whatToCheck: 'Asks for dates' },
					{
						input: 'request',
						whatToCheck: 'check',
					},
				),
			).toEqual({ request: 'Plan a trip', check: 'Asks for dates' });
		});
	});
});

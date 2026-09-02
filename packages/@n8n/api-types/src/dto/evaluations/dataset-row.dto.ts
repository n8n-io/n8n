import { z } from 'zod';

import type { dataTableColumnTypeSchema } from '../../schemas/data-table.schema';

/**
 * Where a data table column's value is sourced from when turning an execution
 * into a dataset row: `input` = data that flowed into the evaluation's start
 * node, `output` = data the end node produced.
 */
export const datasetFieldSourceSchema = z.enum(['input', 'output']);
export type DatasetFieldSource = z.infer<typeof datasetFieldSourceSchema>;

/**
 * Mapping for a single column. `null` leaves the column empty for the user to
 * fill in later.
 */
export const datasetColumnMappingSchema = z
	.object({
		source: datasetFieldSourceSchema,
		field: z.string().min(1),
	})
	.nullable();
export type DatasetColumnMapping = z.infer<typeof datasetColumnMappingSchema>;

export const addDatasetRowSchema = z.object({
	executionId: z.string().min(1),
	// Keyed by data table column name.
	mapping: z.record(z.string(), datasetColumnMappingSchema),
});
export type AddDatasetRowDto = z.infer<typeof addDatasetRowSchema>;

// ---------------------------------------------------------------------------
// Response shapes (not request-validated — plain interfaces).
// ---------------------------------------------------------------------------

export interface DatasetColumnCandidate {
	name: string;
	type: z.infer<typeof dataTableColumnTypeSchema>;
}

/** A field available on the execution, with a sample of its value for preview. */
export interface DatasetCandidateField {
	key: string;
	sample: unknown;
}

export interface DatasetCandidateResponse {
	dataTableId: string;
	columns: DatasetColumnCandidate[];
	fields: {
		inputs: DatasetCandidateField[];
		outputs: DatasetCandidateField[];
	};
	/** Auto-suggested mapping keyed by column name; `null` means no match found. */
	suggestedMapping: Record<string, DatasetColumnMapping>;
}

/**
 * Stored calls of the former data table write tools resume in the batch tool.
 * Suspended approval cards can outlive a deploy, so turn their old input into
 * a batch with one change.
 */
import {
	DATA_TABLE_WRITE_TOOL_ACTIONS,
	SPLIT_BUILDER_TOOLS,
	isFormerDataTablesTool,
	type DataTableWriteToolAction,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { z } from 'zod';

import type { ChangeDataTablesInput, DataTableChange } from './change-data-tables.schema';
import { WRITE_ACTION_SCHEMAS } from './write-action-schemas';

type LegacyWriteInput = z.infer<(typeof WRITE_ACTION_SCHEMAS)[DataTableWriteToolAction]>;

/** Former names of the multi-action tool. Its stored calls carry `action`. */
export const FORMER_DATA_TABLES_TOOL_NAMES =
	Object.keys(SPLIT_BUILDER_TOOLS).filter(isFormerDataTablesTool);

function isWriteAction(action: unknown): action is DataTableWriteToolAction {
	return DATA_TABLE_WRITE_TOOL_ACTIONS.some((known) => known === action);
}

/**
 * The actions whose old shape the input can have. A call of the former
 * multi-action tool names its action, so only that shape counts. Otherwise
 * a call with missing fields could match a smaller shape, such as a table delete.
 */
function candidateActions(input: Record<string, unknown>): readonly DataTableWriteToolAction[] {
	if (input.action === undefined) return DATA_TABLE_WRITE_TOOL_ACTIONS;
	return isWriteAction(input.action) ? [input.action] : [];
}

/** Parse against every candidate shape. Extra keys fail, so at most one shape fits a valid call. */
function parseLegacyInput(input: Record<string, unknown>): LegacyWriteInput | undefined {
	const matches = candidateActions(input).flatMap((action) => {
		const parsed = WRITE_ACTION_SCHEMAS[action].strict().safeParse({ ...input, action });
		return parsed.success ? [parsed.data] : [];
	});
	return matches.length === 1 ? matches[0] : undefined;
}

function toChange(input: LegacyWriteInput): DataTableChange {
	switch (input.action) {
		case 'create':
			return { action: 'create', name: input.name, columns: input.columns };
		case 'delete':
			return { action: 'delete', table: input.dataTableId };
		case 'add-column':
			return {
				action: 'add-column',
				table: input.dataTableId,
				column: input.columnName,
				type: input.type,
			};
		case 'delete-column':
			// The batch accepts a column ID where it accepts a column name.
			return { action: 'delete-column', table: input.dataTableId, column: input.columnId };
		case 'rename-column':
			return {
				action: 'rename-column',
				table: input.dataTableId,
				column: input.columnId,
				newName: input.newName,
			};
		case 'insert-rows':
			return { action: 'insert-rows', table: input.dataTableId, rows: input.rows };
		case 'update-rows':
			return {
				action: 'update-rows',
				table: input.dataTableId,
				filter: input.filter,
				data: input.data,
			};
		case 'delete-rows':
			return { action: 'delete-rows', table: input.dataTableId, filter: input.filter };
	}
}

/**
 * Turns the stored input of a former write tool into a batch with one change.
 * Returns any other input unchanged, so batch validation rejects what fits no
 * old shape or more than one.
 */
export function normalizeLegacyInput(input: unknown): unknown {
	if (!isRecord(input)) return input;
	const legacy = parseLegacyInput(input);
	if (!legacy) return input;
	const batch: ChangeDataTablesInput = { changes: [toChange(legacy)] };
	if (legacy.projectId !== undefined) batch.projectId = legacy.projectId;
	return batch;
}

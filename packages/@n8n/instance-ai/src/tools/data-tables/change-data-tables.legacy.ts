/**
 * Stored calls of the former data table write tools resume in the batch tool.
 * Suspended approval cards can outlive a deploy, so turn their old input into
 * a batch with one change. The runtime calls this only on resume.
 */
import {
	SPLIT_BUILDER_TOOLS,
	getDataTableCallAction,
	isDataTableWriteToolAction,
	isFormerDataTablesTool,
	type DataTableWriteToolAction,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { toJsonValue, type JSONValue } from '@n8n/utils/json/to-json-value';
import type { z } from 'zod';

import type { ChangeDataTablesInput, DataTableChange } from './change-data-tables.schema';
import { WRITE_ACTION_SCHEMAS } from './write-action-schemas';

type LegacyWriteInput = z.infer<(typeof WRITE_ACTION_SCHEMAS)[DataTableWriteToolAction]>;

/** Former names of the multi-action tool. Its stored calls carry `action`. */
export const FORMER_DATA_TABLES_TOOL_NAMES =
	Object.keys(SPLIT_BUILDER_TOOLS).filter(isFormerDataTablesTool);

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
 * The former name picks the action: a per-action tool by its name, the former
 * multi-action tool by `action`. The old shape is parsed like the old tool
 * parsed it, so unknown keys are dropped. Any other input returns unchanged,
 * so batch validation rejects it.
 */
export function convertFormerDataTableCall(formerName: string, input: JSONValue): JSONValue {
	if (!isRecord(input)) return input;
	const action = getDataTableCallAction(formerName, input.action);
	if (!isDataTableWriteToolAction(action)) return input;
	const parsed = WRITE_ACTION_SCHEMAS[action].safeParse({ ...input, action });
	if (!parsed.success) return input;
	const batch: ChangeDataTablesInput = { changes: [toChange(parsed.data)] };
	if (parsed.data.projectId !== undefined) batch.projectId = parsed.data.projectId;
	// The batch comes from stored JSON, so this keeps every value as it is.
	return toJsonValue(batch);
}

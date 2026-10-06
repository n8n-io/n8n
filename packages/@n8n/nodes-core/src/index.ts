import type { Action, Trigger } from '@n8n/node-sdk';
import type { SourcePackage } from '@n8n/node-sdk/registry';
import path from 'node:path';

import { runAgent } from './nodes/ai/actions/agent';
import { classifyText } from './nodes/ai/actions/classify';
import { promptModel } from './nodes/ai/actions/prompt';
import { runJavaScript } from './nodes/code/actions/java-script';
import { runPython } from './nodes/code/actions/python';
import { filterItems } from './nodes/condition/actions/filter';
import { ifCondition } from './nodes/condition/actions/if';
import { switchCases } from './nodes/condition/actions/switch';
import { deleteRows } from './nodes/data-table/actions/row.delete';
import { rowExists } from './nodes/data-table/actions/row.exists';
import { getRows } from './nodes/data-table/actions/row.get';
import { insertRows } from './nodes/data-table/actions/row.insert';
import { updateRows } from './nodes/data-table/actions/row.update';
import { upsertRows } from './nodes/data-table/actions/row.upsert';
import { clearTable } from './nodes/data-table/actions/table.clear';
import { createTable } from './nodes/data-table/actions/table.create';
import { deleteTable } from './nodes/data-table/actions/table.delete';
import { listTables } from './nodes/data-table/actions/table.list';
import { renameTable } from './nodes/data-table/actions/table.rename';
import { extractCsv } from './nodes/extract-from-file/actions/csv';
import { extractJson } from './nodes/extract-from-file/actions/json';
import { extractPdf } from './nodes/extract-from-file/actions/pdf';
import { extractText } from './nodes/extract-from-file/actions/text';
import { extractXlsx } from './nodes/extract-from-file/actions/xlsx';
import { formTrigger } from './nodes/form/actions/trigger';
import { downloadFile } from './nodes/http-request/actions/download';
import { getRequest } from './nodes/http-request/actions/get';
import { sendRequest } from './nodes/http-request/actions/send';
import { aggregateItems } from './nodes/items/actions/aggregate';
import { dateTime } from './nodes/items/actions/date-time';
import { limitItems } from './nodes/items/actions/limit';
import { removeDuplicates } from './nodes/items/actions/remove-duplicates';
import { renameKeys } from './nodes/items/actions/rename-keys';
import { editFields } from './nodes/items/actions/set';
import { sortItems } from './nodes/items/actions/sort';
import { splitOut } from './nodes/items/actions/split-out';
import { summarizeItems } from './nodes/items/actions/summarize';
import { loopBatches } from './nodes/loop/actions/batches';
import { setLoopState } from './nodes/loop-state/actions/set';
import { manualTrigger } from './nodes/manual/actions/trigger';
import { appendItems } from './nodes/merge/actions/append';
import { combineItems } from './nodes/merge/actions/combine';
import { combineByPosition } from './nodes/merge/actions/combine-by-position';
import { passItems } from './nodes/no-op/actions/pass';
import { scheduleTrigger } from './nodes/schedule/actions/trigger';
import { stopWithError } from './nodes/stop-and-error/actions/stop';
import { waitInterval } from './nodes/wait/actions/interval';
import { waitUntil } from './nodes/wait/actions/until';
import { webhookTrigger } from './nodes/webhook/actions/trigger';

// Integration tests run these with their providers and in host checks.
export {
	classifyText,
	dateTime,
	formTrigger,
	getRequest,
	passItems,
	promptModel,
	runAgent,
	scheduleTrigger,
	sendRequest,
	webhookTrigger,
};

/** Every action of the core nodes, one n8n node type each. */
export const actions: readonly Action[] = [
	getRequest,
	sendRequest,
	downloadFile,
	editFields,
	renameKeys,
	dateTime,
	sortItems,
	limitItems,
	removeDuplicates,
	aggregateItems,
	splitOut,
	summarizeItems,
	ifCondition,
	switchCases,
	filterItems,
	insertRows,
	getRows,
	rowExists,
	updateRows,
	upsertRows,
	deleteRows,
	createTable,
	listTables,
	renameTable,
	clearTable,
	deleteTable,
	runJavaScript,
	runPython,
	appendItems,
	combineItems,
	combineByPosition,
	waitInterval,
	waitUntil,
	stopWithError,
	setLoopState,
	promptModel,
	runAgent,
	classifyText,
	extractCsv,
	extractXlsx,
	extractJson,
	extractText,
	extractPdf,
	passItems,
];

/**
 * Core triggers that a legacy node runs. They have no bundle and no node type of this package:
 * the typed flow emits the legacy node with the typed parameters.
 */
export const nativeTriggers: readonly Trigger[] = [webhookTrigger, scheduleTrigger, formTrigger];

/**
 * Native contracts that a construct of the typed flow emits, so no module has a factory for
 * them: `manual()` emits the Manual Trigger, and `forEach` emits Loop Over Items.
 */
export const flowNatives: ReadonlyArray<Action | Trigger> = [manualTrigger, loopBatches];

/** The core nodes: every n8n ships them, and the engine and the flow SDK may name them by type. */
export const nodesCore: SourcePackage = {
	name: '@n8n/nodes-core',
	dir: path.resolve(__dirname, '..'),
	actions,
	triggers: [],
	natives: [...nativeTriggers, ...flowNatives],
};

/**
 * Compiled library node: a hand port of `n8n-nodes-base.googleSheets`
 * version 4.7, operations `sheet.read` (get rows), `sheet.append` (append
 * row), `sheet.update` (update row) and `sheet.appendOrUpdate` (append or
 * update row, versions 4.1 and later, once for all items with `batch`).
 *
 * It sends the same request sequence as the v1 node: the sheet lookup, the
 * sheet data, then the write. Limits: OAuth2 only (no service account), no
 * automatic mapping on update, no sheets in mode `url`. Values are sent as
 * given: the v1 node also converts values to the column schema types.
 *
 * Row filters on read follow versions 4.2 to 4.7. The converter sets
 * `readVersion` for each read, and a read of a version before 4.2 runs in
 * the fallback host.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface Locator {
	__rl?: boolean;
	mode?: string;
	value?: string;
}

interface Columns {
	mappingMode?: string;
	value?: Record<string, unknown> | null;
	matchingColumns?: string[];
	schema?: Array<{ id?: string; type?: string }>;
}

/**
 * The mapped values as n8n's resource mapper gives them (`validateResourceMapperValue`):
 * a null value of a field with a schema type becomes undefined, so the item has no key.
 */
function typedValues(value: Record<string, unknown>, schema: Columns['schema']): Item {
	const typed = (schema ?? []).filter((s) => s.type).map((s) => String(s.id));
	const out: Item = {};
	for (const [key, v] of Object.entries(value)) {
		if ((v === null || v === undefined) && typed.includes(key)) continue;
		out[key] = v;
	}
	return out;
}

interface SheetsOptions {
	dataLocationOnSheet?: {
		values?: {
			rangeDefinition?: string;
			readRowsUntil?: string;
			headerRow?: number | string;
			firstDataRow?: number | string;
			range?: string;
		};
	};
	outputFormatting?: { values?: { general?: string; date?: string } };
	returnFirstMatch?: boolean;
	returnAllMatches?: string;
	cellFormat?: string;
	locationDefine?: { values?: { headerRow?: number | string; firstDataRow?: number | string } };
	handlingExtraData?: string;
	useAppend?: boolean;
}

interface SheetsParameters {
	resource?: string;
	operation?: string;
	authentication?: string;
	documentId?: string | Locator;
	sheetName?: string | Locator;
	filtersUI?: { values?: LookupValue[] };
	combineFilters?: string;
	readVersion?: number;
	/** Append checks the sheet's columns against `columns.schema` (version 4.4 and later). */
	schemaCheck?: boolean;
	columns?: Columns;
	options?: SheetsOptions;
	/** `appendOrUpdate`: the parameters of each input item (v1 runs once for all items). */
	batch?: SheetsParameters[];
}

interface LookupValue {
	lookupColumn?: string;
	lookupValue?: unknown;
}

interface SheetProperties {
	sheetId?: number;
	title?: string;
}

type Cell = unknown;
type Row = Cell[];

const ROW_NUMBER = 'row_number';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** encodeURIComponent, native (spec section 4.3). */
function encodeComponent(text: string): string {
	return encodeURIComponent(text);
}

/** encodeRange of the v1 node: a quoted, encoded sheet name, or an encoded name with a range. */
function encodeRange(range: string): string {
	if (range.includes('!')) {
		const parts = range.split('!');
		return `${encodeComponent(parts[0])}!${parts[1]}`;
	}
	return encodeComponent(`'${range}'`);
}

/** getSpreadsheetId of the v1 node. Mode `url` takes the first run of 25 or more id characters. */
function spreadsheetId(value: string | Locator | undefined): string {
	const mode = typeof value === 'string' ? 'id' : (value?.mode ?? 'id');
	const text = typeof value === 'string' ? value : (value?.value ?? '');
	if (!text) throw new Error(`Can not get sheet with a value of '${text}'`);
	if (mode !== 'url') return text;
	const idChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
	let run = '';
	for (let i = 0; i <= text.length; i++) {
		const ch = text.charAt(i);
		if (i < text.length && idChars.includes(ch)) {
			run += ch;
			continue;
		}
		if (run.length >= 25) return run;
		run = '';
	}
	return '';
}

/** The column letters of a zero-based column index (xlsx `encode_col`). */
function columnLetter(index: number): string {
	let out = '';
	for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
		out = LETTERS.charAt((n - 1) % 26) + out;
	}
	return out;
}

/** A cell value as text, as `toString` gives it for the values that sheets hold. */
function cellText(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(value) ?? '';
}

/** The length of the longest row. */
function longestRow(data: Row[]): number {
	let longest = 0;
	for (const row of data) if (row.length > longest) longest = row.length;
	return longest;
}

/** prepareSheetData of the v1 node, with row numbers. */
function prepareSheetData(
	sheetData: Row[],
	rangeDefinition: string,
	readRowsUntil: string,
	headerRowOption: unknown,
	firstDataRowOption: unknown,
): { data: Row[]; headerRow: number; firstDataRow: number } {
	let headerRow = 0;
	let firstDataRow = 1;
	if (rangeDefinition === 'specifyRange') {
		headerRow = parseInt(String(headerRowOption), 10) - 1;
		firstDataRow = parseInt(String(firstDataRowOption), 10) - 1;
	}
	let data: Row[] = sheetData.map((row, i) => [i + 1, ...row]);
	if (data.length > 0) data[headerRow][0] = ROW_NUMBER;
	if (rangeDefinition === 'detectAutomatically') {
		// removeEmptyColumns
		const longest = longestRow(data);
		const columns: Row[] = [];
		for (let col = 0; col < longest; col++) {
			const column = data.map((row) => row[col]);
			if (column[0] !== '') {
				columns.push(column);
				continue;
			}
			if (column.slice(1).some((cell) => cell || typeof cell === 'number')) columns.push(column);
		}
		data = (columns[0] ?? []).map((_c, i) =>
			columns.map((column) => (column[i] === undefined ? '' : column[i])),
		);
		// trimLeadingEmptyRows
		const first = data.findIndex((row) =>
			row.slice(1).some((cell) => cell || typeof cell === 'number'),
		);
		data = data.slice(first);
		data[0][0] = ROW_NUMBER;
		if (readRowsUntil === 'firstEmptyRow') {
			const empty = data.findIndex((row) => row.slice(1).every((cell) => cell === ''));
			if (empty !== -1) data = data.slice(0, empty);
		} else {
			data = data.filter((row) =>
				row.slice(1).some((cell) => cell || typeof cell === 'number' || typeof cell === 'boolean'),
			);
			data[0][0] = ROW_NUMBER;
		}
	}
	return { data, headerRow, firstDataRow };
}

/** structureArrayDataByColumn of the v1 node. */
function structureByColumn(data: Row[], keyRow: number, dataStartRow: number): Item[] {
	if (keyRow < 0 || dataStartRow < keyRow || keyRow >= data.length) return [];
	const longest = longestRow(data);
	const keys: string[] = [];
	for (let c = 0; c < longest; c++) {
		const header = data[keyRow][c];
		keys.push(header ? cellText(header) : `col_${c}`);
	}
	const out: Item[] = [];
	for (let r = dataStartRow; r < data.length; r++) {
		const item: Item = {};
		for (let c = 0; c < data[r].length; c++) {
			const key = keys[c];
			if (key) item[key] = data[r][c] ?? '';
		}
		if (Object.keys(item).length > 0) out.push(item);
	}
	return out;
}

/** convertObjectArrayToSheetDataArray of the v1 node. */
function toRows(input: Item[], columnNames: Row, emptyValue: string | null): Row[] {
	return input.map((item) =>
		columnNames.map((key) => {
			const value = item[String(key)];
			if (value === undefined || value === null) return emptyValue;
			return typeof value === 'object' ? JSON.stringify(value) : value;
		}),
	);
}

/** The text that `toString` gives, or undefined for null and undefined (`value?.toString()`). */
function lookupText(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (Array.isArray(value)) return value.map((v) => (v === null ? '' : cellText(v))).join(',');
	if (typeof value === 'object') return '[object Object]';
	return cellText(value);
}

/**
 * lookupValues of the v1 node: the rows whose cells equal the filter values,
 * with OR or AND between the filters. Before version 4.6, OR with the first
 * match takes the first match of each filter.
 */
function lookupRows(
	data: Row[],
	keyRow: number,
	dataStartRow: number,
	filters: LookupValue[],
	returnAll: boolean,
	combine: string,
	version: number,
): Item[] {
	if (keyRow < 0 || dataStartRow < keyRow || keyRow >= data.length) {
		throw new Error('The key row does not exist');
	}
	const keys: string[] = [];
	for (let c = 0; c < data[keyRow].length; c++) {
		const header = data[keyRow][c];
		keys.push(header ? cellText(header) : `col_${c}`);
	}
	const rows: Row[] = data.map((row) => {
		const out = row.slice();
		while (out.length < keys.length) out.push('');
		return out;
	});
	const columnOf = (filter: LookupValue): number => {
		const index = keys.indexOf(String(filter.lookupColumn));
		if (index === -1) {
			throw new Error(`The column "${String(filter.lookupColumn)}" could not be found`);
		}
		return index;
	};
	const matches = (row: Row, column: number, filter: LookupValue): boolean =>
		lookupText(row[column]) === lookupText(filter.lookupValue);
	const found: Row[] = [keys];
	const added: number[] = [];
	const add = (r: number) => {
		if (!added.includes(r)) {
			found.push(rows[r]);
			added.push(r);
		}
	};
	if (combine === 'OR') {
		let stop = false;
		for (const filter of filters) {
			if (stop) break;
			const column = columnOf(filter);
			for (let r = dataStartRow; r < rows.length; r++) {
				if (!matches(rows[r], column, filter)) continue;
				add(r);
				if (!returnAll) {
					stop = version >= 4.6;
					break;
				}
			}
		}
	} else {
		for (let r = dataStartRow; r < rows.length; r++) {
			let all = true;
			for (const filter of filters) {
				if (!matches(rows[r], columnOf(filter), filter)) {
					all = false;
					break;
				}
			}
			if (!all) continue;
			add(r);
			if (!returnAll) break;
		}
	}
	// removeEmptyColumns, then convertSheetDataArrayToObjectArray with empty items kept.
	const longest = longestRow(found);
	const columns: Row[] = [];
	for (let c = 0; c < longest; c++) {
		const column = found.map((row) => row[c]);
		if (column[0] !== '') {
			columns.push(column);
			continue;
		}
		if (column.slice(1).some((cell) => cell || typeof cell === 'number')) columns.push(column);
	}
	const table: Row[] = (columns[0] ?? []).map((_c, i) =>
		columns.map((column) => (column[i] === undefined ? '' : column[i])),
	);
	const out: Item[] = [];
	const header = table[0] ?? [];
	for (let r = 1; r < table.length; r++) {
		const item: Item = {};
		for (let c = 0; c < table[r].length; c++) {
			const key = header[c];
			if (key) item[cellText(key)] = table[r][c] ?? '';
		}
		out.push(item);
	}
	return out;
}

function withoutRowNumber(item: Item): Item {
	const out: Item = {};
	for (const key of Object.keys(item)) if (key !== ROW_NUMBER) out[key] = item[key];
	return out;
}

export default defineNode<SheetsParameters>({
	type: 'n8n-nodes-base.googleSheets',
	version: 4.7,
	supports: {
		resource: 'sheet',
		operation: { sheet: 'read' },
		operations: {
			'sheet.read': [
				'authentication',
				'documentId',
				'sheetName',
				'options',
				'options.dataLocationOnSheet',
				'options.outputFormatting',
				'options.returnFirstMatch',
				'options.returnAllMatches',
				'filtersUI',
				'filtersUI.values',
				'combineFilters',
				'readVersion',
			],
			'sheet.append': [
				'authentication',
				'documentId',
				'sheetName',
				'schemaCheck',
				'columns',
				'columns.mappingMode',
				'columns.value',
				'columns.schema',
				'columns.matchingColumns',
				'columns.attemptToConvertTypes',
				'columns.convertFieldsToString',
				'options',
				'options.cellFormat',
				'options.locationDefine',
				'options.handlingExtraData',
				'options.useAppend',
				'batch',
			],
			'sheet.appendOrUpdate': [
				'authentication',
				'documentId',
				'sheetName',
				'schemaCheck',
				'columns',
				'columns.mappingMode',
				'columns.value',
				'columns.schema',
				'columns.matchingColumns',
				'columns.attemptToConvertTypes',
				'columns.convertFieldsToString',
				'options',
				'options.cellFormat',
				'options.locationDefine',
				'options.handlingExtraData',
				'options.useAppend',
				'options.valueRenderMode',
				'batch',
			],
			'sheet.update': [
				'authentication',
				'documentId',
				'sheetName',
				'columns',
				'columns.mappingMode',
				'columns.value',
				'columns.schema',
				'columns.matchingColumns',
				'columns.attemptToConvertTypes',
				'columns.convertFieldsToString',
				'options',
				'options.cellFormat',
				'options.locationDefine',
			],
		},
	},
	async run(ctx, call, items, credential) {
		// A batched call (`appendOrUpdate`) has the parameters of each item in `batch`: the
		// sheet and the options are those of item 0, as v1 reads them.
		const parameters: SheetsParameters =
			call.batch !== undefined && call.batch.length > 0
				? { ...call.batch[0], batch: call.batch }
				: call;
		const resource = parameters.resource ?? 'sheet';
		const operation = parameters.operation ?? 'read';
		if (
			resource !== 'sheet' ||
			!['read', 'append', 'update', 'appendOrUpdate'].includes(operation)
		) {
			throw new Error(`Google Sheets: ${resource}.${operation} is not in the compiled library`);
		}
		if ((parameters.authentication ?? 'oAuth2') !== 'oAuth2') {
			throw new Error('Google Sheets: only OAuth2 authentication is in the compiled library');
		}
		const base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId(parameters.documentId)}`;
		const headers = { 'Content-Type': 'application/json' };
		const fail = (status: number) => new Error(`Google Sheets: HTTP status ${status}`);

		// spreadsheetGetSheet of the v1 node.
		const sheetParam = parameters.sheetName;
		const sheetMode = typeof sheetParam === 'string' ? undefined : sheetParam?.mode;
		const sheetValue = typeof sheetParam === 'string' ? sheetParam : (sheetParam?.value ?? '');
		if (sheetMode === 'url') {
			throw new Error(
				'Google Sheets: a sheet in mode "url" is not in the compiled library. Use mode "id" or "name".',
			);
		}
		const meta = await ctx.http<{ sheets?: Array<{ properties?: SheetProperties }> }>({
			method: 'GET',
			url: base,
			headers,
			qs: { fields: 'sheets.properties' },
			body: undefined,
			credential,
		});
		if (meta.status >= 400) throw fail(meta.status);
		const wantedId = sheetValue === 'gid=0' ? 0 : parseInt(sheetValue, 10);
		const found = (meta.body.sheets ?? []).find((s) =>
			sheetMode === 'name'
				? s.properties?.title === sheetValue
				: s.properties?.sheetId === wantedId,
		);
		const title = found?.properties?.title;
		if (!title) {
			throw new Error(`Sheet with ${sheetMode === 'name' ? 'name' : 'ID'} ${sheetValue} not found`);
		}
		const sheetId = String(found?.properties?.sheetId);
		const inputs = items ?? [{}];
		const options = parameters.options ?? {};
		const out: Item[] = [];

		if (operation === 'read') {
			const filters = parameters.filtersUI?.values ?? [];
			const version = parameters.readVersion ?? 4.7;
			const returnAll =
				version < 4.5
					? options.returnAllMatches === 'returnAllMatches'
					: options.returnFirstMatch !== true;
			const combine = parameters.combineFilters ?? (version >= 4.3 ? 'AND' : 'OR');
			const location = options.dataLocationOnSheet?.values;
			const rangeDefinition = location ? (location.rangeDefinition ?? '') : 'detectAutomatically';
			const range =
				rangeDefinition === 'specifyRangeA1' && location?.range
					? `${title}!${location.range}`
					: title;
			const format = options.outputFormatting?.values ?? {};
			// Version 4.2 and later read once for each input item.
			for (const _item of inputs) {
				const response = await ctx.http<{ values?: Row[] }>({
					method: 'GET',
					url: `${base}/values/${encodeRange(range)}`,
					headers,
					qs: {
						valueRenderOption: format.general || 'UNFORMATTED_VALUE',
						dateTimeRenderOption: format.date || 'FORMATTED_STRING',
					},
					body: undefined,
					credential,
				});
				if (response.status >= 400) throw fail(response.status);
				const values = response.body.values;
				if (values === undefined || values.length === 0) continue;
				const prepared = prepareSheetData(
					values,
					rangeDefinition,
					location?.readRowsUntil ?? 'lastRowInSheet',
					location?.headerRow ?? 1,
					location?.firstDataRow ?? 2,
				);
				const rows =
					filters.length > 0
						? lookupRows(
								prepared.data,
								prepared.headerRow,
								prepared.firstDataRow,
								filters,
								returnAll,
								combine,
								version,
							)
						: structureByColumn(prepared.data, prepared.headerRow, prepared.firstDataRow);
				for (const row of rows) out.push(row);
			}
			return out;
		}

		const columns = parameters.columns ?? {};
		const cellFormat = options.cellFormat || 'USER_ENTERED';

		if (operation === 'append') {
			let dataMode = columns.mappingMode ?? 'defineBelow';
			if (inputs.length === 0 || dataMode === 'nothing') return [];
			const headerRowNumber = Number(options.locationDefine?.values?.headerRow || 1);
			const current = await ctx.http<{ values?: Row[] }>({
				method: 'GET',
				url: `${base}/values/${encodeRange(title)}`,
				headers,
				qs: { valueRenderOption: 'FORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
				body: undefined,
				credential,
			});
			if (current.status >= 400) throw fail(current.status);
			const sheetData = current.body.values;
			if (!sheetData?.length) dataMode = 'autoMapInputData';
			const headerRow = sheetData?.[headerRowNumber - 1];
			let input: Item[] = [];
			let columnNames: Row | undefined;
			if (dataMode !== 'autoMapInputData') {
				const schema = columns.schema ?? [];
				// From version 4.4, v1 needs the header row and the schema, and checks the schema
				// against the sheet (checkForSchemaChanges).
				if (parameters.schemaCheck === true) {
					if (headerRow === undefined) {
						throw new Error(`Could not retrieve the column names from row ${headerRowNumber}`);
					}
					if (schema.length === 0) {
						throw new Error(
							'`columns.schema` is required when `columns.mappingMode` is `defineBelow`',
						);
					}
					const live = headerRow.filter((c) => c !== '').map((c) => String(c));
					const ids = schema
						.map((s) => String(s.id))
						.filter((id) => live.includes(ROW_NUMBER) || id !== ROW_NUMBER);
					// v1's message; its description names the missing columns.
					if (ids.some((id) => !live.includes(id))) {
						throw new Error("Column names were updated after the node's setup");
					}
				}
				// A batched call has the values of each item in `batch`.
				const each = parameters.batch ?? inputs.map(() => parameters);
				for (const one of each) {
					const value = (one.columns ?? {}).value ?? {};
					if (Object.keys(value).length === 0) {
						throw new Error("At least one value has to be added under 'Values to Send'");
					}
					input.push(typedValues(value, schema));
				}
				columnNames = headerRow;
			} else {
				// autoMapInputData of the v1 node.
				const handling = options.handlingExtraData || 'insertInNewColumn';
				const location = options.locationDefine?.values;
				const headerAt = location ? parseInt(String(location.headerRow), 10) : 1;
				let names: Row = [];
				if (headerRow) {
					names = headerRow;
				} else {
					const response = await ctx.http<{ values?: Row[] }>({
						method: 'GET',
						url: `${base}/values/${encodeRange(`${title}!${headerAt}:${headerAt}`)}`,
						headers,
						qs: { valueRenderOption: 'FORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
						body: undefined,
						credential,
					});
					if (response.status >= 400) throw fail(response.status);
					names = response.body.values ? response.body.values[0] : [];
				}
				if (handling === 'insertInNewColumn') {
					if (names.length === 0) {
						const first = Object.keys(inputs[0]).filter((k) => k !== ROW_NUMBER);
						const range = `${title}!${headerAt}:${headerAt}`;
						const write = await ctx.http<unknown>({
							method: 'PUT',
							url: `${base}/values/${encodeRange(range)}`,
							headers,
							qs: { valueInputOption: options.cellFormat || 'RAW' },
							body: { range, values: [first] },
							credential,
						});
						if (write.status >= 400) throw fail(write.status);
						names = Object.keys(inputs[0]);
					}
					const added: string[] = [];
					for (const item of inputs) {
						for (const key of Object.keys(item)) {
							if (key !== ROW_NUMBER && !names.includes(key) && !added.includes(key))
								added.push(key);
						}
						input.push(item[ROW_NUMBER] ? withoutRowNumber(item) : item);
					}
					if (added.length > 0) {
						names = names.concat(added);
						const range = `${title}!${headerAt}:${headerAt}`;
						const write = await ctx.http<unknown>({
							method: 'PUT',
							url: `${base}/values/${encodeRange(range)}`,
							headers,
							qs: { valueInputOption: options.cellFormat || 'RAW' },
							body: { range, values: [names] },
							credential,
						});
						if (write.status >= 400) throw fail(write.status);
					}
				} else if (handling === 'ignoreIt') {
					input = [...inputs];
				} else if (handling === 'error') {
					for (const item of inputs) {
						for (const key of Object.keys(item)) {
							if (!names.includes(key)) {
								throw new Error(
									`Unexpected fields in node input: the input field '${key}' doesn't match any column in the Sheet`,
								);
							}
						}
						input.push(item);
					}
				}
				const hint = names.filter((n) => n !== ROW_NUMBER);
				if (hint.length > 0) columnNames = hint;
			}
			if (input.length === 0) return [];
			if (columnNames === undefined) {
				const response = await ctx.http<{ values?: Row[] }>({
					method: 'GET',
					url: `${base}/values/${encodeRange(`${title}!${headerRowNumber}:${headerRowNumber}`)}`,
					headers,
					qs: { valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
					body: undefined,
					credential,
				});
				if (response.status >= 400) throw fail(response.status);
				if (response.body.values === undefined)
					throw new Error('Could not retrieve the column data');
				columnNames = response.body.values[0];
			}
			let lastRow = 0;
			if (options.useAppend) {
				// appendData of the v1 node reads the sheet again to find the last row.
				const again = await ctx.http<{ values?: Row[] }>({
					method: 'GET',
					url: `${base}/values/${encodeRange(title)}`,
					headers,
					qs: { valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
					body: undefined,
					credential,
				});
				if (again.status >= 400) throw fail(again.status);
				lastRow = (again.body.values ?? []).length + 1;
			} else {
				// A trailing empty row must exist, or the update fails.
				const grow = await ctx.http<unknown>({
					method: 'POST',
					url: `${base}:batchUpdate`,
					headers,
					qs: {},
					body: { requests: [{ appendDimension: { sheetId, dimension: 'ROWS', length: 1 } }] },
					credential,
				});
				if (grow.status >= 400) throw fail(grow.status);
				lastRow = (sheetData ?? [{}]).length + 1;
			}
			const rows = toRows(input, columnNames, options.useAppend ? null : '');
			const range = `${title}!${lastRow}:${lastRow + rows.length - 1}`;
			const write = await ctx.http<unknown>({
				method: options.useAppend ? 'POST' : 'PUT',
				url: `${base}/values/${encodeRange(range)}${options.useAppend ? ':append' : ''}`,
				headers,
				qs: { valueInputOption: cellFormat },
				body: { range, values: rows },
				credential,
			});
			if (write.status >= 400) throw fail(write.status);
			return dataMode === 'autoMapInputData' ? [...inputs] : input;
		}

		if (operation === 'appendOrUpdate') {
			// appendOrUpdate.operation.ts of the v1 node: one read of the sheet, the updates of
			// the rows whose key matches, then one append of the other items.
			const each = parameters.batch ?? inputs.map(() => parameters);
			const first = each[0] ?? parameters;
			const firstColumns = first.columns ?? {};
			const firstOptions = first.options ?? {};
			const valueInputMode = firstOptions.cellFormat || 'USER_ENTERED';
			const define = firstOptions.locationDefine?.values;
			const keyRowIndex = define?.headerRow ? parseInt(String(define.headerRow), 10) - 1 : 0;
			const dataStartRowIndex = define?.firstDataRow
				? parseInt(String(define.firstDataRow), 10) - 1
				: 1;
			let dataMode = firstColumns.mappingMode ?? 'defineBelow';
			const read = await ctx.http<{ values?: Row[] }>({
				method: 'GET',
				url: `${base}/values/${encodeRange(title)}`,
				headers,
				qs: { valueRenderOption: 'FORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
				body: undefined,
				credential,
			});
			if (read.status >= 400) throw fail(read.status);
			const sheetData: Row[] = read.body.values ?? [];
			if (sheetData[keyRowIndex] === undefined && dataMode !== 'autoMapInputData') {
				if (sheetData.length === 0) {
					dataMode = 'autoMapInputData';
				} else {
					throw new Error(`Could not retrieve the column names from row ${keyRowIndex + 1}`);
				}
			}
			let names: string[] = (sheetData[keyRowIndex] ?? []).map((c) => String(c));
			if (first.schemaCheck === true) {
				// checkForSchemaChanges of the v1 node, from version 4.4.
				const live = names.filter((c) => c !== '');
				const ids = (firstColumns.schema ?? [])
					.map((f) => String(f.id))
					.filter((id) => live.includes(ROW_NUMBER) || id !== ROW_NUMBER);
				// v1's message; its description names the missing columns.
				if (ids.some((id) => !live.includes(id))) {
					throw new Error("Column names were updated after the node's setup");
				}
			}
			const matching = firstColumns.matchingColumns ?? [];
			if (!Array.isArray(matching) || matching.length === 0) {
				throw new Error(
					'`columns.matchingColumns` is required for the Append or Update Row operation',
				);
			}
			const indexKey = matching[0];
			// getColumnValues: the key column of the rows after the header.
			const keyIndex = names.indexOf(indexKey);
			const keyValues = sheetData
				.slice(dataStartRowIndex - 1)
				.map((row) => row[keyIndex])
				.slice(1);
			const updates: Array<{ range: string; values: Cell[][] }> = [];
			const appends: Item[] = [];
			const mapped: Item[] = [];
			const handling = firstOptions.handlingExtraData || 'insertInNewColumn';
			for (let i = 0; i < inputs.length; i++) {
				if (dataMode === 'nothing') continue;
				const item = inputs[i];
				let entry: Item;
				const added: string[] = [];
				if (dataMode === 'autoMapInputData') {
					for (const key of Object.keys(item)) {
						if (handling === 'error' && !names.includes(key)) {
							throw new Error('Unexpected fields in node input');
						}
						if (
							handling === 'insertInNewColumn' &&
							!names.includes(key) &&
							key !== ROW_NUMBER &&
							!added.includes(key)
						) {
							added.push(key);
						}
					}
					entry = item;
				} else {
					const value: Item = { ...((each[i] ?? first).columns?.value ?? {}) };
					const matchValue = indexKey in value ? value[indexKey] : '';
					if (matchValue === '') {
						throw new Error("The 'Column to Match On' parameter is required");
					}
					if (Object.keys(value).length === 0) {
						throw new Error("At least one value has to be added under 'Values to Send'");
					}
					for (const key of Object.keys(value)) {
						if (value[key] === undefined || value[key] === null) value[key] = '';
					}
					entry = value;
					mapped.push(value);
				}
				if (added.length > 0) {
					// The new columns go into the header row at once (sheet.updateRows).
					names = names.concat(added);
					const range = `${title}!${keyRowIndex + 1}:${keyRowIndex + 1}`;
					const write = await ctx.http<unknown>({
						method: 'PUT',
						url: `${base}/values/${encodeRange(range)}`,
						headers,
						qs: { valueInputOption: valueInputMode },
						body: { range, values: [names] },
						credential,
					});
					if (write.status >= 400) throw fail(write.status);
					sheetData[keyRowIndex] = names;
				}
				// prepareDataForUpdateOrUpsert with upsert: an item without a matching row is appended.
				const key = entry[indexKey];
				const wanted = lookupText(key);
				let found = -1;
				if (wanted !== undefined) {
					for (let r = 0; r < keyValues.length; r++) {
						if (lookupText(keyValues[r]) === wanted) {
							found = r;
							break;
						}
					}
				}
				if (found === -1) {
					appends.push(entry);
					continue;
				}
				const row = found + dataStartRowIndex + 1;
				for (const name of names) {
					if (name === indexKey) continue;
					const cell = entry[name];
					if (cell === undefined || cell === null) continue;
					updates.push({
						range: `${title}!${columnLetter(names.indexOf(name))}${row}`,
						values: [[typeof cell === 'object' ? JSON.stringify(cell) : cell]],
					});
				}
			}
			if (updates.length > 0) {
				const write = await ctx.http<unknown>({
					method: 'POST',
					url: `${base}/values:batchUpdate`,
					headers,
					qs: {},
					body: { data: updates, valueInputOption: valueInputMode },
					credential,
				});
				if (write.status >= 400) throw fail(write.status);
			}
			if (appends.length > 0) {
				const lastRow = sheetData.length + 1;
				if (!firstOptions.useAppend) {
					const grow = await ctx.http<unknown>({
						method: 'POST',
						url: `${base}:batchUpdate`,
						headers,
						qs: {},
						body: { requests: [{ appendDimension: { sheetId, dimension: 'ROWS', length: 1 } }] },
						credential,
					});
					if (grow.status >= 400) throw fail(grow.status);
				}
				const rows = toRows(appends, names, firstOptions.useAppend ? null : '');
				const range = `${title}!${lastRow}:${lastRow + rows.length - 1}`;
				const write = await ctx.http<unknown>({
					method: firstOptions.useAppend ? 'POST' : 'PUT',
					url: `${base}/values/${encodeRange(range)}${firstOptions.useAppend ? ':append' : ''}`,
					headers,
					qs: { valueInputOption: valueInputMode },
					body: { range, values: rows },
					credential,
				});
				if (write.status >= 400) throw fail(write.status);
			}
			return dataMode === 'autoMapInputData' ? [...inputs] : mapped;
		}

		// operation === 'update'
		const location = options.locationDefine?.values;
		const keyRowIndex = location?.headerRow ? parseInt(String(location.headerRow), 10) - 1 : 0;
		const dataStartRowIndex = location?.firstDataRow
			? parseInt(String(location.firstDataRow), 10) - 1
			: 1;
		const current = await ctx.http<{ values?: Row[] }>({
			method: 'GET',
			url: `${base}/values/${encodeRange(title)}`,
			headers,
			qs: { valueRenderOption: 'FORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
			body: undefined,
			credential,
		});
		if (current.status >= 400) throw fail(current.status);
		const sheetData = current.body.values;
		if (sheetData?.[keyRowIndex] === undefined) {
			throw new Error(`Could not retrieve the column names from row ${keyRowIndex + 1}`);
		}
		const columnNames = sheetData[keyRowIndex].map((c) => String(c));
		const matching = columns.matchingColumns ?? [];
		if (matching.length === 0) {
			throw new Error('`columns.matchingColumns` is required for the Update Row operation');
		}
		const indexKey = matching[0];
		if ((columns.mappingMode ?? 'defineBelow') !== 'defineBelow') {
			throw new Error(
				'Google Sheets: update with automatic mapping is not in the compiled library',
			);
		}
		if (indexKey === ROW_NUMBER) {
			// prepareDataForUpdatingByRowNumber of the v1 node: each column of the header row
			// that the item sets, in the row that `row_number` names.
			const byRow: Array<{ range: string; values: Cell[][] }> = [];
			const rowMapped: Item[] = [];
			for (const _item of inputs) {
				const value: Item = { ...(columns.value ?? {}) };
				if (value[ROW_NUMBER] === undefined || value[ROW_NUMBER] === null) {
					throw new Error('row_number is null or undefined');
				}
				if (value[ROW_NUMBER] === '')
					throw new Error("The 'Column to Match On' parameter is required");
				for (const key of Object.keys(value)) {
					if (value[key] === undefined || value[key] === null) value[key] = '';
				}
				rowMapped.push(value);
				for (let c = 0; c < columnNames.length; c++) {
					const name = columnNames[c];
					if (name === ROW_NUMBER) continue;
					const cell = value[name];
					if (cell === undefined || cell === null) continue;
					byRow.push({
						range: `${title}!${columnLetter(c)}${cellText(value[ROW_NUMBER])}`,
						values: [[typeof cell === 'object' ? JSON.stringify(cell) : cell]],
					});
				}
			}
			if (byRow.length === 0) return [];
			const written = await ctx.http<unknown>({
				method: 'POST',
				url: `${base}/values:batchUpdate`,
				headers,
				qs: {},
				body: { data: byRow, valueInputOption: cellFormat },
				credential,
			});
			if (written.status >= 400) throw fail(written.status);
			return rowMapped;
		}
		const keyIndex = columnNames.indexOf(indexKey);
		const keyValues = sheetData
			.slice(dataStartRowIndex - 1)
			.map((row) => row[keyIndex])
			.slice(1);
		const updates: Array<{ range: string; values: Cell[][] }> = [];
		const mapped: Item[] = [];
		for (const _item of inputs) {
			const value: Item = { ...(columns.value ?? {}) };
			// v1 fails on an empty value, and skips an item whose value is null or undefined.
			const matchValue = value[indexKey];
			if (matchValue === '') {
				throw new Error("The 'Column to Match On' parameter is required");
			}
			if (Object.keys(value).length === 0) {
				throw new Error("At least one value has to be added under 'Values to Send'");
			}
			for (const key of Object.keys(value)) {
				if (value[key] === undefined || value[key] === null) value[key] = '';
			}
			mapped.push(value);
			if (matchValue === undefined || matchValue === null) continue;
			// prepareDataForUpdateOrUpsert of the v1 node.
			if (keyIndex === -1) throw new Error(`Could not find column for key "${indexKey}"`);
			const wanted = cellText(value[indexKey]);
			let found = -1;
			for (let i = 0; i < keyValues.length; i++) {
				const cell = keyValues[i];
				if (cell !== undefined && cell !== null && cellText(cell) === wanted) {
					found = i;
					break;
				}
			}
			if (found === -1) continue;
			const row = found + dataStartRowIndex + 1;
			for (let c = 0; c < columnNames.length; c++) {
				const name = columnNames[c];
				if (name === indexKey) continue;
				const cell = value[name];
				if (cell === undefined || cell === null) continue;
				const text = typeof cell === 'object' ? JSON.stringify(cell) : cell;
				updates.push({
					range: `${title}!${columnLetter(columnNames.indexOf(name))}${row}`,
					values: [[text]],
				});
			}
		}
		if (updates.length === 0) return [];
		const write = await ctx.http<unknown>({
			method: 'POST',
			url: `${base}/values:batchUpdate`,
			headers,
			qs: {},
			body: { data: updates, valueInputOption: cellFormat },
			credential,
		});
		if (write.status >= 400) throw fail(write.status);
		return mapped;
	},
});

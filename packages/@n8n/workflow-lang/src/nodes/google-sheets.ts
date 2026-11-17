/**
 * Compiled library node: a hand port of `n8n-nodes-base.googleSheets`
 * version 4.7, operations `sheet.read` (get rows), `sheet.append` (append
 * row), `sheet.update` (update row), `sheet.appendOrUpdate` (append or
 * update row, versions 4.1 and later, once for all items with `batch`),
 * `sheet.clear` and `sheet.delete` (rows or columns; both once for all items).
 *
 * It sends the same request sequence as the v1 node: the sheet lookup, the
 * sheet data, then the write. With a service account, the token of v1 comes
 * from n8n (a minted token), so the node sends no token request. Limits: no
 * automatic mapping on update, no sheets in mode `url`. Values are sent as
 * given: the v1 node also converts values to the column schema types.
 *
 * Row filters on read follow versions 4.2 to 4.7. The converter sets
 * `readVersion` for each read, and a read of a version before 4.2 runs in
 * the fallback host.
 */
import {
	apiError,
	defineNode,
	operationError,
	type FailedResponse,
	type Item,
} from '@n8n/workflow-lang';

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
	clear?: string;
	keepFirstRow?: boolean;
	startIndex?: string | number;
	rowsToDelete?: number;
	columnsToDelete?: number;
	range?: string;
	toDelete?: string;
	numberToDelete?: number;
	/** Append checks the sheet's columns against `columns.schema` (version 4.4 and later). */
	schemaCheck?: boolean;
	/** Append sends the cells as RAW (version 4.0, v1's `cellFormatDefault`). */
	legacyCellFormat?: boolean;
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

/** getColumnNumber of the v1 node: `A` is 1, `AA` is 27. A value that is not text gives 0. */
function columnNumber(position: unknown): number {
	if (typeof position !== 'string') return 0;
	let out = 0;
	for (let k = 0; k < position.length; k++) out = out * 26 + position.charCodeAt(k) - 64;
	return out;
}

/** getColumnName of the v1 node: 1 is `A`, 27 is `AA`. */
function columnName(column: number): string {
	// The characters with the codes 40 to 90: v1 adds a remainder below zero to the code of `A`.
	const chars = '()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	let rest = column;
	let letters = '';
	do {
		rest -= 1;
		letters = chars.charAt(25 + (rest % 26)) + letters;
		rest = Math.trunc(rest / 26);
	} while (rest > 0);
	return letters;
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

/**
 * The token that n8n makes from a Google service account for the scopes of the v1 node
 * (`sheetV2`): the name is `googleMint` of the node compiler for these scopes.
 */
const SHEETS_TOKEN = '{{$credentials.n8nMinted.m116a0d8b.access_token}}';

function schemaChanged(missing: string[]): Error {
	return operationError(
		"Column names were updated after the node's setup",
		`Refresh the columns list in the 'Column to Match On' parameter. Missing columns: ${missing.join(', ')}`,
	);
}

function unexpectedField(key: string): Error {
	return operationError(
		'Unexpected fields in node input',
		`The input field '${key}' doesn't match any column in the Sheet. You can ignore this by changing the 'Handling extra data' field, which you can find under 'Options'.`,
	);
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
				'legacyCellFormat',
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
			'sheet.clear': [
				'authentication',
				'documentId',
				'sheetName',
				'clear',
				'keepFirstRow',
				'startIndex',
				'rowsToDelete',
				'columnsToDelete',
				'range',
				'batch',
			],
			'sheet.delete': [
				'authentication',
				'documentId',
				'sheetName',
				'toDelete',
				'startIndex',
				'numberToDelete',
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
			!['read', 'append', 'update', 'appendOrUpdate', 'clear', 'delete'].includes(operation)
		) {
			throw new Error(`Google Sheets: ${resource}.${operation} is not in the compiled library`);
		}
		const authentication = parameters.authentication ?? 'oAuth2';
		if (authentication !== 'oAuth2' && authentication !== 'serviceAccount') {
			throw new Error(
				'Google Sheets: only OAuth2 and the service account are in the compiled library',
			);
		}
		// With a service account, v1 asks Google for a token and sends it itself. n8n makes that
		// token for the module (the mint of the converter), and the credential adds nothing else
		// to the request.
		const oauth = authentication === 'oAuth2';
		const base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId(parameters.documentId)}`;
		const headers: Record<string, string> = oauth
			? { 'Content-Type': 'application/json' }
			: { 'Content-Type': 'application/json', Authorization: `Bearer ${SHEETS_TOKEN}` };
		// apiRequest of the v1 node: `helpers.request` and `helpers.requestOAuth2`.
		const fail = (response: FailedResponse) => apiError(response, { helper: 'legacy' });

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
			acceptAs: 'legacy',
			json: true,
			method: 'GET',
			url: base,
			headers,
			qs: { fields: 'sheets.properties' },
			body: undefined,
			credential,
			inject: oauth,
		});
		if (meta.status >= 400) throw fail(meta);
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

		if (operation === 'clear' || operation === 'delete') {
			// v1 finds the sheet once, then works through the items with the values of each item.
			const send = async (
				method: string,
				url: string,
				qs: Record<string, unknown>,
				body: unknown,
			) => {
				const response = await ctx.http<{ values?: Row[] }>({
					acceptAs: 'legacy',
					json: true,
					method,
					url,
					headers,
					qs,
					body,
					credential,
					inject: oauth,
				});
				if (response.status >= 400) throw fail(response);
				return response.body;
			};
			for (const p of parameters.batch ?? inputs.map(() => parameters)) {
				if (operation === 'delete') {
					const kind = p.toDelete ?? 'rows';
					const count = p.numberToDelete ?? 1;
					const requests: Item[] = [];
					if (kind === 'rows' || kind === 'columns') {
						const start =
							kind === 'rows'
								? Number(p.startIndex ?? 2) - 1
								: columnNumber(p.startIndex ?? 'A') - 1;
						requests.push({
							deleteDimension: {
								range: {
									sheetId,
									dimension: kind === 'rows' ? 'ROWS' : 'COLUMNS',
									startIndex: start,
									endIndex: count === 1 ? start + 1 : start + count,
								},
							},
						});
					}
					await send('POST', `${base}:batchUpdate`, {}, { requests });
					continue;
				}
				const kind = p.clear ?? 'wholeSheet';
				let range = '';
				if (kind === 'specificRows') {
					const start = Number(p.startIndex ?? 1);
					const count = p.rowsToDelete ?? 1;
					range = `${title}!${start}:${count === 1 ? start : start + count - 1}`;
				}
				if (kind === 'specificColumns') {
					const start = p.startIndex ?? 'A';
					const count = p.columnsToDelete ?? 1;
					const first = columnNumber(start);
					range = `${title}!${String(start)}:${columnName(count === 1 ? first : first + count - 1)}`;
				}
				if (kind === 'specificRange') {
					const field = String(p.range ?? 'A:F');
					range = `${title}!${field.includes('!') ? field.split('!')[1] || '' : field}`;
				}
				if (kind === 'wholeSheet') range = title;
				const clear = `${base}/values/${encodeRange(range)}:clear`;
				const cleared = { spreadsheetId: spreadsheetId(parameters.documentId), range };
				// The option shows only for the whole sheet.
				if (p.keepFirstRow && kind === 'wholeSheet') {
					const first = await send(
						'GET',
						`${base}/values/${encodeRange(`${range}!1:1`)}`,
						{ valueRenderOption: 'FORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
						undefined,
					);
					await send('POST', clear, {}, cleared);
					const row = `${range.split('!')[0]}!1:1`;
					await send(
						'PUT',
						`${base}/values/${encodeRange(row)}`,
						{ valueInputOption: 'RAW' },
						{ range: row, values: first.values },
					);
				} else {
					await send('POST', clear, {}, cleared);
				}
			}
			// A clear gives the input items; a delete gives one item.
			return operation === 'clear' ? inputs : [{ success: true }];
		}

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
					acceptAs: 'legacy',
					json: true,
					method: 'GET',
					url: `${base}/values/${encodeRange(range)}`,
					headers,
					qs: {
						valueRenderOption: format.general || 'UNFORMATTED_VALUE',
						dateTimeRenderOption: format.date || 'FORMATTED_STRING',
					},
					body: undefined,
					credential,
					inject: oauth,
				});
				if (response.status >= 400) throw fail(response);
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
		// v1 sends RAW cells before version 4.1 (`cellFormatDefault`), and USER_ENTERED after it.
		const cellFormat =
			options.cellFormat || (parameters.legacyCellFormat === true ? 'RAW' : 'USER_ENTERED');

		if (operation === 'append') {
			let dataMode = columns.mappingMode ?? 'defineBelow';
			if (inputs.length === 0 || dataMode === 'nothing') return [];
			const headerRowNumber = Number(options.locationDefine?.values?.headerRow || 1);
			const current = await ctx.http<{ values?: Row[] }>({
				acceptAs: 'legacy',
				json: true,
				method: 'GET',
				url: `${base}/values/${encodeRange(title)}`,
				headers,
				qs: { valueRenderOption: 'FORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
				body: undefined,
				credential,
				inject: oauth,
			});
			if (current.status >= 400) throw fail(current);
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
						throw operationError(
							'`columns.schema` is required when `columns.mappingMode` is `defineBelow`',
							'Provide a `columns.schema` array describing each sheet column (`{ id, displayName, required, defaultMatch, display, type, canBeUsedToMatch }` per entry) alongside `columns.value`. Switch to `mappingMode: "autoMapInputData"` and `value: {}` if you want n8n to map input fields to columns by name instead.',
						);
					}
					const live = headerRow.filter((c) => c !== '').map((c) => String(c));
					const ids = schema
						.map((s) => String(s.id))
						.filter((id) => live.includes(ROW_NUMBER) || id !== ROW_NUMBER);
					const missing = ids.filter((id) => !live.includes(id));
					if (missing.length > 0) throw schemaChanged(missing);
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
						acceptAs: 'legacy',
						json: true,
						method: 'GET',
						url: `${base}/values/${encodeRange(`${title}!${headerAt}:${headerAt}`)}`,
						headers,
						qs: { valueRenderOption: 'FORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
						body: undefined,
						credential,
						inject: oauth,
					});
					if (response.status >= 400) throw fail(response);
					names = response.body.values ? response.body.values[0] : [];
				}
				if (handling === 'insertInNewColumn') {
					if (names.length === 0) {
						const first = Object.keys(inputs[0]).filter((k) => k !== ROW_NUMBER);
						const range = `${title}!${headerAt}:${headerAt}`;
						const write = await ctx.http<unknown>({
							acceptAs: 'legacy',
							json: true,
							method: 'PUT',
							url: `${base}/values/${encodeRange(range)}`,
							headers,
							qs: { valueInputOption: options.cellFormat || 'RAW' },
							body: { range, values: [first] },
							credential,
							inject: oauth,
						});
						if (write.status >= 400) throw fail(write);
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
							acceptAs: 'legacy',
							json: true,
							method: 'PUT',
							url: `${base}/values/${encodeRange(range)}`,
							headers,
							qs: { valueInputOption: options.cellFormat || 'RAW' },
							body: { range, values: [names] },
							credential,
							inject: oauth,
						});
						if (write.status >= 400) throw fail(write);
					}
				} else if (handling === 'ignoreIt') {
					input = [...inputs];
				} else if (handling === 'error') {
					for (const item of inputs) {
						for (const key of Object.keys(item)) {
							if (!names.includes(key)) {
								throw unexpectedField(key);
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
					acceptAs: 'legacy',
					json: true,
					method: 'GET',
					url: `${base}/values/${encodeRange(`${title}!${headerRowNumber}:${headerRowNumber}`)}`,
					headers,
					qs: { valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
					body: undefined,
					credential,
					inject: oauth,
				});
				if (response.status >= 400) throw fail(response);
				if (response.body.values === undefined)
					throw new Error('Could not retrieve the column data');
				columnNames = response.body.values[0];
			}
			let lastRow = 0;
			if (options.useAppend) {
				// appendData of the v1 node reads the sheet again to find the last row.
				const again = await ctx.http<{ values?: Row[] }>({
					acceptAs: 'legacy',
					json: true,
					method: 'GET',
					url: `${base}/values/${encodeRange(title)}`,
					headers,
					qs: { valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
					body: undefined,
					credential,
					inject: oauth,
				});
				if (again.status >= 400) throw fail(again);
				lastRow = (again.body.values ?? []).length + 1;
			} else {
				// A trailing empty row must exist, or the update fails.
				const grow = await ctx.http<unknown>({
					acceptAs: 'legacy',
					json: true,
					method: 'POST',
					url: `${base}:batchUpdate`,
					headers,
					qs: {},
					body: { requests: [{ appendDimension: { sheetId, dimension: 'ROWS', length: 1 } }] },
					credential,
					inject: oauth,
				});
				if (grow.status >= 400) throw fail(grow);
				lastRow = (sheetData ?? [{}]).length + 1;
			}
			const rows = toRows(input, columnNames, options.useAppend ? null : '');
			const range = `${title}!${lastRow}:${lastRow + rows.length - 1}`;
			const write = await ctx.http<unknown>({
				acceptAs: 'legacy',
				json: true,
				method: options.useAppend ? 'POST' : 'PUT',
				url: `${base}/values/${encodeRange(range)}${options.useAppend ? ':append' : ''}`,
				headers,
				qs: { valueInputOption: cellFormat },
				body: { range, values: rows },
				credential,
				inject: oauth,
			});
			if (write.status >= 400) throw fail(write);
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
				acceptAs: 'legacy',
				json: true,
				method: 'GET',
				url: `${base}/values/${encodeRange(title)}`,
				headers,
				qs: { valueRenderOption: 'FORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
				body: undefined,
				credential,
				inject: oauth,
			});
			if (read.status >= 400) throw fail(read);
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
				const missing = ids.filter((id) => !live.includes(id));
				if (missing.length > 0) throw schemaChanged(missing);
			}
			const matching = firstColumns.matchingColumns ?? [];
			if (!Array.isArray(matching) || matching.length === 0) {
				throw operationError(
					'`columns.matchingColumns` is required for the Append or Update Row operation',
					'Set `columns.matchingColumns` to a non-empty `string[]` of header names that uniquely identify the row to update (e.g. `["id"]` or `["email"]`). If there is no key column to match on, use the `append` operation instead.',
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
							throw unexpectedField(key);
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
						acceptAs: 'legacy',
						json: true,
						method: 'PUT',
						url: `${base}/values/${encodeRange(range)}`,
						headers,
						qs: { valueInputOption: valueInputMode },
						body: { range, values: [names] },
						credential,
						inject: oauth,
					});
					if (write.status >= 400) throw fail(write);
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
					acceptAs: 'legacy',
					json: true,
					method: 'POST',
					url: `${base}/values:batchUpdate`,
					headers,
					qs: {},
					body: { data: updates, valueInputOption: valueInputMode },
					credential,
					inject: oauth,
				});
				if (write.status >= 400) throw fail(write);
			}
			if (appends.length > 0) {
				const lastRow = sheetData.length + 1;
				if (!firstOptions.useAppend) {
					const grow = await ctx.http<unknown>({
						acceptAs: 'legacy',
						json: true,
						method: 'POST',
						url: `${base}:batchUpdate`,
						headers,
						qs: {},
						body: { requests: [{ appendDimension: { sheetId, dimension: 'ROWS', length: 1 } }] },
						credential,
						inject: oauth,
					});
					if (grow.status >= 400) throw fail(grow);
				}
				const rows = toRows(appends, names, firstOptions.useAppend ? null : '');
				const range = `${title}!${lastRow}:${lastRow + rows.length - 1}`;
				const write = await ctx.http<unknown>({
					acceptAs: 'legacy',
					json: true,
					method: firstOptions.useAppend ? 'POST' : 'PUT',
					url: `${base}/values/${encodeRange(range)}${firstOptions.useAppend ? ':append' : ''}`,
					headers,
					qs: { valueInputOption: valueInputMode },
					body: { range, values: rows },
					credential,
					inject: oauth,
				});
				if (write.status >= 400) throw fail(write);
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
			acceptAs: 'legacy',
			json: true,
			method: 'GET',
			url: `${base}/values/${encodeRange(title)}`,
			headers,
			qs: { valueRenderOption: 'FORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' },
			body: undefined,
			credential,
			inject: oauth,
		});
		if (current.status >= 400) throw fail(current);
		const sheetData = current.body.values;
		if (sheetData?.[keyRowIndex] === undefined) {
			throw new Error(`Could not retrieve the column names from row ${keyRowIndex + 1}`);
		}
		const columnNames = sheetData[keyRowIndex].map((c) => String(c));
		const matching = columns.matchingColumns ?? [];
		if (matching.length === 0) {
			throw operationError(
				'`columns.matchingColumns` is required for the Update Row operation',
				'Set `columns.matchingColumns` to a non-empty `string[]` of header names that uniquely identify the row to update (e.g. `["id"]` or `["email"]`).',
			);
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
					throw operationError(
						'row_number is null or undefined',
						"Since it's being used to determine the row to update, it cannot be null or undefined",
					);
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
				acceptAs: 'legacy',
				json: true,
				method: 'POST',
				url: `${base}/values:batchUpdate`,
				headers,
				qs: {},
				body: { data: byRow, valueInputOption: cellFormat },
				credential,
				inject: oauth,
			});
			if (written.status >= 400) throw fail(written);
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
			acceptAs: 'legacy',
			json: true,
			method: 'POST',
			url: `${base}/values:batchUpdate`,
			headers,
			qs: {},
			body: { data: updates, valueInputOption: cellFormat },
			credential,
			inject: oauth,
		});
		if (write.status >= 400) throw fail(write);
		return mapped;
	},
});

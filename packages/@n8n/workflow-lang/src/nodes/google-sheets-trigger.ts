/**
 * Compiled library poll: a hand port of the `poll` of
 * `n8n-nodes-base.googleSheetsTrigger` (version 1), event `rowAdded` only,
 * for production runs (spec section 9.8). One call polls once and returns
 * the new rows; an empty list means that v1 would return `null`.
 *
 * The cursor lives in the static data of the trigger node, as in v1:
 * `documentId`, `sheetId` and `lastIndexChecked` (the number of data rows
 * seen). The first poll only records the count. A change of document or
 * sheet starts over.
 *
 * The converter adds `pollNode`, the node name. The events `rowUpdate` and
 * `anyUpdate` compare two Drive revisions exported as XLSX, so they run in
 * the fallback host. OAuth2 only (`triggerOAuth2`); sheets in mode `url` run
 * in the host.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface Locator {
	mode?: string;
	value?: string;
}

interface SheetsTriggerParameters {
	authentication?: string;
	event?: string;
	documentId?: string | Locator;
	sheetName?: string | Locator;
	options?: {
		dataLocationOnSheet?: {
			values?: {
				rangeDefinition?: string;
				headerRow?: string | number;
				firstDataRow?: string | number;
				range?: string;
			};
		};
		valueRender?: string;
		dateTimeRenderOption?: string;
	};
	pollNode?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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
	return text;
}

/**
 * The first match of `([a-zA-Z]{1,10})([0-9]{0,10})` in a cell reference, as
 * the v1 node reads it: the column letters and the row digits.
 */
function cellOf(text: string): { col: string; row: string } | undefined {
	const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	for (let i = 0; i < text.length; i++) {
		if (!letters.includes(text.charAt(i))) continue;
		let col = '';
		let j = i;
		while (j < text.length && col.length < 10 && letters.includes(text.charAt(j)))
			col += text.charAt(j++);
		let row = '';
		while (j < text.length && row.length < 10 && '0123456789'.includes(text.charAt(j)))
			row += text.charAt(j++);
		return { col, row };
	}
	return undefined;
}

/** arrayOfArraysToJson of the v1 node: each row as an object keyed by the header row. */
function rowsToJson(rows: unknown[][], columns: string[]): Item[] {
	const out: Item[] = [];
	for (const row of rows) {
		const item: Record<string, unknown> = {};
		for (let c = 0; c < columns.length; c++) item[columns[c]] = row[c] || '';
		out.push(item);
	}
	return out;
}

export default defineNode<SheetsTriggerParameters>({
	type: 'n8n-nodes-base.googleSheetsTrigger',
	version: 1,
	supports: {
		operations: {
			default: [
				'authentication="triggerOAuth2"|"oAuth2"',
				'event="rowAdded"',
				'documentId',
				'sheetName',
				'options',
				'options.dataLocationOnSheet',
				'options.valueRender',
				'options.dateTimeRenderOption',
				'pollNode',
			],
		},
	},
	async run(ctx, parameters, _items, credential) {
		if ((parameters.event ?? 'anyUpdate') !== 'rowAdded') {
			throw new Error(
				'Google Sheets Trigger: only the event "rowAdded" is in the compiled library',
			);
		}
		if ((parameters.authentication ?? 'triggerOAuth2') === 'serviceAccount') {
			throw new Error(
				'Google Sheets Trigger: only OAuth2 authentication is in the compiled library',
			);
		}
		const data = ctx.staticData('node', parameters.pollNode ?? 'Google Sheets Trigger');
		const documentId = spreadsheetId(parameters.documentId);
		const base = `https://sheets.googleapis.com/v4/spreadsheets/${documentId}`;
		const headers = { 'Content-Type': 'application/json' };
		const get = async <T>(url: string, qs: Record<string, unknown>): Promise<T> => {
			const response = await ctx.http<T>({
				method: 'GET',
				url,
				headers,
				qs,
				body: undefined,
				credential,
			});
			if (response.status >= 400) throw new Error(`Google Sheets: HTTP status ${response.status}`);
			return response.body;
		};

		// spreadsheetGetSheet of the v1 node.
		const sheetParam = parameters.sheetName;
		const sheetMode = typeof sheetParam === 'string' ? 'id' : (sheetParam?.mode ?? 'id');
		const sheetValue = typeof sheetParam === 'string' ? sheetParam : (sheetParam?.value ?? '');
		if (sheetMode === 'url') {
			throw new Error(
				'Google Sheets Trigger: a sheet in mode "url" is not in the compiled library',
			);
		}
		const meta = await get<{
			sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
		}>(base, {
			fields: 'sheets.properties',
		});
		const wantedId = sheetValue === 'gid=0' ? 0 : parseInt(sheetValue, 10);
		const found = (meta.sheets ?? []).find((s) =>
			sheetMode === 'name'
				? s.properties?.title === sheetValue
				: s.properties?.sheetId === wantedId,
		);
		const sheetName = found?.properties?.title;
		if (!sheetName) {
			throw new Error(`Sheet with ${sheetMode === 'name' ? 'name' : 'ID'} ${sheetValue} not found`);
		}
		const sheetId = found?.properties?.sheetId;
		const options = parameters.options ?? {};

		if (data.documentId !== documentId || data.sheetId !== sheetId) {
			data.documentId = documentId;
			data.sheetId = sheetId;
			data.lastRevision = undefined;
			data.lastRevisionLink = undefined;
			data.lastIndexChecked = undefined;
		}

		let range = 'A:ZZZ';
		let keyRow = 1;
		let startIndex = 2;
		let rangeDefinition = '';
		const parts = range.split(':');
		let keyRange = `${parts[0]}${keyRow}:${parts[1]}${keyRow}`;
		let rangeToCheck = `${parts[0]}${keyRow}:${parts[1]}`;
		const location = isObject(options.dataLocationOnSheet)
			? options.dataLocationOnSheet.values
			: undefined;
		if (options.dataLocationOnSheet) {
			const define = location ?? {};
			rangeDefinition = define.rangeDefinition ?? '';
			if (rangeDefinition === 'specifyRangeA1') {
				if (define.range === '')
					throw new Error("The field 'Range' is empty, please provide a range");
				range = String(define.range);
			}
			if (rangeDefinition === 'specifyRange') {
				keyRow = parseInt(String(define.headerRow), 10);
				startIndex = parseInt(String(define.firstDataRow), 10);
			}
			const halves = range.split(':');
			const from = cellOf(halves[0]) ?? { col: undefined, row: undefined };
			const to = cellOf(halves[1] ?? '') ?? { col: undefined, row: undefined };
			if (rangeDefinition === 'specifyRangeA1' && from.row !== undefined) {
				keyRange = `${from.col}${Number(from.row)}:${to.col}${Number(from.row)}`;
				rangeToCheck = `${from.col}${Number(from.row) + 1}:${halves[1]}`;
			} else {
				keyRange = `${from.col}${keyRow}:${to.col}${keyRow}`;
				rangeToCheck = `${from.col}${keyRow}:${halves[1]}`;
			}
		}

		const keyData = await get<{ values?: unknown[][] }>(
			`${base}/values/${encodeURIComponent(sheetName)}!${keyRange}`,
			{},
		);
		const columns = (keyData.values ?? [[]])[0];
		if (!columns?.length) throw new Error('Could not retrieve the columns from key row');

		const qs: Record<string, unknown> = {
			valueRenderOption: options.valueRender || 'UNFORMATTED_VALUE',
			dateTimeRenderOption: options.dateTimeRenderOption || 'FORMATTED_STRING',
		};
		const sheetRange = `${encodeURIComponent(sheetName)}!${rangeToCheck}`;
		const sheetData = (await get<{ values?: unknown[][] }>(`${base}/values/${sheetRange}`, qs))
			.values;
		if (!Array.isArray(sheetData)) return [];
		const rows = sheetData.slice(1);

		let dataStartIndex = 0;
		if (rangeDefinition === 'specifyRange' && keyRow < startIndex)
			dataStartIndex = startIndex - keyRow - 1;

		if (data.lastIndexChecked === undefined || data.lastIndexChecked === null) {
			data.lastIndexChecked = rows.length;
			return [];
		}
		const rowsStart = Math.max(Number(data.lastIndexChecked), dataStartIndex);
		const added = rows.slice(rowsStart);
		data.lastIndexChecked = rows.length;
		return rowsToJson(
			added,
			columns.map((c) => String(c)),
		);
	},
});

import {
	bool,
	compact,
	num,
	obj,
	openObj,
	record,
	resourceLocator,
	str,
	strList,
	tagOf,
	variant,
} from '../helpers';
import type { ActionContract, ContractInput, JsonSchema } from '../types';

const CREDENTIALS = ['googleSheetsOAuth2Api', 'googleApi'];

const spreadsheet = variant('mode', {
	pick: {
		hint: 'User picks the file at setup; do not invent IDs',
		properties: { name: str('File name from the request, shown at setup') },
	},
	id: {
		properties: {
			id: str('a spreadsheet ID, not a URL', { pattern: '^[a-zA-Z0-9\\-_]{2,}$' }),
		},
		required: ['id'],
	},
	url: {
		properties: {
			// GOOGLE_DRIVE_FILE_URL_REGEX in nodes-base Google/constants.ts
			url: str('a Google Sheets URL', {
				pattern:
					'https:\\/\\/(?:drive|docs)\\.google\\.com(?:\\/.*|)\\/d\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
			}),
		},
		required: ['url'],
	},
});

const sheet = variant(
	'mode',
	{
		name: { properties: { name: str('Exact tab name the user gave') }, required: ['name'] },
		id: {
			properties: { id: str('a numeric sheet gid', { pattern: '^(gid=)?[0-9]+$' }) },
			required: ['id'],
		},
	},
	{ 'x-n8n-hint': 'Never assume "Sheet1"; ask when the tab name is unknown' },
);

const headerRows = obj({
	headerRow: num({ default: 1 }),
	firstDataRow: num({ default: 2 }),
});

const columns = variant('mode', {
	auto: { hint: 'Input item keys must equal the header cells exactly' },
	map: {
		hint: 'Header cell text -> value; values may be ={{ }}',
		properties: { values: { type: 'object', additionalProperties: true } },
		required: ['values'],
	},
});

const row: JsonSchema = {
	...openObj({ row_number: num({ 'x-n8n-hint': 'Sheet row of this item' }) }),
	'x-n8n-hint': 'Keys are the header cell texts, exactly as written',
};

function compileLocation(input: ContractInput) {
	const spreadsheetValue = record(input.spreadsheet);
	const sheetValue = record(input.sheet);
	const spreadsheetMode = tagOf(spreadsheetValue, 'mode') ?? 'pick';
	return {
		documentId:
			spreadsheetMode === 'pick'
				? resourceLocator('list', '', spreadsheetValue.name)
				: resourceLocator(spreadsheetMode, spreadsheetValue[spreadsheetMode]),
		sheetName:
			tagOf(sheetValue, 'mode') === 'id'
				? resourceLocator('id', sheetValue.id)
				: resourceLocator('name', sheetValue.name),
	};
}

function compileColumns(value: unknown, matchOn: unknown) {
	const { values } = record(value);
	const matchingColumns = Array.isArray(matchOn) ? matchOn : [];
	if (tagOf(value, 'mode') !== 'map') {
		return { mappingMode: 'autoMapInputData', value: {}, matchingColumns, schema: [] };
	}
	const mapped = record(values);
	return {
		mappingMode: 'defineBelow',
		value: mapped,
		matchingColumns,
		schema: Object.keys(mapped).map((id) => ({
			id,
			displayName: id,
			required: false,
			defaultMatch: false,
			display: true,
			type: 'string',
			canBeUsedToMatch: true,
		})),
	};
}

function writeOptions(input: ContractInput) {
	const header = record(input.header);
	return compact({
		cellFormat: input.cellFormat,
		locationDefine: Object.keys(header).length ? { values: header } : undefined,
		handlingExtraData: input.extraFields,
	});
}

const writeProperties = {
	spreadsheet,
	sheet,
	columns,
	header: headerRows,
	cellFormat: { enum: ['USER_ENTERED', 'RAW'], default: 'USER_ENTERED' },
	extraFields: {
		enum: ['insertInNewColumn', 'ignoreIt', 'error'],
		'x-n8n-hint': 'Auto mode only: input keys with no matching header',
	},
};

export const sheetsAppend: ActionContract = {
	id: 'googleSheets.sheet.append',
	node: 'googleSheets',
	action: 'Append row',
	summary: 'Append one row per item. Never updates existing rows; use appendOrUpdate to upsert.',
	flow: { effect: 'write', cardinality: 'per-item', passthrough: 'replace', idempotent: false },
	credentials: CREDENTIALS,
	input: obj(writeProperties, ['spreadsheet', 'sheet', 'columns']),
	output: row,
	example: {
		spreadsheet: { mode: 'pick', name: 'Leads' },
		sheet: { mode: 'name', name: 'Signups' },
		columns: { mode: 'map', values: { Email: '={{ $json.email }}', Plan: '={{ $json.plan }}' } },
	},
	compile: {
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.7,
		discriminators: { resource: 'sheet', operation: 'append' },
		parameters: (input) => ({
			resource: 'sheet',
			operation: 'append',
			...compileLocation(input),
			columns: compileColumns(input.columns, []),
			options: writeOptions(input),
		}),
	},
};

export const sheetsAppendOrUpdate: ActionContract = {
	id: 'googleSheets.sheet.appendOrUpdate',
	node: 'googleSheets',
	action: 'Append or update row',
	summary: 'Upsert: update the row whose matchOn columns equal the item, else append.',
	flow: { effect: 'write', cardinality: 'per-item', passthrough: 'replace', idempotent: true },
	credentials: CREDENTIALS,
	input: obj(
		{
			...writeProperties,
			matchOn: { ...strList('Header names that identify a row'), minItems: 1 },
		},
		['spreadsheet', 'sheet', 'columns', 'matchOn'],
	),
	output: row,
	example: {
		spreadsheet: { mode: 'pick', name: 'Leads' },
		sheet: { mode: 'name', name: 'Signups' },
		columns: { mode: 'map', values: { Email: '={{ $json.email }}', Plan: '={{ $json.plan }}' } },
		matchOn: ['Email'],
	},
	compile: {
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.7,
		discriminators: { resource: 'sheet', operation: 'appendOrUpdate' },
		parameters: (input) => ({
			resource: 'sheet',
			operation: 'appendOrUpdate',
			...compileLocation(input),
			columns: compileColumns(input.columns, input.matchOn),
			options: writeOptions(input),
		}),
	},
};

export const sheetsRead: ActionContract = {
	id: 'googleSheets.sheet.read',
	node: 'googleSheets',
	action: 'Get rows',
	summary: 'Read rows, optionally only those matching column filters.',
	flow: { effect: 'read', cardinality: '1:N', passthrough: 'replace', idempotent: true },
	credentials: CREDENTIALS,
	input: obj(
		{
			spreadsheet,
			sheet,
			filters: {
				type: 'array',
				items: obj({ column: str('Exact header text'), value: str() }, ['column', 'value']),
			},
			combine: { enum: ['AND', 'OR'], default: 'AND' },
			allMatches: bool({ default: true, 'x-n8n-hint': 'false returns only the first match' }),
			header: headerRows,
		},
		['spreadsheet', 'sheet'],
	),
	output: row,
	// Reads header row 1, so a custom header row keeps the open shape.
	resourceSchema: {
		methodName: 'getSheetHeaderRow',
		toOutput: (fields, input, derived) =>
			input.header === undefined
				? obj({
						row_number: num({ 'x-n8n-hint': 'Sheet row of this item' }),
						...Object.fromEntries(fields.map((field) => [String(field.value), {}])),
					})
				: derived,
	},
	example: {
		spreadsheet: { mode: 'pick', name: 'Leads' },
		sheet: { mode: 'name', name: 'Signups' },
		filters: [{ column: 'Status', value: 'new' }],
	},
	compile: {
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.7,
		discriminators: { resource: 'sheet', operation: 'read' },
		parameters: (input) => {
			const filters = Array.isArray(input.filters) ? input.filters : [];
			const header = record(input.header);
			return {
				resource: 'sheet',
				operation: 'read',
				...compileLocation(input),
				...(filters.length
					? {
							filtersUI: {
								values: filters.map((filter) => {
									const { column, value } = record(filter);
									return { lookupColumn: column, lookupValue: value };
								}),
							},
							combineFilters: input.combine ?? 'AND',
						}
					: {}),
				options: compact({
					returnFirstMatch: filters.length && input.allMatches === false ? true : undefined,
					dataLocationOnSheet: Object.keys(header).length
						? { values: { rangeDefinition: 'specifyRange', ...header } }
						: undefined,
				}),
			};
		},
	},
};

import { isRecord } from '@n8n/utils/is-record';
import type { HttpVendorProfile } from './http-profiles';
import { looksLikeId } from './http-tool-caller';

const MAX_ROWS = 1000;
const MAX_SHEETS_TO_COPY = 3;

// `/v4/spreadsheets/<id>`, `/v4/spreadsheets/<id>/values/...` and `/v4/spreadsheets/<id>:batchUpdate`.
const SPREADSHEET_IN_PATH = /^\/v4\/spreadsheets\/([^/:?]+)/;
const VALUES_IN_PATH = /\/values\/([^/?]+)$/;

// The fields that a copy of a spreadsheet needs: ids, titles and the order of the tabs.
const METADATA_FIELDS =
	'spreadsheetId,properties(title,locale),sheets.properties(sheetId,title,index)';

const safeDecode = (text: string): string => {
	try {
		return decodeURIComponent(text);
	} catch {
		return text;
	}
};

/** The sheet title in an A1 range: `Sheet1!A1:C10`, `'My ''tab''!A:B'` or a quoted title alone. */
export function sheetOfRange(range: string): string | undefined {
	const withCells = /^(?:'((?:[^']|'')+)'|([^'!]+))!/.exec(range);
	if (withCells) return (withCells[1]?.replace(/''/g, "'") ?? withCells[2]).trim() || undefined;
	const quoted = /^'((?:[^']|'')+)'$/.exec(range);
	return quoted ? quoted[1].replace(/''/g, "'") : undefined;
}

const COLUMN_NUMBER = (letters: string): number =>
	[...letters].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0);

// The first cell of the range, as a 1-based column and row. A range without a cell starts at A1.
function startOfRange(range: string): { row: number; column: number } {
	const cells = range.includes('!') ? range.slice(range.lastIndexOf('!') + 1) : '';
	const first = /^\$?([A-Za-z]+)?\$?(\d+)?/.exec(cells.split(':')[0]);
	return {
		column: first?.[1] ? COLUMN_NUMBER(first[1].toUpperCase()) : 1,
		row: first?.[2] ? Number(first[2]) : 1,
	};
}

// A values answer starts at the first cell of its range and has no trailing empty cells. The gym
// wants the rows from A1, so this pads the grid.
function toGrid(entry: Record<string, unknown>): Record<string, unknown> {
	const range = entry.range;
	if (typeof range !== 'string' || !Array.isArray(entry.values)) return entry;
	const { row, column } = startOfRange(range);
	const lead: unknown[] = Array.from({ length: column - 1 }, () => '');
	const rows = entry.values
		.slice(0, MAX_ROWS)
		.map((cells) => (Array.isArray(cells) ? [...lead, ...(cells as unknown[])] : [...lead]));
	const empty: unknown[][] = Array.from({ length: row - 1 }, () => []);
	const sheetTitle = sheetOfRange(range);
	return {
		...entry,
		...(sheetTitle && { sheetTitle }),
		grid: [...empty, ...rows].slice(0, MAX_ROWS),
	};
}

/** Adds `sheetTitle` and `grid` (the rows from A1) to a values answer, also in a batchGet answer. */
export function enrichSheets(json: unknown): unknown {
	if (!isRecord(json)) return json;
	if (Array.isArray(json.valueRanges)) {
		return {
			...json,
			valueRanges: json.valueRanges.map((entry) => (isRecord(entry) ? toGrid(entry) : entry)),
		};
	}
	return toGrid(json);
}

const metadataRead = (id: string) => ({
	tool: 'read_get_spreadsheets',
	args: { method: 'GET', path: `/v4/spreadsheets/${id}`, query: { fields: METADATA_FIELDS } },
});

const gridRead = (id: string, title: string) => ({
	tool: 'read_get_spreadsheets_values',
	args: {
		method: 'GET',
		path: `/v4/spreadsheets/${id}/values/${encodeURIComponent(`'${title.replace(/'/g, "''")}'`)}`,
	},
});

// The tabs that a write names: in its path, or in the ranges of a batch update.
function sheetsOfWrite(args: Record<string, unknown>): string[] {
	const ranges: string[] = [];
	const inPath = VALUES_IN_PATH.exec(String(args.path));
	if (inPath) ranges.push(safeDecode(inPath[1]).replace(/:(append|clear)$/, ''));
	const body = isRecord(args.body) ? args.body : undefined;
	for (const item of Array.isArray(body?.data) ? body.data : []) {
		if (isRecord(item) && typeof item.range === 'string') ranges.push(item.range);
	}
	const titles = ranges.flatMap((range) => sheetOfRange(range) ?? []);
	return [...new Set(titles)].slice(0, MAX_SHEETS_TO_COPY);
}

const SPREADSHEET_KEYS = ['google_sheets', 'google-sheets'];

// The gym placeholder account owns every spreadsheet. The people of the real spreadsheet do not exist in
// the gym tenant, so code removes the owner and the sharing list that the plan wrote.
export function withPlaceholderOwner(overlay: Record<string, unknown>): Record<string, unknown> {
	const native = isRecord(overlay.native) ? overlay.native : undefined;
	if (!native) return overlay;
	const cleaned: Record<string, unknown> = { ...native };
	for (const key of SPREADSHEET_KEYS) {
		const block = native[key];
		if (!isRecord(block)) continue;
		const { accounts: _accounts, service_accounts: _serviceAccounts, ...rest } = block;
		cleaned[key] = {
			...rest,
			...(Array.isArray(block.spreadsheets) && {
				spreadsheets: block.spreadsheets.map((item) => {
					if (!isRecord(item)) return item;
					const { owner: _owner, shared_with: _shared, ...kept } = item;
					return kept;
				}),
			}),
		};
	}
	return { ...overlay, native: cleaned };
}

const GOOGLE_PLACEHOLDER = 'guard@unknown.invalid';

export const GOOGLE_SHEETS_PROFILE: HttpVendorProfile = {
	name: 'googlesheets',
	gymService: 'google-sheets',
	opaqueIds: true,
	defaultAdminUrl: 'http://127.0.0.1:9094',
	defaultGymUrl: 'http://127.0.0.1:8084',
	credentialKind: 'google_oauth',
	credentialField: 'oauthTokenData.access_token',
	placeholderSeed: {
		world_version: 1,
		persona: { ref: 'person:me', name: 'Guard', email: GOOGLE_PLACEHOLDER },
	},
	enrich: enrichSheets,
	finalize: withPlaceholderOwner,
	lookups: (tool, args) => {
		const named = SPREADSHEET_IN_PATH.exec(String(args.path));
		if (!named || !looksLikeId(named[1])) return [];
		const id = named[1];
		if (tool.startsWith('read_')) {
			// The full metadata read shows the titles itself. A values read does not.
			const isMetadataRead = args.path === `/v4/spreadsheets/${id}` && !isRecord(args.query);
			return isMetadataRead ? [] : [metadataRead(id)];
		}
		// A write needs the spreadsheet and the rows of the tab that it names.
		return [metadataRead(id), ...sheetsOfWrite(args).map((title) => gridRead(id, title))];
	},
	hydrateWrite: (args, gymIds) => {
		const named = SPREADSHEET_IN_PATH.exec(args.path);
		return named !== null && looksLikeId(named[1]) && !gymIds.has(named[1]);
	},
};

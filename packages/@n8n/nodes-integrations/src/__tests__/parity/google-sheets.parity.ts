import { GoogleOAuth2Api } from 'n8n-nodes-base/dist/credentials/GoogleOAuth2Api.credentials';
import { GoogleSheetsOAuth2Api } from 'n8n-nodes-base/dist/credentials/GoogleSheetsOAuth2Api.credentials';
import { OAuth2Api } from 'n8n-nodes-base/dist/credentials/OAuth2Api.credentials';
import { GoogleSheets } from 'n8n-nodes-base/dist/nodes/Google/Sheet/GoogleSheets.node';

import { appendSheetRow } from '../../nodes/google-sheets/actions/sheet.append';
import { appendOrUpdateSheetRow } from '../../nodes/google-sheets/actions/sheet.append-or-update';
import { readSheetRows } from '../../nodes/google-sheets/actions/sheet.read';
import {
	actionNode,
	compareRuns,
	runNode,
	type AllowedDifference,
	type ParityCase,
	type Route,
} from '../../../../nodes-core/src/__tests__/parity/harness';

const SPREADSHEET = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET}`;

const credential: ParityCase['credential'] = {
	data: {
		grantType: 'authorizationCode',
		clientId: 'client',
		clientSecret: 'secret',
		accessTokenUrl: 'https://oauth2.googleapis.com/token',
		authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
		authentication: 'header',
		oauthTokenData: { access_token: 'token-parity', token_type: 'Bearer' },
	},
	types: [new GoogleSheetsOAuth2Api(), new GoogleOAuth2Api(), new OAuth2Api()],
};

const metadata: Route = {
	method: 'GET',
	url: BASE,
	json: {
		sheets: [{ properties: { sheetId: 7, title: 'Leads', gridProperties: { rowCount: 4 } } }],
	},
};

const values = (rows: unknown[][], times?: number): Route => ({
	method: 'GET',
	url: `${BASE}/values/'Leads'`,
	...(times === undefined ? {} : { times }),
	json: { range: 'Leads!A1:Z10', majorDimension: 'ROWS', values: rows },
});

const writes: Route[] = [
	{ method: 'POST', url: `${BASE}:batchUpdate`, json: { replies: [{}] } },
	{ method: 'POST', url: `${BASE}/values:batchUpdate`, json: { responses: [] } },
	{ method: 'POST', url: `${BASE}/values/'Leads'!4:4:append`, json: {} },
	{ method: 'POST', url: `${BASE}/values/'Leads'!5:5:append`, json: {} },
	{ method: 'PUT', url: `${BASE}/values/Leads!4:5`, json: {} },
];

const SHEET_ROWS = [
	['name', 'email', '', 'score'],
	['Ada', 'ada@example.com', '', 3],
	['Grace', 'grace@example.com', '', 5],
];

const legacyNode = (parameters: Record<string, unknown>) => ({
	nodeType: new GoogleSheets(),
	type: 'n8n-nodes-base.googleSheets',
	typeVersion: 4.7,
	credential: 'googleSheetsOAuth2Api',
	parameters: {
		authentication: 'oAuth2',
		resource: 'sheet',
		documentId: { __rl: true, mode: 'id', value: SPREADSHEET },
		sheetName: { __rl: true, mode: 'name', value: 'Leads' },
		...parameters,
	},
});

const sheet = { spreadsheet: SPREADSHEET, sheet: { mode: 'name', name: 'Leads' } };

const schema = (names: readonly string[]) =>
	names.map((id) => ({
		id,
		displayName: id,
		required: false,
		defaultMatch: false,
		display: true,
		type: 'string',
		canBeUsedToMatch: true,
	}));

describe('googleSheets.sheet.read parity with Google Sheets v4.7 read', () => {
	const parityCase: ParityCase = {
		credential,
		input: [{}],
		routes: [metadata, values(SHEET_ROWS)],
	};

	const ALLOWED: readonly AllowedDifference[] = [];

	it('sends the same requests and emits the same items', async () => {
		const legacy = await runNode(
			legacyNode({
				operation: 'read',
				filtersUI: { values: [{ lookupColumn: 'score', lookupValue: '5' }] },
				combineFilters: 'AND',
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				readSheetRows,
				{
					...sheet,
					filters: [{ column: 'score', value: '5' }],
					combine: 'AND',
					allMatches: true,
				},
				'googleSheetsOAuth2Api',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(1);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});

	it('emits the same rows without filters', async () => {
		const legacy = await runNode(legacyNode({ operation: 'read' }), parityCase);
		const next = await runNode(
			actionNode(readSheetRows, sheet, 'googleSheetsOAuth2Api'),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

describe('googleSheets.sheet.append parity with Google Sheets v4.7 append', () => {
	const parityCase: ParityCase = {
		credential,
		input: [{ name: 'Linus' }, { name: 'Barbara' }],
		routes: [
			metadata,
			// The action reads again for the second item and sees the first appended row.
			values(SHEET_ROWS, 1),
			values([...SHEET_ROWS, ['Linus', 'new@example.com', '', '1']]),
			...writes,
		],
	};

	const PER_ITEM =
		'The action writes one row per item, so it reads the sheet per item; the legacy node writes all rows at once.';
	const APPEND =
		'The action appends with values:append, like the legacy useAppend option, so parallel runs never write the same row; the legacy default grows the grid and writes the rows.';
	const ALLOWED: readonly AllowedDifference[] = [
		...[
			`POST ${BASE}:batchUpdate #0`,
			`POST ${BASE}/values/'Leads'!4:4:append #0`,
			`POST ${BASE}/values/'Leads'!5:5:append #0`,
		].map(
			(key): AllowedDifference => ({ path: `requests.${key}`, kind: 'intended', reason: APPEND }),
		),
		...[`GET ${BASE} #1`, `GET ${BASE}/values/'Leads' #1`, `PUT ${BASE}/values/Leads!4:5 #0`].map(
			(key): AllowedDifference => ({
				path: `requests.${key}`,
				kind: 'intended',
				reason: PER_ITEM,
			}),
		),
	];

	it('sends the same requests and emits the same items', async () => {
		const legacy = await runNode(
			legacyNode({
				operation: 'append',
				columns: {
					mappingMode: 'defineBelow',
					value: { name: '={{ $json.name }}', email: 'new@example.com', score: '1' },
					matchingColumns: [],
					schema: schema(['name', 'email', 'score']),
				},
				options: {},
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				appendSheetRow,
				{
					...sheet,
					values: '={{ { name: $json.name, email: "new@example.com", score: "1" } }}',
				},
				'googleSheetsOAuth2Api',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

describe('googleSheets.sheet.appendOrUpdate parity with Google Sheets v4.7 appendOrUpdate', () => {
	const parityCase: ParityCase = {
		credential,
		input: [{}],
		routes: [metadata, values(SHEET_ROWS), ...writes],
	};

	const ALLOWED: readonly AllowedDifference[] = [
		{
			path: `requests.GET ${BASE}/values/'Leads' #0.query.valueRenderOption`,
			kind: 'intended',
			reason:
				'The action reads unformatted values, so a number key also matches a cell that shows "1,000"; the legacy node compares formatted text.',
		},
		{
			path: `requests.POST ${BASE}/values:batchUpdate #0.body.data[0].range`,
			kind: 'intended',
			reason:
				'The action quotes the tab title in every A1 range; both forms address the same cells.',
		},
	];

	it('sends the same requests and emits the same items', async () => {
		const legacy = await runNode(
			legacyNode({
				operation: 'appendOrUpdate',
				columns: {
					mappingMode: 'defineBelow',
					value: { email: 'grace@example.com', score: '8' },
					matchingColumns: ['email'],
					schema: schema(['name', 'email', 'score']),
				},
				options: {},
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				appendOrUpdateSheetRow,
				{
					...sheet,
					values: { email: 'grace@example.com', score: '8' },
					matchOn: 'email',
				},
				'googleSheetsOAuth2Api',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(1);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

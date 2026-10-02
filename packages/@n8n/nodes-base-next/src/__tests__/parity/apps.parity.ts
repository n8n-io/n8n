import { GithubApi } from 'n8n-nodes-base/dist/credentials/GithubApi.credentials';
import { GoogleDocsOAuth2Api } from 'n8n-nodes-base/dist/credentials/GoogleDocsOAuth2Api.credentials';
import { GoogleDriveOAuth2Api } from 'n8n-nodes-base/dist/credentials/GoogleDriveOAuth2Api.credentials';
import { GoogleOAuth2Api } from 'n8n-nodes-base/dist/credentials/GoogleOAuth2Api.credentials';
import { OAuth2Api } from 'n8n-nodes-base/dist/credentials/OAuth2Api.credentials';
import { SupabaseApi } from 'n8n-nodes-base/dist/credentials/SupabaseApi.credentials';
import { Github } from 'n8n-nodes-base/dist/nodes/Github/Github.node';
import { GoogleDocs } from 'n8n-nodes-base/dist/nodes/Google/Docs/GoogleDocs.node';
import { GoogleDrive } from 'n8n-nodes-base/dist/nodes/Google/Drive/GoogleDrive.node';
import { Supabase } from 'n8n-nodes-base/dist/nodes/Supabase/Supabase.node';

import { createIssue } from '../../nodes/github/actions/issue.create';
import { commentOnIssue } from '../../nodes/github/actions/issue.create-comment';
import { updateIssue } from '../../nodes/github/actions/issue.update';
import { updateDocument } from '../../nodes/google-docs/actions/document.update';
import { deleteFile } from '../../nodes/google-drive/actions/file.delete';
import { searchFiles } from '../../nodes/google-drive/actions/file.search';
import { createFolder } from '../../nodes/google-drive/actions/folder.create';
import { getSupabaseRows } from '../../nodes/supabase/actions/row.get';
import { updateSupabaseRows } from '../../nodes/supabase/actions/row.update';
import { getIssue } from '../../nodes/github/actions/issue.get';
import { getManyIssues } from '../../nodes/github/actions/issue.get-all';
import { createDocument } from '../../nodes/google-docs/actions/document.create';
import { getDocument } from '../../nodes/google-docs/actions/document.get';
import { uploadFile } from '../../nodes/google-drive/actions/file.upload';
import { createSupabaseRow } from '../../nodes/supabase/actions/row.create';
import { deleteSupabaseRows } from '../../nodes/supabase/actions/row.delete';
import { getManySupabaseRows } from '../../nodes/supabase/actions/row.get-all';
import {
	actionNode,
	compareRuns,
	runNode,
	type AllowedDifference,
	type NodeUnderTest,
	type ParityCase,
	type Route,
} from './harness';

const oauth = {
	grantType: 'authorizationCode',
	clientId: 'client',
	clientSecret: 'secret',
	accessTokenUrl: 'https://oauth2.googleapis.com/token',
	authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
	authentication: 'header',
	oauthTokenData: { access_token: 'token-parity', token_type: 'Bearer' },
};

const equal = { unexplained: [], stale: [] };

describe('github.issue parity with GitHub v1.1', () => {
	const API = 'https://api.github.com/repos/acme/widgets/issues';
	const credential: ParityCase['credential'] = {
		data: { server: 'https://api.github.com', accessToken: 'gh-token' },
		types: [new GithubApi()],
	};
	const issue = (issueNumber: number, title: string, pr = false) => ({
		id: 1000 + issueNumber,
		node_id: `I_${issueNumber}`,
		['number']: issueNumber,
		title,
		state: 'open',
		html_url: `https://github.com/acme/widgets/issues/${issueNumber}`,
		body: null,
		user: { login: 'ada', id: 7 },
		labels: [{ id: 1, name: 'bug', color: 'd73a4a' }],
		assignees: [],
		comments: 0,
		locked: false,
		milestone: null,
		created_at: '2026-09-01T09:00:00Z',
		updated_at: '2026-09-02T09:00:00Z',
		closed_at: null,
		...(pr
			? { pull_request: { html_url: `https://github.com/acme/widgets/pull/${issueNumber}` } }
			: {}),
	});
	const page = (body: unknown, link?: string): Route['raw'] => ({
		body: Buffer.from(JSON.stringify(body)),
		headers: { 'content-type': 'application/json', ...(link ? { link } : {}) },
	});
	const legacyNode = (parameters: Record<string, unknown>): NodeUnderTest => ({
		nodeType: new Github(),
		type: 'n8n-nodes-base.github',
		typeVersion: 1.1,
		credential: 'githubApi',
		parameters: {
			authentication: 'accessToken',
			owner: { __rl: true, mode: 'name', value: 'acme' },
			repository: { __rl: true, mode: 'name', value: 'widgets' },
			...parameters,
		},
	});
	const repo = { authentication: 'githubApi', owner: 'acme', repository: 'widgets' };
	const untypedFields = (items: number): AllowedDifference[] =>
		Array.from({ length: items }, (_, index) => ({
			path: `items[${index}].json.node_id`,
			kind: 'intended',
			reason: 'The issue output is closed: it keeps only the typed fields of the response.',
		}));
	const filters = { state: 'open', labels: 'bug', sort: 'created', direction: 'desc' };

	it('getAll with a limit sends the same request and emits the same issues', async () => {
		const parityCase: ParityCase = {
			credential,
			input: [{}],
			routes: [
				{ method: 'GET', url: API, json: [issue(101, 'Login returns 500'), issue(104, 'TZ')] },
			],
		};
		const legacy = await runNode(
			legacyNode({
				resource: 'repository',
				operation: 'getIssues',
				returnAll: false,
				limit: 50,
				getRepositoryIssuesFilters: filters,
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(getManyIssues, { ...repo, filters: { ...filters, labels: ['bug'] } }, 'githubApi'),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		const allowed: AllowedDifference[] = [
			...untypedFields(2),
			{
				path: `requests.GET ${API} #0.query.page`,
				kind: 'intended',
				reason: 'The first request always names page 1; the next pages follow the Link header.',
			},
		];
		expect(compareRuns(legacy, next, allowed)).toEqual(equal);
		expect(next.requests[`GET ${API} #0`]?.query.per_page).toBe('50');
	});

	const twoPages: ParityCase = {
		credential,
		input: [{}],
		routes: [
			{
				method: 'GET',
				url: API,
				query: { page: '1' },
				raw: page(
					[issue(101, 'Login returns 500'), issue(105, 'Fix login', true)],
					`<${API}?per_page=100&page=2>; rel="next", <${API}?per_page=100&page=2>; rel="last"`,
				),
			},
			{
				method: 'GET',
				url: API,
				query: { page: '2' },
				raw: page([issue(110, 'CSV export truncates')], `<${API}?per_page=100&page=1>; rel="prev"`),
			},
		],
	};
	/** GitHub repeats every query parameter in its next link; these test links do not. */
	const linkQuery: AllowedDifference[] = ['state', 'sort', 'direction'].map((name) => ({
		path: `requests.GET ${API} #1.query.${name}`,
		kind: 'intended',
		reason: 'The next page is the URL of the Link header, as GitHub gives it.',
	}));
	const allLegacy = legacyNode({
		resource: 'repository',
		operation: 'getIssues',
		returnAll: true,
		getRepositoryIssuesFilters: { state: 'open', sort: 'created', direction: 'desc' },
	});

	it('getAll of every page follows the next link like the legacy node', async () => {
		const legacy = await runNode(allLegacy, twoPages);
		const next = await runNode(
			actionNode(
				getManyIssues,
				{ ...repo, paging: { mode: 'all' }, includePullRequests: true },
				'githubApi',
			),
			twoPages,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(3);
		expect(compareRuns(legacy, next, [...untypedFields(3), ...linkQuery])).toEqual(equal);
	});

	it('getAll leaves out pull requests by default', async () => {
		const legacy = await runNode(allLegacy, twoPages);
		const next = await runNode(
			actionNode(getManyIssues, { ...repo, paging: { mode: 'all' } }, 'githubApi'),
			twoPages,
		);
		const allowed: AllowedDifference[] = [
			{
				path: 'items',
				kind: 'intended',
				reason:
					'GitHub lists pull requests as issues; includePullRequests (default false) keeps them.',
			},
			...linkQuery,
		];
		expect(compareRuns(legacy, next, allowed)).toEqual(equal);
		expect(next.items.map(({ json }) => (json as Record<string, unknown>).html_url)).toEqual([
			'https://github.com/acme/widgets/issues/101',
			'https://github.com/acme/widgets/issues/110',
		]);
	});

	it('get and create send the same requests and emit the same issue', async () => {
		const parityCase: ParityCase = {
			credential,
			input: [{}],
			routes: [
				{ method: 'GET', url: `${API}/101`, json: issue(101, 'Login returns 500') },
				{ method: 'POST', url: API, json: issue(111, 'Crash on save') },
			],
		};
		const getLegacy = await runNode(
			legacyNode({ resource: 'issue', operation: 'get', issueNumber: 101 }),
			parityCase,
		);
		const getNext = await runNode(
			actionNode(getIssue, { ...repo, issueNumber: 101 }, 'githubApi'),
			parityCase,
		);
		expect(getLegacy.error, getLegacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(getLegacy, getNext, untypedFields(1))).toEqual(equal);

		const createLegacy = await runNode(
			legacyNode({
				resource: 'issue',
				operation: 'create',
				title: 'Crash on save',
				body: 'Steps: open, save.',
				labels: [{ label: 'bug' }],
				assignees: [{ assignee: 'ada' }],
			}),
			parityCase,
		);
		const createNext = await runNode(
			actionNode(
				createIssue,
				{
					...repo,
					title: 'Crash on save',
					body: 'Steps: open, save.',
					labels: ['bug'],
					assignees: ['ada'],
				},
				'githubApi',
			),
			parityCase,
		);
		expect(createLegacy.error, createLegacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(createLegacy, createNext, untypedFields(1))).toEqual(equal);
	});

	it('update and createComment send the same requests and emit the same items', async () => {
		const comment = {
			id: 555,
			html_url: 'https://github.com/acme/widgets/issues/101#issuecomment-555',
			body: 'Fixed',
			user: { login: 'ada', id: 7 },
			created_at: '2026-09-03T09:00:00Z',
			updated_at: '2026-09-03T09:00:00Z',
		};
		const parityCase: ParityCase = {
			credential,
			input: [{}],
			routes: [
				{ method: 'PATCH', url: `${API}/101`, json: { ...issue(101, 'Done'), state: 'closed' } },
				{ method: 'POST', url: `${API}/101/comments`, json: comment },
			],
		};
		const updateLegacy = await runNode(
			legacyNode({
				resource: 'issue',
				operation: 'edit',
				issueNumber: 101,
				editFields: { title: 'Done', state: 'closed', labels: [{ label: 'bug' }] },
			}),
			parityCase,
		);
		const updateNext = await runNode(
			actionNode(
				updateIssue,
				{ ...repo, issueNumber: 101, title: 'Done', state: 'closed', labels: ['bug'] },
				'githubApi',
			),
			parityCase,
		);
		expect(updateLegacy.error, updateLegacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(updateLegacy, updateNext, untypedFields(1))).toEqual(equal);

		const commentLegacy = await runNode(
			legacyNode({
				resource: 'issue',
				operation: 'createComment',
				issueNumber: 101,
				body: 'Fixed',
			}),
			parityCase,
		);
		const commentNext = await runNode(
			actionNode(commentOnIssue, { ...repo, issueNumber: 101, body: 'Fixed' }, 'githubApi'),
			parityCase,
		);
		expect(commentLegacy.error, commentLegacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(commentLegacy, commentNext, [])).toEqual(equal);
	});
});

describe('supabase.row parity with Supabase v1', () => {
	const TABLE = 'https://acme.supabase.co/rest/v1/customers';
	const credential: ParityCase['credential'] = {
		data: { host: 'https://acme.supabase.co', serviceRole: 'sb-key' },
		types: [new SupabaseApi()],
	};
	const headers = ['authorization', 'apikey', 'prefer', 'content-type', 'content-profile'];
	const rows = [{ id: 3, status: 'churned', plan: 'free' }];
	const parityCase: ParityCase = {
		credential,
		input: [{}],
		headers,
		routes: [
			{ method: 'DELETE', url: TABLE, json: rows },
			{ method: 'GET', url: TABLE, json: rows },
			{ method: 'POST', url: TABLE, json: [{ id: 4, email: 'd@example.com' }] },
		],
	};
	const legacyNode = (parameters: Record<string, unknown>): NodeUnderTest => ({
		nodeType: new Supabase(),
		type: 'n8n-nodes-base.supabase',
		typeVersion: 1,
		credential: 'supabaseApi',
		parameters: { resource: 'row', tableId: 'customers', ...parameters },
	});
	const conditions = [
		{ keyName: 'status', condition: 'eq', keyValue: 'churned' },
		{ keyName: 'plan', condition: 'eq', keyValue: 'free' },
	];
	const filter = (match: 'all' | 'any') => ({
		match,
		conditions: [
			{ op: 'eq', column: 'status', value: 'churned' },
			{ op: 'eq', column: 'plan', value: 'free' },
		],
	});

	it('delete with any filter sends the same request and emits the deleted rows', async () => {
		const legacy = await runNode(
			legacyNode({
				operation: 'delete',
				filterType: 'manual',
				matchType: 'anyFilter',
				filters: { conditions },
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(deleteSupabaseRows, { table: 'customers', filter: filter('any') }, 'supabaseApi'),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(legacy, next, [])).toEqual(equal);
	});

	it('delete with all filters groups the conditions in one and term', async () => {
		const legacy = await runNode(
			legacyNode({
				operation: 'delete',
				filterType: 'manual',
				matchType: 'allFilters',
				filters: { conditions },
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(deleteSupabaseRows, { table: 'customers', filter: filter('all') }, 'supabaseApi'),
			parityCase,
		);
		const allowed: AllowedDifference[] = [
			{
				path: `requests.DELETE ${TABLE} #0.query`,
				kind: 'intended',
				reason:
					'and=(…) replaces one parameter per column, which keeps only the last of two conditions on one column.',
			},
		];
		expect(compareRuns(legacy, next, allowed)).toEqual(equal);
		expect(next.requests[`DELETE ${TABLE} #0`]?.query).toEqual({
			and: '(status.eq.churned,plan.eq.free)',
		});
	});

	it('getAll and create send the same requests and emit the same rows', async () => {
		const getLegacy = await runNode(
			legacyNode({
				operation: 'getAll',
				returnAll: false,
				limit: 50,
				filterType: 'manual',
				matchType: 'allFilters',
				filters: { conditions },
			}),
			parityCase,
		);
		const getNext = await runNode(
			actionNode(getManySupabaseRows, { table: 'customers', filter: filter('all') }, 'supabaseApi'),
			parityCase,
		);
		expect(getLegacy.error, getLegacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(getLegacy, getNext, [])).toEqual(equal);

		const createLegacy = await runNode(
			legacyNode({
				operation: 'create',
				dataToSend: 'defineBelow',
				fieldsUi: { fieldValues: [{ fieldId: 'email', fieldValue: 'd@example.com' }] },
			}),
			parityCase,
		);
		const createNext = await runNode(
			actionNode(
				createSupabaseRow,
				{ table: 'customers', columns: { email: 'd@example.com' } },
				'supabaseApi',
			),
			parityCase,
		);
		expect(createLegacy.error, createLegacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(createLegacy, createNext, [])).toEqual(equal);
	});

	it('getAll of every page asks for the next offset after a full page', async () => {
		const fullPage = Array.from({ length: 1000 }, (_, index) => ({ id: index + 1 }));
		const pages: ParityCase = {
			credential,
			input: [{}],
			headers,
			routes: [
				{
					method: 'GET',
					url: TABLE,
					query: { offset: '1000' },
					raw: {
						body: Buffer.from(JSON.stringify([{ id: 1001 }])),
						headers: { 'content-type': 'application/json', 'content-range': '1000-1000/*' },
					},
				},
				{
					method: 'GET',
					url: TABLE,
					raw: {
						body: Buffer.from(JSON.stringify(fullPage)),
						headers: { 'content-type': 'application/json', 'content-range': '0-999/*' },
					},
				},
			],
		};
		const legacy = await runNode(
			legacyNode({ operation: 'getAll', returnAll: true, filterType: 'none' }),
			pages,
		);
		const next = await runNode(
			actionNode(
				getManySupabaseRows,
				{ table: 'customers', paging: { mode: 'all' } },
				'supabaseApi',
			),
			pages,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(1001);
		const pageSize: AllowedDifference[] = [0, 1].map((index) => ({
			path: `requests.GET ${TABLE} #${index}.query.limit`,
			kind: 'intended',
			reason: 'An offset list sends its page size on every page, so a short page ends it.',
		}));
		expect(compareRuns(legacy, next, pageSize)).toEqual(equal);
		expect(Object.keys(next.requests)).toEqual([`GET ${TABLE} #0`, `GET ${TABLE} #1`]);
	});

	it('get and update (any filter) send the same requests and emit the same rows', async () => {
		const withPatch: ParityCase = {
			...parityCase,
			routes: [...parityCase.routes, { method: 'PATCH', url: TABLE, json: rows }],
		};
		const getLegacy = await runNode(
			legacyNode({ operation: 'get', filters: { conditions: [{ keyName: 'id', keyValue: '3' }] } }),
			withPatch,
		);
		const getNext = await runNode(
			actionNode(getSupabaseRows, { table: 'customers', where: { id: 3 } }, 'supabaseApi'),
			withPatch,
		);
		expect(getLegacy.error, getLegacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(getLegacy, getNext, [])).toEqual(equal);

		const updateLegacy = await runNode(
			legacyNode({
				operation: 'update',
				filterType: 'manual',
				matchType: 'anyFilter',
				filters: { conditions },
				dataToSend: 'defineBelow',
				fieldsUi: { fieldValues: [{ fieldId: 'plan', fieldValue: 'pro' }] },
			}),
			withPatch,
		);
		const updateNext = await runNode(
			actionNode(
				updateSupabaseRows,
				{ table: 'customers', filter: filter('any'), columns: { plan: 'pro' } },
				'supabaseApi',
			),
			withPatch,
		);
		expect(updateLegacy.error, updateLegacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(updateLegacy, updateNext, [])).toEqual(equal);
	});
});

describe('googleDocs.document parity with Google Docs v2', () => {
	const ID = '1QuestionsDocAbCdEfGhIjKlMnOpQrStUv';
	const credential: ParityCase['credential'] = {
		data: oauth,
		types: [new GoogleDocsOAuth2Api(), new GoogleOAuth2Api(), new OAuth2Api()],
	};
	const legacyNode = (parameters: Record<string, unknown>): NodeUnderTest => ({
		nodeType: new GoogleDocs(),
		type: 'n8n-nodes-base.googleDocs',
		typeVersion: 2,
		credential: 'googleDocsOAuth2Api',
		parameters: { authentication: 'oAuth2', resource: 'document', ...parameters },
	});
	const parityCase: ParityCase = {
		credential,
		input: [{}],
		routes: [
			{
				method: 'GET',
				url: `https://docs.googleapis.com/v1/documents/${ID}`,
				json: {
					documentId: ID,
					title: 'Questions',
					body: {
						content: [
							{ endIndex: 1, sectionBreak: {} },
							{ startIndex: 1, endIndex: 10, table: { tableRows: [] } },
							{
								startIndex: 10,
								endIndex: 32,
								paragraph: { elements: [{ textRun: { content: 'Q1. Explain closures.\n' } }] },
							},
						],
					},
				},
			},
			{
				method: 'POST',
				url: 'https://www.googleapis.com/drive/v3/files',
				json: {
					kind: 'drive#file',
					id: ID,
					name: 'Guide',
					mimeType: 'application/vnd.google-apps.document',
				},
			},
			{
				method: 'POST',
				url: `https://docs.googleapis.com/v1/documents/${ID}:batchUpdate`,
				json: { documentId: ID, replies: [{}] },
			},
		],
	};

	it('get emits the same text, plus the title', async () => {
		const url = `https://docs.google.com/document/d/${ID}/edit`;
		const legacy = await runNode(
			legacyNode({ operation: 'get', documentURL: url, simple: true }),
			parityCase,
		);
		const next = await runNode(
			actionNode(getDocument, { document: url }, 'googleDocsOAuth2Api'),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		const allowed: AllowedDifference[] = [
			{
				path: 'items[0].json.title',
				kind: 'intended',
				reason: 'The action also returns the title.',
			},
		];
		expect(compareRuns(legacy, next, allowed)).toEqual(equal);
	});

	it('create with text sends the requests of legacy create plus legacy update', async () => {
		const folder = '1FolderAbCdEfGhIjKlMnOpQrStUvWx';
		const created = await runNode(
			legacyNode({ operation: 'create', title: 'Guide', driveId: 'myDrive', folderId: folder }),
			parityCase,
		);
		const updated = await runNode(
			legacyNode({
				operation: 'update',
				documentURL: ID,
				simple: true,
				actionsUi: {
					actionFields: [
						{
							action: 'insert',
							object: 'text',
							text: 'Hello',
							locationChoice: 'endOfSegmentLocation',
							insertSegment: 'body',
						},
					],
				},
				updateFields: {},
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				createDocument,
				{ title: 'Guide', folderId: folder, content: { format: 'text', text: 'Hello' } },
				'googleDocsOAuth2Api',
			),
			parityCase,
		);
		expect(created.error ?? updated.error, created.unmatched.join('; ')).toBeUndefined();
		expect(next.requests).toEqual({ ...created.requests, ...updated.requests });
		expect(next.items.map(({ json }) => json)).toEqual([
			{ documentId: ID, title: 'Guide', url: `https://docs.google.com/document/d/${ID}/edit` },
		]);
	});

	it('update with text sends the request of legacy update', async () => {
		const legacy = await runNode(
			legacyNode({
				operation: 'update',
				documentURL: ID,
				simple: true,
				actionsUi: {
					actionFields: [
						{
							action: 'insert',
							object: 'text',
							text: 'More',
							locationChoice: 'endOfSegmentLocation',
							insertSegment: 'body',
						},
					],
				},
				updateFields: {},
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				updateDocument,
				{ document: ID, content: { format: 'text', text: 'More' } },
				'googleDocsOAuth2Api',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(next.requests).toEqual(legacy.requests);
	});

	it('update with markdown appends a plain paragraph after the last one', async () => {
		const next = await runNode(
			actionNode(
				updateDocument,
				{ document: ID, content: { format: 'markdown', markdown: '## More' } },
				'googleDocsOAuth2Api',
			),
			parityCase,
		);
		expect(next.error).toBeUndefined();
		const batch =
			next.requests[`POST https://docs.googleapis.com/v1/documents/${ID}:batchUpdate #0`];
		expect(batch?.body).toEqual({
			requests: [
				{ insertText: { location: { index: 31 }, text: '\n' } },
				{ deleteParagraphBullets: { range: { startIndex: 32, endIndex: 33 } } },
				{
					updateParagraphStyle: {
						range: { startIndex: 32, endIndex: 33 },
						paragraphStyle: { namedStyleType: 'NORMAL_TEXT' },
						fields: 'namedStyleType',
					},
				},
				{ insertText: { location: { index: 32 }, text: 'More' } },
				{
					updateParagraphStyle: {
						range: { startIndex: 32, endIndex: 37 },
						paragraphStyle: { namedStyleType: 'HEADING_2' },
						fields: 'namedStyleType',
					},
				},
			],
		});
	});
});

describe('googleDrive.file.upload parity with Google Drive v3', () => {
	const FILES = 'https://www.googleapis.com/upload/drive/v3/files';
	const file = {
		kind: 'drive#file',
		id: '1UploadedAbCdEfGhIjKlMnOpQrStUvWx',
		name: 'notes.txt',
		mimeType: 'text/plain',
	};
	const parityCase: ParityCase = {
		credential: {
			data: oauth,
			types: [new GoogleDriveOAuth2Api(), new GoogleOAuth2Api(), new OAuth2Api()],
		},
		input: [{}],
		binary: {
			data: {
				data: Buffer.from('hello drive').toString('base64'),
				mimeType: 'text/plain',
				fileName: 'notes.txt',
			},
		},
		routes: [
			{ method: 'POST', url: FILES, query: { uploadType: 'multipart' }, json: { id: file.id } },
			{
				method: 'PATCH',
				url: `https://www.googleapis.com/drive/v3/files/${file.id}`,
				json: file,
			},
			{
				method: 'POST',
				url: FILES,
				query: { uploadType: 'resumable' },
				raw: {
					body: Buffer.from(''),
					headers: { location: `${FILES}?uploadType=resumable&upload_id=up1` },
				},
			},
			{
				method: 'PUT',
				url: FILES,
				query: { upload_id: 'up1' },
				json: { ...file, size: '11', md5Checksum: 'abc' },
			},
		],
	};

	it('emits the same file; it streams the bytes in a resumable upload', async () => {
		const legacy = await runNode(
			{
				nodeType: new GoogleDrive(),
				type: 'n8n-nodes-base.googleDrive',
				typeVersion: 3,
				credential: 'googleDriveOAuth2Api',
				parameters: {
					authentication: 'oAuth2',
					resource: 'file',
					operation: 'upload',
					inputDataFieldName: 'data',
					name: '',
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					folderId: { __rl: true, mode: 'list', value: 'root' },
					options: {},
				},
			},
			parityCase,
		);
		const next = await runNode(
			actionNode(uploadFile, { file: 'data' }, 'googleDriveOAuth2Api'),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		const allowed: AllowedDifference[] = [
			{
				path: 'requests',
				kind: 'intended',
				reason:
					'A resumable session and one streamed PUT replace a multipart body in memory and a PATCH.',
			},
		];
		expect(compareRuns(legacy, next, allowed)).toEqual(equal);
		expect(Object.keys(next.requests)).toEqual([`POST ${FILES} #0`, `PUT ${FILES} #0`]);
		expect(next.requests[`POST ${FILES} #0`]?.body).toEqual({
			name: 'notes.txt',
			parents: ['root'],
		});
		expect(next.requests[`PUT ${FILES} #0`]).toMatchObject({
			body: 'hello drive',
			headers: { authorization: 'Bearer token-parity', 'content-type': 'text/plain' },
		});
	});
});

describe('googleDrive file and folder parity with Google Drive v3', () => {
	const FILES = 'https://www.googleapis.com/drive/v3/files';
	const ID = '1FileAbCdEfGhIjKlMnOpQrStUvWxYz0';
	const folder = {
		kind: 'drive#file',
		id: '1FolderAbCdEfGhIjKlMnOpQrStUvWx',
		name: 'Reports',
		mimeType: 'application/vnd.google-apps.folder',
	};
	const parityCase: ParityCase = {
		credential: {
			data: oauth,
			types: [new GoogleDriveOAuth2Api(), new GoogleOAuth2Api(), new OAuth2Api()],
		},
		input: [{}],
		routes: [
			{ method: 'PATCH', url: `${FILES}/${ID}`, json: { id: ID, trashed: true } },
			{ method: 'DELETE', url: `${FILES}/${ID}`, json: {} },
			{ method: 'POST', url: FILES, json: folder },
			{
				method: 'GET',
				url: FILES,
				json: { files: [{ id: ID, name: 'report.pdf', mimeType: 'application/pdf' }] },
			},
		],
	};
	const legacyNode = (parameters: Record<string, unknown>): NodeUnderTest => ({
		nodeType: new GoogleDrive(),
		type: 'n8n-nodes-base.googleDrive',
		typeVersion: 3,
		credential: 'googleDriveOAuth2Api',
		parameters: { authentication: 'oAuth2', ...parameters },
	});
	const run = async (
		action: Parameters<typeof actionNode>[0],
		parameters: Record<string, unknown>,
	) => await runNode(actionNode(action, parameters, 'googleDriveOAuth2Api'), parityCase);

	it.each([false, true])(
		'delete (permanently %s) sends the same request and item',
		async (permanently) => {
			const legacy = await runNode(
				legacyNode({
					resource: 'file',
					operation: 'deleteFile',
					fileId: { __rl: true, mode: 'id', value: ID },
					options: { deletePermanently: permanently },
				}),
				parityCase,
			);
			const next = await run(deleteFile, { fileId: ID, permanently });
			expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
			expect(compareRuns(legacy, next, [])).toEqual(equal);
		},
	);

	it('folder create emits the same folder; it asks for the link field', async () => {
		const legacy = await runNode(
			legacyNode({
				resource: 'folder',
				operation: 'create',
				name: 'Reports',
				driveId: { __rl: true, mode: 'list', value: 'My Drive' },
				folderId: { __rl: true, mode: 'list', value: 'root' },
				options: {},
			}),
			parityCase,
		);
		const next = await run(createFolder, { name: 'Reports' });
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		const allowed: AllowedDifference[] = [
			{
				path: `requests.POST ${FILES} #0.query`,
				kind: 'intended',
				reason:
					'The action asks for webViewLink (fields) and sends no list-only parameters (corpora, spaces).',
			},
		];
		expect(compareRuns(legacy, next, allowed)).toEqual(equal);
	});

	it('search by name sends the same query and emits the same files', async () => {
		const legacy = await runNode(
			legacyNode({
				resource: 'fileFolder',
				operation: 'search',
				searchMethod: 'name',
				queryString: "Q3 'final'",
				returnAll: false,
				limit: 50,
				filter: { includeTrashed: false },
				options: {},
			}),
			parityCase,
		);
		const next = await run(searchFiles, { nameContains: "Q3 'final'" });
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		const allowed: AllowedDifference[] = [
			{
				path: `requests.GET ${FILES} #0.query.fields`,
				kind: 'intended',
				reason: 'The action asks for mimeType and webViewLink too, not only id and name.',
			},
		];
		expect(compareRuns(legacy, next, allowed)).toEqual(equal);
		expect(next.requests[`GET ${FILES} #0`]?.query.q).toBe(
			"name contains 'Q3 \\'final\\'' and trashed = false",
		);
	});

	it('search keeps the folder and trash terms on every alternative of a raw query', async () => {
		const next = await run(searchFiles, {
			query: "name = 'a' or name = 'b'",
			folderId: '1FolderAbCdEfGhIjKlMnOpQrStUvWx',
		});
		expect(next.error).toBeUndefined();
		expect(next.requests[`GET ${FILES} #0`]?.query.q).toBe(
			"(name = 'a' or name = 'b') and '1FolderAbCdEfGhIjKlMnOpQrStUvWx' in parents and trashed = false",
		);
	});
});

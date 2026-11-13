/**
 * Cases for the request-equivalence test. Each case runs once through the v1
 * node (`scripts/record-v1-requests.ts` records the result) and once through
 * the compiled library node (`equivalence.test.ts`). All credential values
 * are fake.
 */
import type { EquivalenceCase } from './equivalence.ts';
import { DATA_TABLE_CASES } from './data-table-cases.ts';
import { SHEETS_APPEND_CASES } from './google-sheets-append-cases.ts';
import { SHEETS_UPSERT_CASES } from './google-sheets-upsert-cases.ts';

const rl = (value: string) => ({ __rl: true, mode: 'id', value });
const ok = (body: unknown) => [{ status: 200, body }];

const adalo = { type: 'adaloApi', data: { apiKey: 'fake-adalo-key', appId: 'app-1' } };
const currents = { type: 'currentsApi', data: { apiKey: 'fake-currents-key' } };
const gbp = {
	type: 'googleBusinessProfileOAuth2Api',
	data: { oauthTokenData: { access_token: 'fake-google-token', token_type: 'Bearer' } },
};
const highLevel = {
	type: 'highLevelOAuth2Api',
	data: { oauthTokenData: { access_token: 'fake-hl-token', token_type: 'Bearer' } },
};
const jina = { type: 'jinaAiApi', data: { apiKey: 'fake-jina-key' } };
const npm = {
	type: 'npmApi',
	data: { accessToken: 'fake-npm-token', registryUrl: 'https://registry.npmjs.org' },
};
const perplexity = { type: 'perplexityApi', data: { apiKey: 'fake-pplx-key' } };
const brevo = { type: 'sendInBlueApi', data: { apiKey: 'fake-brevo-key' } };
const whatsApp = {
	type: 'whatsAppApi',
	data: { accessToken: 'fake-wa-token', businessAccountId: 'biz-1' },
};

const declarative: EquivalenceCase[] = [
	// Adalo
	{
		name: 'adalo collection.get',
		type: 'n8n-nodes-base.adalo',
		typeVersion: 1,
		parameters: { resource: 'collection', operation: 'get', collectionId: 't 1', rowId: '42' },
		credential: adalo,
		responses: ok({ id: 42, name: 'Row' }),
	},
	{
		name: 'adalo collection.delete',
		type: 'n8n-nodes-base.adalo',
		typeVersion: 1,
		parameters: { resource: 'collection', operation: 'delete', collectionId: 't1', rowId: '7' },
		credential: adalo,
		responses: ok({}),
	},
	{
		name: 'adalo collection.getAll limit',
		type: 'n8n-nodes-base.adalo',
		typeVersion: 1,
		parameters: { resource: 'collection', operation: 'getAll', collectionId: 't1', limit: 5 },
		credential: adalo,
		responses: ok({ records: [{ id: 1 }, { id: 2 }] }),
	},
	// Currents
	{
		name: 'currents run.getAll filters',
		type: 'n8n-nodes-base.currents',
		typeVersion: 1,
		parameters: {
			resource: 'run',
			operation: 'getAll',
			projectId: rl('proj/1'),
			limit: 25,
			filters: { branches: 'main, dev ,', status: 'FAILED', tags: 'nightly' },
		},
		credential: currents,
		responses: ok({ status: 'OK', data: [{ runId: 'r1' }, { runId: 'r2' }] }),
	},
	{
		name: 'currents run.get',
		type: 'n8n-nodes-base.currents',
		typeVersion: 1,
		parameters: { resource: 'run', operation: 'get', runId: 'run-9' },
		credential: currents,
		responses: ok({ status: 'OK', data: { runId: 'run-9', status: 'PASSED' } }),
	},
	{
		name: 'currents action.create',
		type: 'n8n-nodes-base.currents',
		typeVersion: 1,
		parameters: {
			resource: 'action',
			operation: 'create',
			projectId: rl('p1'),
			name: 'Skip flaky',
			actionType: 'skip',
			matcherType: 'testId',
			matcherValue: 'abc123',
			createOptions: { description: 'from n8n' },
		},
		credential: currents,
		responses: ok({ status: 'OK', data: { actionId: 'a1' } }),
	},
	{
		name: 'currents action.update',
		type: 'n8n-nodes-base.currents',
		typeVersion: 1,
		parameters: {
			resource: 'action',
			operation: 'update',
			actionId: 'a1',
			updateFields: { name: 'Renamed', description: 'd' },
		},
		credential: currents,
		responses: ok({ status: 'OK', data: { actionId: 'a1' } }),
	},
	{
		name: 'currents project.getAll',
		type: 'n8n-nodes-base.currents',
		typeVersion: 1,
		parameters: { resource: 'project', operation: 'getAll', limit: 3 },
		credential: currents,
		responses: ok({ status: 'OK', data: [{ projectId: 'p1' }] }),
	},
	{
		name: 'currents run.reset',
		type: 'n8n-nodes-base.currents',
		typeVersion: 1,
		parameters: { resource: 'run', operation: 'reset', runId: 'r1', machineIds: 'm1,m2' },
		credential: currents,
		responses: ok({ status: 'OK', data: {} }),
	},
	// Google Business Profile
	{
		name: 'googleBusinessProfile post.get',
		type: 'n8n-nodes-base.googleBusinessProfile',
		typeVersion: 1,
		parameters: {
			resource: 'post',
			operation: 'get',
			account: rl('accounts/1'),
			location: rl('locations/2'),
			post: rl('accounts/1/locations/2/localPosts/3'),
		},
		credential: gbp,
		responses: ok({ name: 'accounts/1/locations/2/localPosts/3' }),
	},
	{
		name: 'googleBusinessProfile review.reply',
		type: 'n8n-nodes-base.googleBusinessProfile',
		typeVersion: 1,
		parameters: {
			resource: 'review',
			operation: 'reply',
			account: rl('accounts/1'),
			location: rl('locations/2'),
			review: rl('accounts/1/locations/2/reviews/r9'),
			reply: 'Thanks!',
		},
		credential: gbp,
		responses: ok({ comment: 'Thanks!' }),
	},
	{
		name: 'googleBusinessProfile post.delete',
		type: 'n8n-nodes-base.googleBusinessProfile',
		typeVersion: 1,
		parameters: {
			resource: 'post',
			operation: 'delete',
			account: rl('accounts/1'),
			location: rl('locations/2'),
			post: rl('accounts/1/locations/2/localPosts/5'),
		},
		credential: gbp,
		responses: ok({}),
	},
	// HighLevel
	{
		name: 'highLevel contact.get',
		type: 'n8n-nodes-base.highLevel',
		typeVersion: 2,
		parameters: { resource: 'contact', operation: 'get', contactId: 'c-1' },
		credential: highLevel,
		responses: ok({ contact: { id: 'c-1' } }),
	},
	{
		name: 'highLevel opportunity.update',
		type: 'n8n-nodes-base.highLevel',
		typeVersion: 2,
		parameters: {
			resource: 'opportunity',
			operation: 'update',
			opportunityId: 'o-1',
			updateFields: { name: 'Big deal', monetaryValue: 1200, status: 'won' },
		},
		credential: highLevel,
		responses: ok({ opportunity: { id: 'o-1' } }),
	},
	{
		name: 'highLevel task.delete',
		type: 'n8n-nodes-base.highLevel',
		typeVersion: 2,
		parameters: { resource: 'task', operation: 'delete', contactId: 'c-1', taskId: 't-2' },
		credential: highLevel,
		responses: ok({ succeded: true }),
	},
	{
		name: 'highLevel calendar.getFreeSlots',
		type: 'n8n-nodes-base.highLevel',
		typeVersion: 2,
		parameters: {
			resource: 'calendar',
			operation: 'getFreeSlots',
			calendarId: 'cal-1',
			startDate: '2026-11-01T00:00:00',
			endDate: '2026-11-08T00:00:00',
			additionalFields: { timezone: 'Europe/Berlin' },
		},
		credential: highLevel,
		responses: ok({ '2026-11-02': { slots: [] } }),
	},
	// Jina AI
	{
		name: 'jinaAi reader.read',
		type: 'n8n-nodes-base.jinaAi',
		typeVersion: 1,
		parameters: { resource: 'reader', operation: 'read', url: 'https://n8n.io', simplify: true },
		credential: jina,
		responses: ok({ code: 200, data: { title: 'n8n', content: 'x' } }),
	},
	{
		name: 'jinaAi reader.search',
		type: 'n8n-nodes-base.jinaAi',
		typeVersion: 1,
		parameters: {
			resource: 'reader',
			operation: 'search',
			searchQuery: 'workflow automation',
			simplify: false,
		},
		credential: jina,
		responses: ok({ code: 200, data: [{ title: 'a' }] }),
	},
	// npm
	{
		name: 'npm package.getMetadata',
		type: 'n8n-nodes-base.npm',
		typeVersion: 1,
		parameters: {
			resource: 'package',
			operation: 'getMetadata',
			packageName: '@n8n/config',
			packageVersion: 'latest',
		},
		credential: npm,
		responses: ok({ name: '@n8n/config', version: '1.0.0' }),
	},
	{
		name: 'npm distTag.getMany',
		type: 'n8n-nodes-base.npm',
		typeVersion: 1,
		parameters: { resource: 'distTag', operation: 'getMany', packageName: 'n8n' },
		credential: npm,
		responses: ok({ latest: '1.0.0', next: '1.1.0' }),
	},
	// Perplexity
	{
		name: 'perplexity search.search',
		type: 'n8n-nodes-base.perplexity',
		typeVersion: 3,
		parameters: {
			resource: 'search',
			operation: 'search',
			query: 'retry a node',
			simplify: true,
			options: { maxResults: 3, searchDomainFilter: 'n8n.io, docs.n8n.io ,', country: 'DE' },
		},
		credential: perplexity,
		responses: ok({ id: 's-1', results: [{ title: 'Retry' }], other: 1 }),
	},
	{
		name: 'perplexity embedding.createEmbedding',
		type: 'n8n-nodes-base.perplexity',
		typeVersion: 3,
		parameters: {
			resource: 'embedding',
			operation: 'createEmbedding',
			input: 'first line\n second line\n',
			options: { dimensions: 256 },
		},
		credential: perplexity,
		responses: ok({ data: [{ embedding: [0.1] }] }),
	},
	{
		name: 'perplexity agent.createResponse',
		type: 'n8n-nodes-base.perplexity',
		typeVersion: 3,
		parameters: {
			resource: 'agent',
			operation: 'createResponse',
			input: 'Summarize n8n',
			options: { instructions: 'Be short', maxOutputTokens: 100 },
		},
		credential: perplexity,
		responses: ok({ id: 'resp-1', model: 'sonar', output: [] }),
	},
	// Brevo (Sendinblue)
	{
		name: 'sendInBlue contact.create',
		type: 'n8n-nodes-base.sendInBlue',
		typeVersion: 1.1,
		parameters: { resource: 'contact', operation: 'create', email: 'ada@example.com' },
		credential: brevo,
		responses: ok({ id: 11 }),
	},
	{
		name: 'sendInBlue contact.get',
		type: 'n8n-nodes-base.sendInBlue',
		typeVersion: 1.1,
		parameters: { resource: 'contact', operation: 'get', identifier: 'ada+1@example.com' },
		credential: brevo,
		responses: ok({ email: 'ada+1@example.com' }),
	},
	{
		name: 'sendInBlue contact.getAll',
		type: 'n8n-nodes-base.sendInBlue',
		typeVersion: 1.1,
		parameters: {
			resource: 'contact',
			operation: 'getAll',
			limit: 20,
			options: { sort: 'asc' },
		},
		credential: brevo,
		responses: ok({ contacts: [{ id: 1 }, { id: 2 }], count: 2 }),
	},
	{
		name: 'sendInBlue contact.update',
		type: 'n8n-nodes-base.sendInBlue',
		typeVersion: 1.1,
		parameters: {
			resource: 'contact',
			operation: 'update',
			identifier: 'ada@example.com',
			updateAttributes: {
				updateAttributesValues: [
					{ fieldName: 'FIRSTNAME', fieldValue: 'Ada' },
					{ fieldName: 'LASTNAME', fieldValue: 'Lovelace' },
				],
			},
		},
		credential: brevo,
		responses: ok({}),
	},
	{
		name: 'sendInBlue sender.create',
		type: 'n8n-nodes-base.sendInBlue',
		typeVersion: 1.1,
		parameters: { resource: 'sender', operation: 'create', name: 'Ops', email: 'ops@example.com' },
		credential: brevo,
		responses: ok({ id: 3 }),
	},
	{
		name: 'sendInBlue attribute.delete',
		type: 'n8n-nodes-base.sendInBlue',
		typeVersion: 1.1,
		parameters: {
			resource: 'attribute',
			operation: 'delete',
			deleteAttributeCategory: 'normal',
			deleteAttributeName: 'MY ATTR',
		},
		credential: brevo,
		responses: ok({}),
	},
	// WhatsApp
	{
		name: 'whatsApp media.mediaUrlGet',
		type: 'n8n-nodes-base.whatsApp',
		typeVersion: 1.1,
		parameters: { resource: 'media', operation: 'mediaUrlGet', mediaGetId: 'm-1' },
		credential: whatsApp,
		responses: ok({ url: 'https://example.com/m-1' }),
	},
	{
		name: 'whatsApp media.mediaDelete',
		type: 'n8n-nodes-base.whatsApp',
		typeVersion: 1.1,
		parameters: { resource: 'media', operation: 'mediaDelete', mediaDeleteId: 'm-2' },
		credential: whatsApp,
		responses: ok({ success: true }),
	},
];

const telegram = {
	type: 'telegramApi',
	data: { accessToken: '123:fake-bot-token', baseUrl: 'https://api.telegram.org' },
};
const airtable = { type: 'airtableTokenApi', data: { accessToken: 'fake-airtable-pat' } };
const notion = { type: 'notionApi', data: { apiKey: 'fake-notion-secret' } };
const outlook = {
	type: 'microsoftOutlookOAuth2Api',
	data: { oauthTokenData: { access_token: 'fake-outlook-token', token_type: 'Bearer' } },
};
const supabase = {
	type: 'supabaseApi',
	data: { host: 'https://proj1.supabase.co', serviceRole: 'fake-supabase-key' },
};
const slack = { type: 'slackApi', data: { accessToken: 'xoxb-fake-slack-token' } };
const calendar = {
	type: 'googleCalendarOAuth2Api',
	data: { oauthTokenData: { access_token: 'fake-calendar-token', token_type: 'Bearer' } },
};

const drive = {
	type: 'googleDriveOAuth2Api',
	data: { oauthTokenData: { access_token: 'fake-drive-token', token_type: 'Bearer' } },
};

const gmail = {
	type: 'gmailOAuth2',
	data: { oauthTokenData: { access_token: 'fake-gmail-token', token_type: 'Bearer' } },
};

const sheets = {
	type: 'googleSheetsOAuth2Api',
	data: { oauthTokenData: { access_token: 'fake-sheets-token', token_type: 'Bearer' } },
};
/** Sheet data for the row filter cases of `sheet.read`. */
const filterRows = {
	body: {
		values: [
			['Name', 'Status', 'Count', ''],
			['Ada', 'open', 3],
			['Bob', 'done', 0, 'x'],
			['Cy', 'open', 3, ''],
			[],
			['Ada', 'open', '3'],
		],
	},
};
const sheetMeta = {
	sheets: [
		{ properties: { sheetId: 0, title: 'Sheet1' } },
		{ properties: { sheetId: 123, title: 'Sales Q1' } },
	],
};

const notionPage = {
	object: 'page',
	id: 'page-1',
	url: 'https://www.notion.so/page-1',
	parent: { type: 'data_source_id', data_source_id: 'ds-1' },
	properties: {
		Name: { type: 'title', title: [{ plain_text: 'Ship ' }, { plain_text: 'it' }] },
		// eslint-disable-next-line id-denylist -- a Notion API field name
		'Due Count': { type: 'number', number: 3 },
		Tags: { type: 'multi_select', multi_select: [{ name: 'a' }, { name: 'b' }] },
		Owner: { type: 'people', people: [{ person: { email: 'ada@example.com' } }, {}] },
		Status: { type: 'status', status: { name: 'Done' } },
		URLField: { type: 'url', url: null },
	},
};

const handPorted: EquivalenceCase[] = [
	// Telegram
	{
		name: 'telegram message.sendMessage',
		type: 'n8n-nodes-base.telegram',
		typeVersion: 1.2,
		parameters: {
			resource: 'message',
			operation: 'sendMessage',
			chatId: '-100123',
			text: 'Build *green*',
		},
		credential: telegram,
		responses: ok({ ok: true, result: { message_id: 7 } }),
	},
	{
		name: 'telegram message.sendMessage html options',
		type: 'n8n-nodes-base.telegram',
		typeVersion: 1.2,
		parameters: {
			chatId: '42',
			text: 'see https://n8n.io',
			additionalFields: { parse_mode: 'HTML', disable_notification: true, reply_to_message_id: 9 },
		},
		credential: telegram,
		responses: ok({ ok: true, result: { message_id: 8 } }),
	},
	{
		name: 'telegram message.sendMessage no attribution',
		type: 'n8n-nodes-base.telegram',
		typeVersion: 1.2,
		parameters: {
			chatId: '42',
			text: 'plain',
			additionalFields: { appendAttribution: false, disable_web_page_preview: false },
		},
		credential: telegram,
		responses: ok({ ok: true, result: { message_id: 9 } }),
	},
	// Airtable
	{
		name: 'airtable record.create',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 2.2,
		parameters: {
			resource: 'record',
			operation: 'create',
			base: rl('appBase1'),
			table: rl('Tasks and Notes'),
			columns: { mappingMode: 'defineBelow', value: { Name: 'Write port', Count: 2 } },
			options: { typecast: true },
		},
		credential: airtable,
		responses: ok({ id: 'rec1', fields: { Name: 'Write port' } }),
	},
	{
		name: 'airtable record.create auto map',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 2.2,
		parameters: {
			resource: 'record',
			operation: 'create',
			base: 'appBase1',
			table: 'tbl1',
			columns: { mappingMode: 'autoMapInputData', value: {} },
			options: { ignoreFields: 'secret, internal' },
		},
		items: [
			{ Name: 'A', secret: 'x', internal: 1 },
			{ Name: 'B', secret: 'y' },
		],
		credential: airtable,
		responses: [{ body: { id: 'recA' } }, { body: { id: 'recB' } }],
	},
	{
		name: 'airtable record.search limit',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 2.2,
		parameters: {
			resource: 'record',
			operation: 'search',
			base: rl('appBase1'),
			table: rl('tbl1'),
			filterByFormula: "{Status} = 'Open'",
			returnAll: false,
			limit: 5,
			sort: { property: [{ field: 'Name', direction: 'desc' }, { field: 'Created' }] },
			options: { fields: 'Name, Status' },
		},
		credential: airtable,
		responses: ok({ records: [{ id: 'rec1', fields: { Name: 'x' } }] }),
	},
	{
		name: 'airtable record.search all pages',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 2.2,
		parameters: {
			resource: 'record',
			operation: 'search',
			base: rl('appBase1'),
			table: rl('tbl1'),
		},
		credential: airtable,
		responses: [
			{ body: { records: [{ id: 'r1' }, { id: 'r2' }], offset: 'next-1' } },
			{ body: { records: [{ id: 'r3' }] } },
		],
	},
	{
		name: 'airtable record.create schema types',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 2.2,
		parameters: {
			operation: 'create',
			base: rl('appBase1'),
			table: rl('tbl1'),
			columns: {
				mappingMode: 'defineBelow',
				value: { Name: 'Ada', Count: '5', Done: 'true', Stage: 'A', Extra: null },
				matchingColumns: [],
				schema: [
					{ id: 'Name', type: 'string', required: true },
					{ id: 'Count', type: 'number' },
					{ id: 'Done', type: 'boolean' },
					{ id: 'Stage', type: 'options', options: [{ name: 'A', value: 'A' }] },
					{ id: 'Tags', type: 'array' },
				],
				attemptToConvertTypes: false,
				convertFieldsToString: false,
			},
			options: {},
		},
		credential: airtable,
		responses: ok({ id: 'rec1', createdTime: '2024-01-01T00:00:00.000Z', fields: { Name: 'Ada' } }),
	},
	{
		name: 'airtable record.update by id typecast',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 2.1,
		parameters: {
			operation: 'update',
			base: rl('appBase1'),
			table: rl('tbl1'),
			columns: {
				mappingMode: 'defineBelow',
				value: { id: 'rec9', Name: 'Ada', Count: '7', Tags: '["a","b"]', Notes: null },
				matchingColumns: ['id'],
				schema: [
					{ id: 'Name', type: 'string', required: true },
					{ id: 'Count', type: 'number' },
					{ id: 'Done', type: 'boolean' },
					{ id: 'Stage', type: 'options', options: [{ name: 'A', value: 'A' }] },
					{ id: 'Tags', type: 'array' },
				],
				attemptToConvertTypes: false,
				convertFieldsToString: false,
			},
			options: { typecast: true },
			legacyFlattenOutput: true,
		},
		credential: airtable,
		responses: ok({ records: [{ id: 'rec9', fields: { Name: 'Ada', Count: 7 } }] }),
	},
	{
		name: 'airtable record.update by id auto map',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 2.2,
		parameters: {
			operation: 'update',
			base: 'appBase1',
			table: 'tbl1',
			columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: ['id'] },
			options: { ignoreFields: 'tmp' },
		},
		items: [
			{ id: 'recA', Name: 'A', tmp: 1 },
			{ id: 'recB', Name: 'B' },
		],
		credential: airtable,
		responses: [
			{ body: { records: [{ id: 'recA', fields: { Name: 'A' } }] } },
			{ body: { records: [{ id: 'recB', fields: { Name: 'B' } }] } },
		],
	},
	{
		name: 'airtable record.upsert by column',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 2.2,
		parameters: {
			operation: 'upsert',
			base: rl('appBase1'),
			table: rl('tbl1'),
			columns: {
				mappingMode: 'defineBelow',
				value: { Name: 'Ada', Count: 3 },
				matchingColumns: ['Name'],
				schema: [
					{ id: 'Name', type: 'string', required: true },
					{ id: 'Count', type: 'number' },
					{ id: 'Done', type: 'boolean' },
					{ id: 'Stage', type: 'options', options: [{ name: 'A', value: 'A' }] },
					{ id: 'Tags', type: 'array' },
				],
			},
			options: {},
		},
		credential: airtable,
		responses: ok({ records: [{ id: 'rec1', fields: { Name: 'Ada', Count: 3 } }] }),
	},
	{
		name: 'airtable record.upsert by id creates on 422',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 2.2,
		parameters: {
			operation: 'upsert',
			base: rl('appBase1'),
			table: rl('tbl1'),
			columns: {
				mappingMode: 'defineBelow',
				value: { id: 'recMissing', Name: 'Ada' },
				matchingColumns: ['id'],
				schema: [
					{ id: 'Name', type: 'string', required: true },
					{ id: 'Count', type: 'number' },
					{ id: 'Done', type: 'boolean' },
					{ id: 'Stage', type: 'options', options: [{ name: 'A', value: 'A' }] },
					{ id: 'Tags', type: 'array' },
				],
			},
			options: { typecast: true },
		},
		credential: airtable,
		responses: [
			{
				status: 422,
				body: {
					error: { type: 'ROW_DOES_NOT_EXIST', message: 'Record ID recMissing does not exist' },
				},
			},
			{ body: { records: [{ id: 'recNew', fields: { Name: 'Ada' } }] } },
		],
	},
	{
		name: 'airtable record.upsert several matches',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 2.2,
		parameters: {
			operation: 'upsert',
			base: rl('appBase1'),
			table: rl('tbl1'),
			columns: {
				mappingMode: 'defineBelow',
				value: { Name: 'Ada', Count: 4 },
				matchingColumns: ['Name'],
				schema: [
					{ id: 'Name', type: 'string', required: true },
					{ id: 'Count', type: 'number' },
					{ id: 'Done', type: 'boolean' },
					{ id: 'Stage', type: 'options', options: [{ name: 'A', value: 'A' }] },
					{ id: 'Tags', type: 'array' },
				],
			},
			options: { updateAllMatches: true },
		},
		credential: airtable,
		responses: [
			{
				status: 422,
				body: {
					error: {
						type: 'INVALID_REQUEST_UNKNOWN',
						message: 'Cannot update more than one record with the same field values',
					},
				},
			},
			{ body: { records: [{ id: 'r1' }, { id: 'r2' }] } },
			{
				body: {
					records: [
						{ id: 'r1', fields: { Count: 4 } },
						{ id: 'r2', fields: { Count: 4 } },
					],
				},
			},
		],
	},
	{
		// The converter adds `legacyFlattenOutput` for versions before 2.2. The v1 node
		// ignores the parameter.
		name: 'airtable record.search v2.1 flat fields',
		type: 'n8n-nodes-base.airtable',
		typeVersion: 2.1,
		parameters: {
			resource: 'record',
			operation: 'search',
			base: rl('appBase1'),
			table: rl('tbl1'),
			filterByFormula: '{Done} = 0',
			returnAll: false,
			limit: 3,
			legacyFlattenOutput: true,
		},
		items: [{ a: 1 }, { a: 2 }],
		credential: airtable,
		responses: ok({
			records: [
				{ id: 'rec1', createdTime: '2024-01-01T00:00:00.000Z', fields: { Name: 'x', id: 7 } },
				{ id: 'rec2', createdTime: '2024-01-02T00:00:00.000Z', fields: {} },
			],
		}),
	},
	// Slack
	{
		name: 'slack message.post v2.3 channel thread options',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2.3,
		parameters: {
			select: 'channel',
			channelId: { __rl: true, mode: 'id', value: 'C0123' },
			text: 'Build *done*',
			otherOptions: {
				includeLinkToWorkflow: false,
				mrkdwn: true,
				unfurl_links: false,
				thread_ts: { replyValues: { thread_ts: 1700000000.5, reply_broadcast: true } },
			},
		},
		credential: slack,
		responses: ok({
			ok: true,
			channel: 'C0123',
			ts: '1700000001.000100',
			message: { type: 'message', text: 'Build *done*', ts: '1700000001.000100' },
		}),
	},
	{
		name: 'slack message.post v2 user by name with bot profile',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2,
		parameters: {
			resource: 'message',
			operation: 'post',
			select: 'user',
			user: { __rl: true, mode: 'username', value: 'ada' },
			text: 'Hi',
			otherOptions: {
				sendAsUser: 'Robot',
				botProfile: { imageValues: { profilePhotoType: 'emoji', icon_emoji: ':robot_face:' } },
				link_names: true,
			},
		},
		items: [{}, {}],
		credential: slack,
		responses: ok({ ok: true, channel: 'D1', ts: '1.2', message: { text: 'Hi' } }),
	},
	{
		name: 'slack message.post v2.4 blocks',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2.4,
		parameters: {
			select: 'channel',
			channelId: { __rl: true, mode: 'list', value: 'C9', cachedResultName: 'general' },
			messageType: 'block',
			blocksUi: '{"blocks":[{"type":"section","text":{"type":"mrkdwn","text":"*Hi*"}}]}',
			text: 'Fallback',
			otherOptions: {
				includeLinkToWorkflow: false,
				botProfile: {
					imageValues: { profilePhotoType: 'image', icon_url: 'https://x.test/a.png' },
				},
			},
		},
		credential: slack,
		responses: ok({ ok: true, channel: 'C9', ts: '3.4' }),
	},
	// Microsoft Outlook
	{
		name: 'microsoftOutlook message.send',
		type: 'n8n-nodes-base.microsoftOutlook',
		typeVersion: 2,
		parameters: {
			toRecipients: 'ada@example.com, bob@example.com',
			subject: 'Weekly report',
			bodyContent: '<b>Done</b>',
			additionalFields: {
				bodyContentType: 'html',
				ccRecipients: 'cy@example.com',
				importance: 'High',
				internetMessageHeaders: { headers: [{ name: 'X-Ref', value: '7' }] },
				from: 'ops@example.com',
				saveToSentItems: false,
			},
		},
		items: [{}, {}],
		credential: outlook,
		responses: [{ status: 202, body: '' }],
	},
	{
		name: 'microsoftOutlook message.send shared mailbox',
		type: 'n8n-nodes-base.microsoftOutlook',
		typeVersion: 2,
		parameters: { toRecipients: 'ada@example.com', subject: 'Hi' },
		credential: {
			...outlook,
			data: {
				...outlook.data,
				useShared: true,
				userPrincipalName: 'team@example.com',
				graphApiBaseUrl: 'https://graph.microsoft.us/',
			},
		},
		responses: [{ status: 202, body: '' }],
	},
	{
		// The converter adds `workflowLink` from `ConvertOptions.instance` and the workflow id.
		name: 'slack message.post v2.3 link to the workflow',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2.3,
		parameters: {
			select: 'channel',
			channelId: { __rl: true, mode: 'id', value: 'C0123' },
			text: 'Deploy done',
			workflowLink: { baseUrl: 'http://localhost:5678', workflowId: 'equivalence', instanceId: '' },
		},
		credential: slack,
		responses: ok({ ok: true, channel: 'C0123', ts: '5.6' }),
	},
	{
		name: 'slack message.post v2.4 blocks with the link and OAuth2 user token',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2.4,
		parameters: {
			authentication: 'oAuth2',
			select: 'channel',
			channelId: { __rl: true, mode: 'id', value: 'C9' },
			messageType: 'block',
			blocksUi: '{"blocks":[{"type":"section","text":{"type":"mrkdwn","text":"*Hi*"}}]}',
			otherOptions: { includeLinkToWorkflow: true },
			workflowLink: { baseUrl: 'http://localhost:5678', workflowId: 'equivalence', instanceId: '' },
		},
		credential: {
			type: 'slackOAuth2Api',
			data: {
				oauthTokenData: {
					access_token: 'xoxb-fake-bot-token',
					token_type: 'Bearer',
					authed_user: { access_token: 'xoxp-fake-user-token' },
				},
			},
		},
		responses: ok({ ok: true, channel: 'C9', ts: '3.4' }),
	},
	{
		name: 'slack message.post v2.2 OAuth2 bot token',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2.2,
		parameters: {
			authentication: 'oAuth2',
			select: 'channel',
			channelId: { __rl: true, mode: 'id', value: 'C9' },
			text: 'hi',
			otherOptions: { includeLinkToWorkflow: false },
		},
		credential: {
			type: 'slackOAuth2Api',
			data: { oauthTokenData: { access_token: 'xoxb-fake-bot-token', token_type: 'Bearer' } },
		},
		responses: ok({ ok: true, channel: 'C9', ts: '3.5' }),
	},
	{
		name: 'slack reaction.add',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2.4,
		parameters: {
			resource: 'reaction',
			operation: 'add',
			channelId: { __rl: true, mode: 'id', value: 'C0123' },
			timestamp: 1700000000.0001,
			name: 'white_check_mark',
		},
		credential: slack,
		responses: ok({ ok: true }),
	},
	{
		// The converter adds `sortHistory` from version 2.4. The v1 node ignores it.
		name: 'slack channel.history all pages sorted',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2.4,
		parameters: {
			resource: 'channel',
			operation: 'history',
			channelId: { __rl: true, mode: 'id', value: 'C0123' },
			returnAll: true,
			filters: { inclusive: true, oldest: '2024-03-01T10:00:00Z' },
			sortHistory: true,
		},
		credential: slack,
		responses: [
			{
				body: {
					ok: true,
					messages: [
						{ ts: '1.5', text: 'b' },
						{ ts: '3.0', text: 'c' },
					],
					response_metadata: { next_cursor: 'cur2' },
				},
			},
			{
				body: {
					ok: true,
					messages: [{ ts: '2.0', text: 'a' }],
					response_metadata: { next_cursor: '' },
				},
			},
		],
	},
	{
		name: 'slack channel.history limit',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2.3,
		parameters: {
			resource: 'channel',
			operation: 'history',
			channelId: { __rl: true, mode: 'id', value: 'C0123' },
			returnAll: false,
			limit: 2,
			filters: { latest: '2024-03-02T00:00:00Z' },
		},
		credential: slack,
		responses: ok({ ok: true, messages: [{ ts: '1.5' }, { ts: '3.0' }] }),
	},
	// Supabase
	{
		name: 'supabase row.getAll any filter with limit',
		type: 'n8n-nodes-base.supabase',
		typeVersion: 1,
		parameters: {
			resource: 'row',
			operation: 'getAll',
			tableId: 'leads',
			limit: 5,
			filters: {
				conditions: [
					{ keyName: 'status', condition: 'eq', keyValue: 'new' },
					{ keyName: 'email', condition: 'ilike', keyValue: '%@acme.test' },
				],
			},
			orderBy: 'created_at.desc',
		},
		credential: supabase,
		responses: ok([
			{ id: 1, status: 'new' },
			{ id: 2, status: 'new' },
		]),
	},
	{
		name: 'supabase row.getAll all filters return all',
		type: 'n8n-nodes-base.supabase',
		typeVersion: 1,
		parameters: {
			operation: 'getAll',
			tableId: 'big table',
			returnAll: true,
			matchType: 'allFilters',
			filters: {
				conditions: [
					{ keyName: 'score', condition: 'gte', keyValue: 3 },
					{ keyName: 'note', condition: 'fullText', searchFunction: 'wfts', keyValue: 'a, b' },
				],
			},
			useCustomSchema: true,
			schema: 'crm',
		},
		credential: supabase,
		responses: ok([{ id: 1 }]),
	},
	{
		name: 'supabase row.getAll string filter',
		type: 'n8n-nodes-base.supabase',
		typeVersion: 1,
		parameters: {
			operation: 'getAll',
			tableId: 'leads',
			filterType: 'string',
			filterString: 'name=eq.$1&city=eq.Zürich',
			filterStringParameters: { values: [{ value: 'Ada, Lovelace' }] },
		},
		items: [{}, {}],
		credential: supabase,
		responses: ok([{ id: 3 }]),
	},
	{
		name: 'supabase row.create define below for all items',
		type: 'n8n-nodes-base.supabase',
		typeVersion: 1,
		parameters: {
			resource: 'row',
			operation: 'create',
			tableId: 'leads',
			fieldsUi: {
				fieldValues: [
					{ fieldId: 'status', fieldValue: 'new' },
					{ fieldId: 'score', fieldValue: 1 },
				],
			},
			useCustomSchema: true,
			schema: 'crm',
		},
		items: [{ a: 1 }, { a: 2 }],
		credential: supabase,
		responses: ok([
			{ id: 1, status: 'new', score: 1 },
			{ id: 2, status: 'new', score: 1 },
		]),
	},
	{
		name: 'supabase row.create auto map',
		type: 'n8n-nodes-base.supabase',
		typeVersion: 1,
		parameters: {
			operation: 'create',
			tableId: 'leads',
			dataToSend: 'autoMapInputData',
			inputsToIgnore: 'tmp',
		},
		items: [
			{ name: 'Ada', tmp: 1 },
			{ name: 'Bob', tmp: 2, city: 'Oslo' },
		],
		credential: supabase,
		responses: ok([
			{ id: 3, name: 'Ada' },
			{ id: 4, name: 'Bob', city: 'Oslo' },
		]),
	},
	{
		name: 'supabase row.get',
		type: 'n8n-nodes-base.supabase',
		typeVersion: 1,
		parameters: {
			operation: 'get',
			tableId: 'leads',
			filters: { conditions: [{ keyName: 'id', keyValue: 42 }] },
		},
		credential: supabase,
		responses: ok([{ id: 42, name: 'Ada' }]),
	},
	{
		name: 'supabase row.update define below',
		type: 'n8n-nodes-base.supabase',
		typeVersion: 1,
		parameters: {
			operation: 'update',
			tableId: 'leads',
			matchType: 'allFilters',
			filters: { conditions: [{ keyName: 'id', condition: 'eq', keyValue: 'a.b' }] },
			fieldsUi: {
				fieldValues: [
					{ fieldId: 'status', fieldValue: 'contacted' },
					{ fieldId: 'score', fieldValue: 4 },
				],
			},
		},
		credential: supabase,
		responses: ok([{ id: 'a.b', status: 'contacted', score: 4 }]),
	},
	{
		name: 'supabase row.update auto map',
		type: 'n8n-nodes-base.supabase',
		typeVersion: 1,
		parameters: {
			operation: 'update',
			tableId: 'leads',
			filters: { conditions: [{ keyName: 'id', condition: 'eq', keyValue: 7 }] },
			dataToSend: 'autoMapInputData',
			inputsToIgnore: 'secret, tmp',
		},
		items: [{ id: 7, status: 'won', secret: 'x', tmp: 1 }],
		credential: supabase,
		responses: ok([{ id: 7, status: 'won' }]),
	},
	// Notion
	{
		// Versions 2 to 2.2: the converter adds `apiV2`. The v1 node ignores the parameter.
		name: 'notion databasePage.getAll v2.2 manual filters',
		type: 'n8n-nodes-base.notion',
		typeVersion: 2.2,
		parameters: {
			resource: 'databasePage',
			operation: 'getAll',
			apiV2: true,
			databaseId: { __rl: true, mode: 'list', value: 'ab1545b247fb49fa92d6f4b49f4d8116' },
			limit: 3,
			filterType: 'manual',
			filters: {
				conditions: [
					{ key: 'Notes|rich_text', condition: 'contains', richTextValue: 'urgent' },
					{ key: 'Status|select', condition: 'equals', selectValue: 'Open' },
					{ key: 'Done|checkbox', condition: 'equals', checkboxValue: false },
					{ key: 'Count|number', condition: 'greater_than', numberValue: 2 },
					{ key: 'Tags|multi_select', condition: 'contains', multiSelectValue: 'a' },
					{ key: 'Phone|phone_number', condition: 'is_empty' },
				],
			},
			options: { sort: { sortValue: [{ key: 'Count|number', direction: 'descending' }] } },
		},
		credential: notion,
		responses: [
			{
				body: {
					results: [
						{
							...notionPage,
							properties: {
								...notionPage.properties,
								// eslint-disable-next-line id-denylist -- a Notion API field name
								'Größe Ä': { type: 'number', number: 1 },
							},
						},
						notionPage,
					],
					has_more: true,
					next_cursor: 'cur-1',
				},
			},
			{ body: { results: [notionPage, notionPage], has_more: false, next_cursor: null } },
		],
	},
	{
		// v1 renames the simplified keys in place: `aliases` overwrites `property_aliases`.
		name: 'notion databasePage.getAll v2.2 property name clash',
		type: 'n8n-nodes-base.notion',
		typeVersion: 2.2,
		parameters: {
			resource: 'databasePage',
			operation: 'getAll',
			apiV2: true,
			databaseId: { __rl: true, mode: 'id', value: 'ab1545b247fb49fa92d6f4b49f4d8116' },
			returnAll: true,
			options: {},
		},
		credential: notion,
		responses: ok({
			results: [
				{
					...notionPage,
					properties: {
						aliases: { type: 'rich_text', rich_text: [{ plain_text: 'new' }] },
						Name: { type: 'title', title: [{ plain_text: 'Row' }] },
						property_aliases: { type: 'rich_text', rich_text: [{ plain_text: 'old' }] },
						audience: { type: 'number', number: 2 },
					},
				},
			],
			has_more: false,
			next_cursor: null,
		}),
	},
	{
		name: 'notion databasePage.getAll v2.2 all filters raw',
		type: 'n8n-nodes-base.notion',
		typeVersion: 2.2,
		parameters: {
			resource: 'databasePage',
			operation: 'getAll',
			apiV2: true,
			databaseId: { __rl: true, mode: 'list', value: 'ab1545b247fb49fa92d6f4b49f4d8116' },
			returnAll: true,
			simple: false,
			filterType: 'manual',
			matchType: 'allFilters',
			filters: { conditions: [{ key: 'Name|title', condition: 'equals', titleValue: 'Ship it' }] },
		},
		credential: notion,
		responses: ok({ results: [notionPage], has_more: false, next_cursor: null }),
	},
	{
		name: 'notion databasePage.getAll v2.2 json filter',
		type: 'n8n-nodes-base.notion',
		typeVersion: 2.2,
		parameters: {
			resource: 'databasePage',
			operation: 'getAll',
			apiV2: true,
			databaseId: { __rl: true, mode: 'list', value: 'ab1545b247fb49fa92d6f4b49f4d8116' },
			filterType: 'json',
			filterJson: '{"property":"Done","checkbox":{"equals":true}}',
		},
		items: [{}, {}],
		credential: notion,
		responses: ok({ results: [notionPage], has_more: false, next_cursor: null }),
	},
	{
		name: 'notion databasePage.update v2.2 properties',
		type: 'n8n-nodes-base.notion',
		typeVersion: 2.2,
		parameters: {
			resource: 'databasePage',
			operation: 'update',
			apiV2: true,
			pageId: { __rl: true, mode: 'id', value: '0b1a2c3d4e5f60718293a4b5c6d7e8f9' },
			propertiesUi: {
				propertyValues: [
					{ key: 'Name|title', title: 'Renamed' },
					{ key: 'Count|number', numberValue: 4 },
					{ key: 'Stage|select', selectValue: '' },
					{ key: 'Tags|multi_select', multiSelectValue: ['a', 'b'] },
					{ key: 'Owner|people', peopleValue: 'user-1' },
					{
						key: 'Links|relation',
						relationValue: [
							'0b1a2c3d4e5f60718293a4b5c6d7e8f9, 0b1a2c3d-4e5f-4071-8293-a4b5c6d7e8f9',
						],
					},
					{ key: 'Site|url', urlValue: '', ignoreIfEmpty: true },
					{ key: 'Done|checkbox', checkboxValue: true },
					{ key: 'Notes|rich_text', richText: false, textContent: 'plain' },
					{
						key: 'Files|files',
						fileUrls: { fileUrl: [{ name: 'a.pdf', url: 'https://x.test/a.pdf' }] },
					},
					{ key: 'Mail|email', emailValue: 'ada@example.com' },
					{ key: 'State|status', statusValue: 'Done' },
				],
			},
			options: { icon: '🚀' },
		},
		credential: notion,
		responses: ok({ ...notionPage, parent: { type: 'database_id', database_id: 'db-1' } }),
	},
	{
		name: 'notion databasePage.create v2.2 for all items',
		type: 'n8n-nodes-base.notion',
		typeVersion: 2.2,
		parameters: {
			resource: 'databasePage',
			operation: 'create',
			apiV2: true,
			databaseId: { __rl: true, mode: 'list', value: 'ab1545b247fb49fa92d6f4b49f4d8116' },
			title: 'New page',
			propertiesUi: { propertyValues: [{ key: 'Count|number', numberValue: 1 }] },
			options: { icon: 'https://x.test/i.png', iconType: 'file' },
		},
		items: [{}, {}],
		credential: notion,
		responses: [
			{
				body: {
					object: 'database',
					properties: { Title: { type: 'title' }, Count: { type: 'number' } },
				},
			},
			{ body: notionPage },
			{ body: notionPage },
		],
	},
	{
		name: 'notion databasePage.create',
		type: 'n8n-nodes-base.notion',
		typeVersion: 3,
		parameters: {
			resource: 'databasePage',
			operation: 'create',
			dataSourceId: rl('ab1545b247fb49fa92d6f4b49f4d8116'),
			title: 'Ship it',
			propertiesUi: {
				propertyValues: [
					{ key: 'Due Count|number', numberValue: 3 },
					{ key: 'Tags|multi_select', multiSelectValue: 'a, b' },
					{ key: 'Status|status', statusValue: 'Done' },
					{ key: 'Notes|rich_text', textContent: 'hello' },
					{ key: 'Link|url', urlValue: '', ignoreIfEmpty: true },
					{ key: 'Done|checkbox', checkboxValue: true },
				],
			},
			options: { icon: '🚀' },
		},
		credential: notion,
		responses: [
			{
				body: {
					object: 'data_source',
					properties: { Name: { type: 'title' }, Tags: { type: 'multi_select' } },
				},
			},
			{ body: notionPage },
		],
	},
	{
		name: 'notion databasePage.create markdown raw',
		type: 'n8n-nodes-base.notion',
		typeVersion: 3,
		parameters: {
			resource: 'databasePage',
			operation: 'create',
			dataSourceId: '1b2c3d4e-0000-4000-8000-00000000abcd',
			title: 'Notes',
			contentType: 'markdown',
			markdown: '# Hello',
			simple: false,
		},
		credential: notion,
		responses: [
			{ body: { properties: { Title: { type: 'title' } } } },
			{ body: { id: 'p2', object: 'page' } },
		],
	},
	{
		name: 'notion databasePage.getAll json filter and sort',
		type: 'n8n-nodes-base.notion',
		typeVersion: 3,
		parameters: {
			resource: 'databasePage',
			operation: 'getAll',
			dataSourceId: rl('ab1545b247fb49fa92d6f4b49f4d8116'),
			limit: 3,
			filterType: 'json',
			filterJson: '{"property":"Status","status":{"equals":"Done"}}',
			options: { sort: { sortValue: [{ key: 'Due Count|number', direction: 'ascending' }] } },
		},
		credential: notion,
		responses: [
			{ body: { results: [notionPage, notionPage], has_more: true, next_cursor: 'c1' } },
			{ body: { results: [notionPage, notionPage], has_more: false, next_cursor: null } },
		],
	},
	{
		name: 'notion databasePage.getAll all raw',
		type: 'n8n-nodes-base.notion',
		typeVersion: 3,
		parameters: {
			resource: 'databasePage',
			operation: 'getAll',
			dataSourceId: rl('ab1545b247fb49fa92d6f4b49f4d8116'),
			returnAll: true,
			simple: false,
		},
		credential: notion,
		responses: [
			{ body: { results: [{ id: 'a' }], has_more: true, next_cursor: 'c1' } },
			{ body: { results: [{ id: 'b' }], has_more: false, next_cursor: null } },
		],
	},
	// Gmail
	{
		name: 'gmail message.send text',
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.2,
		parameters: {
			resource: 'message',
			operation: 'send',
			sendTo: 'ada@example.com, Bob <bob@example.com>',
			subject: 'Weekly report',
			emailType: 'text',
			message: ' All green. ',
			options: { ccList: 'c@example.com', replyTo: 'ops@example.com' },
		},
		credential: gmail,
		responses: ok({ id: 'm1', threadId: 't1', labelIds: ['SENT'] }),
	},
	{
		name: 'gmail message.send html sender name',
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.2,
		parameters: {
			sendTo: 'ada@example.com',
			subject: 'Grüße aus Berlin',
			message: '<p>Hallo <b>Ada</b></p>',
			options: { senderName: 'Ops Bot', bccList: 'audit@example.com' },
		},
		credential: gmail,
		responses: [
			{ body: { emailAddress: 'bot@example.com' } },
			{ body: { id: 'm2', threadId: 't2' } },
		],
	},
	{
		name: 'gmail message.getAll simple limit and filters',
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.2,
		parameters: {
			operation: 'getAll',
			limit: 2,
			filters: {
				q: 'subject:invoice',
				readStatus: 'unread',
				labelIds: ['INBOX'],
				includeSpamTrash: false,
				receivedAfter: '2024-03-01T10:00:00.000Z',
			},
		},
		credential: gmail,
		responses: [
			{
				body: {
					messages: [
						{ id: 'm1', threadId: 't1' },
						{ id: 'm2', threadId: 't2' },
					],
					resultSizeEstimate: 2,
				},
			},
			{
				body: {
					id: 'm1',
					threadId: 't1',
					labelIds: ['INBOX', 'UNREAD', 'Label_1'],
					snippet: 'Hello 1',
					payload: {
						partId: '',
						mimeType: 'text/plain',
						filename: '',
						headers: [
							{ name: 'From', value: 'Ada <ada@example.com>' },
							{ name: 'To', value: 'ops@example.com' },
							{ name: 'Subject', value: 'Invoice 1' },
						],
						body: { size: 42 },
					},
					sizeEstimate: 512,
					historyId: '91',
					internalDate: '1709287200001',
				},
			},
			{
				body: {
					id: 'm2',
					threadId: 't2',
					labelIds: ['INBOX'],
					snippet: 'Hello 2',
					payload: {
						partId: '',
						mimeType: 'text/plain',
						filename: '',
						headers: [
							{ name: 'From', value: 'Ada <ada@example.com>' },
							{ name: 'To', value: 'ops@example.com' },
							{ name: 'Subject', value: 'Invoice 2' },
						],
						body: { size: 42 },
					},
					sizeEstimate: 512,
					historyId: '92',
					internalDate: '1709287200002',
				},
			},
			{
				body: {
					labels: [
						{ id: 'INBOX', name: 'INBOX', type: 'system' },
						{ id: 'UNREAD', name: 'UNREAD', type: 'system' },
						{ id: 'Label_1', name: 'Finance', type: 'user' },
					],
				},
			},
		],
	},
	{
		name: 'gmail message.getAll returnAll pages and sender',
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.1,
		parameters: {
			operation: 'getAll',
			returnAll: true,
			simple: true,
			filters: { sender: 'ada@example.com', receivedBefore: '2024-04-01T00:00:00.000Z' },
		},
		credential: gmail,
		responses: [
			{ body: { messages: [{ id: 'm1', threadId: 't1' }], nextPageToken: 'p2' } },
			{ body: { messages: [{ id: 'm2', threadId: 't2' }], resultSizeEstimate: 1 } },
			{
				body: {
					id: 'm1',
					threadId: 't1',
					labelIds: ['UNREAD'],
					snippet: 'Hello 1',
					payload: {
						partId: '',
						mimeType: 'text/plain',
						filename: '',
						headers: [
							{ name: 'From', value: 'Ada <ada@example.com>' },
							{ name: 'To', value: 'ops@example.com' },
							{ name: 'Subject', value: 'First' },
						],
						body: { size: 42 },
					},
					sizeEstimate: 512,
					historyId: '91',
					internalDate: '1709287200001',
				},
			},
			{
				body: {
					id: 'm2',
					threadId: 't2',
					labelIds: ['Label_1', 'INBOX'],
					snippet: 'Hello 2',
					payload: {
						partId: '',
						mimeType: 'text/plain',
						filename: '',
						headers: [
							{ name: 'From', value: 'Ada <ada@example.com>' },
							{ name: 'To', value: 'ops@example.com' },
							{ name: 'Subject', value: 'Second' },
						],
						body: { size: 42 },
					},
					sizeEstimate: 512,
					historyId: '92',
					internalDate: '1709287200002',
				},
			},
			{
				body: {
					labels: [
						{ id: 'INBOX', name: 'INBOX', type: 'system' },
						{ id: 'UNREAD', name: 'UNREAD', type: 'system' },
						{ id: 'Label_1', name: 'Finance', type: 'user' },
					],
				},
			},
		],
	},
	{
		name: 'gmail message.getAll no messages',
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.2,
		parameters: { resource: 'message', operation: 'getAll', filters: {} },
		credential: gmail,
		responses: [
			{ body: { resultSizeEstimate: 0 } },
			{
				body: {
					labels: [
						{ id: 'INBOX', name: 'INBOX', type: 'system' },
						{ id: 'UNREAD', name: 'UNREAD', type: 'system' },
						{ id: 'Label_1', name: 'Finance', type: 'user' },
					],
				},
			},
		],
	},
	{
		name: 'gmail message.get simple',
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.2,
		parameters: { operation: 'get', messageId: 'm7' },
		credential: gmail,
		responses: [
			{
				body: {
					id: 'm7',
					threadId: 't7',
					labelIds: ['INBOX', 'Label_1'],
					snippet: 'Hello 7',
					payload: {
						partId: '',
						mimeType: 'text/plain',
						filename: '',
						headers: [
							{ name: 'From', value: 'Ada <ada@example.com>' },
							{ name: 'To', value: 'ops@example.com' },
							{ name: 'Subject', value: 'One message' },
						],
						body: { size: 42 },
					},
					sizeEstimate: 512,
					historyId: '97',
					internalDate: '1709287200007',
				},
			},
			{
				body: {
					labels: [
						{ id: 'INBOX', name: 'INBOX', type: 'system' },
						{ id: 'UNREAD', name: 'UNREAD', type: 'system' },
						{ id: 'Label_1', name: 'Finance', type: 'user' },
					],
				},
			},
		],
	},
	{
		name: 'gmail message.addLabels',
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.1,
		parameters: { operation: 'addLabels', messageId: 'm7', labelIds: ['Label_1', 'STARRED'] },
		items: [{}, {}],
		credential: gmail,
		responses: ok({ id: 'm7', threadId: 't7', labelIds: ['INBOX', 'Label_1', 'STARRED'] }),
	},
	{
		name: 'gmail message.removeLabels',
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.2,
		parameters: {
			resource: 'message',
			operation: 'removeLabels',
			messageId: 'm8',
			labelIds: ['INBOX'],
		},
		credential: gmail,
		responses: ok({ id: 'm8', threadId: 't8', labelIds: [] }),
	},
	{
		name: 'gmail message.markAsRead',
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.1,
		parameters: { operation: 'markAsRead', messageId: 'm9' },
		credential: gmail,
		responses: ok({ id: 'm9', threadId: 't9', labelIds: ['INBOX'] }),
	},
	{
		name: 'gmail message.markAsUnread',
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.2,
		parameters: { operation: 'markAsUnread', messageId: 'm9' },
		credential: gmail,
		responses: ok({ id: 'm9', threadId: 't9', labelIds: ['INBOX', 'UNREAD'] }),
	},
	{
		name: 'gmail message.delete',
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.2,
		parameters: { operation: 'delete', messageId: 'm10' },
		credential: gmail,
		responses: [{ status: 204, body: '' }],
	},
	{
		name: 'googleDrive folder.create in a folder',
		type: 'n8n-nodes-base.googleDrive',
		typeVersion: 3,
		parameters: {
			resource: 'folder',
			name: 'Invoices',
			folderId: { __rl: true, mode: 'id', value: '1FolderX' },
			options: { folderColorRgb: '#ff0000' },
		},
		credential: drive,
		responses: ok({ id: 'f1', name: 'Invoices', mimeType: 'application/vnd.google-apps.folder' }),
	},
	{
		name: 'googleDrive folder.create in a shared drive, full output',
		type: 'n8n-nodes-base.googleDrive',
		typeVersion: 3,
		parameters: {
			resource: 'folder',
			name: '',
			driveId: { __rl: true, mode: 'id', value: 'drive9' },
			options: { simplifyOutput: false },
		},
		credential: drive,
		responses: ok({ id: 'f2', name: 'Untitled' }),
	},
	{
		name: 'googleDrive file.copy with the cached name',
		type: 'n8n-nodes-base.googleDrive',
		typeVersion: 3,
		parameters: {
			operation: 'copy',
			fileId: { __rl: true, mode: 'list', value: '1AbCfile', cachedResultName: 'Report.pdf' },
			name: '',
			sameFolder: true,
			options: {},
		},
		credential: drive,
		responses: ok({ id: 'c1', name: 'Copy of Report.pdf' }),
	},
	{
		name: 'googleDrive file.copy to a folder, name read',
		type: 'n8n-nodes-base.googleDrive',
		typeVersion: 3,
		parameters: {
			operation: 'copy',
			fileId: { __rl: true, mode: 'id', value: '1AbCfile' },
			name: '',
			sameFolder: false,
			folderId: { __rl: true, mode: 'id', value: '1FolderX' },
			options: { copyRequiresWriterPermission: true, description: 'copy' },
		},
		credential: drive,
		responses: [{ body: { name: 'Plan.docx' } }, { body: { id: 'c2', name: 'Copy of Plan.docx' } }],
	},
	{
		name: 'googleDrive file.move',
		type: 'n8n-nodes-base.googleDrive',
		typeVersion: 3,
		parameters: {
			operation: 'move',
			fileId: { __rl: true, mode: 'list', value: '1AbCfile', cachedResultName: 'Report.pdf' },
			folderId: { __rl: true, mode: 'id', value: '1FolderX' },
		},
		credential: drive,
		responses: [
			{ body: { parents: ['p1', 'p2'] } },
			{ body: { id: '1AbCfile', parents: ['1FolderX'] } },
		],
	},
	{
		name: 'googleDrive file.deleteFile to the trash',
		type: 'n8n-nodes-base.googleDrive',
		typeVersion: 3,
		parameters: {
			operation: 'deleteFile',
			fileId: { __rl: true, mode: 'list', value: '1AbCfile', cachedResultName: 'Report.pdf' },
			options: {},
		},
		credential: drive,
		responses: ok({ id: '1AbCfile', trashed: true }),
	},
	{
		name: 'googleDrive file.deleteFile for good',
		type: 'n8n-nodes-base.googleDrive',
		typeVersion: 3,
		parameters: {
			operation: 'deleteFile',
			fileId: { __rl: true, mode: 'list', value: '1AbCfile', cachedResultName: 'Report.pdf' },
			options: { deletePermanently: true },
		},
		credential: drive,
		responses: [{ status: 204, body: '' }],
	},
	{
		// An expression without a value: v1 searches for its String() text.
		name: 'googleDrive fileFolder.search null query in root',
		type: 'n8n-nodes-base.googleDrive',
		typeVersion: 3,
		parameters: {
			resource: 'fileFolder',
			queryString: null,
			limit: 1,
			filter: { folderId: { __rl: true, mode: 'list', value: 'root' } },
		},
		credential: drive,
		responses: ok({ files: [] }),
	},
	{
		name: 'googleDrive fileFolder.search name in folder with types',
		type: 'n8n-nodes-base.googleDrive',
		typeVersion: 3,
		parameters: {
			resource: 'fileFolder',
			queryString: "Q3 'final'",
			limit: 5,
			filter: {
				folderId: {
					__rl: true,
					mode: 'url',
					value: 'https://drive.google.com/drive/folders/1AbC-def_GHI',
				},
				whatToSearch: 'files',
				fileTypes: ['application/pdf', 'application/vnd.google-apps.spreadsheet'],
			},
			options: { fields: ['id', 'name', 'mimeType', 'webViewLink'] },
		},
		credential: drive,
		responses: ok({
			files: [
				{
					id: 'f1',
					name: "Q3 'final' report.pdf",
					mimeType: 'application/pdf',
					webViewLink: 'https://x/f1',
				},
				{ id: 'f2', name: 'Q3 final sheet', mimeType: 'application/vnd.google-apps.spreadsheet' },
			],
		}),
	},
	{
		name: 'googleDrive fileFolder.search query returnAll in a shared drive',
		type: 'n8n-nodes-base.googleDrive',
		typeVersion: 3,
		parameters: {
			resource: 'fileFolder',
			operation: 'search',
			searchMethod: 'query',
			queryString: "modifiedTime > '2024-01-01T00:00:00'",
			returnAll: true,
			filter: {
				driveId: { __rl: true, mode: 'list', value: 'drive-42', cachedResultName: 'Team' },
				whatToSearch: 'folders',
				includeTrashed: true,
			},
		},
		credential: drive,
		responses: [
			{ body: { files: [{ id: 'd1', name: 'A' }], nextPageToken: 'n2' } },
			{ body: { files: [{ id: 'd2', name: 'B' }] } },
		],
	},
	{
		name: 'googleDrive fileFolder.search root folder of my drive',
		type: 'n8n-nodes-base.googleDrive',
		typeVersion: 3,
		parameters: {
			resource: 'fileFolder',
			queryString: 'invoice',
			filter: {
				folderId: { __rl: true, mode: 'list', value: 'root', cachedResultName: '/ (Root folder)' },
			},
			options: { fields: ['*'] },
		},
		credential: drive,
		responses: ok({ files: [] }),
	},
	{
		// An expression that gives no date (null or '') sends no bound.
		name: 'googleCalendar event.getAll empty bounds',
		type: 'n8n-nodes-base.googleCalendar',
		typeVersion: 1.3,
		parameters: {
			resource: 'event',
			operation: 'getAll',
			calendar: { __rl: true, mode: 'id', value: 'mia@acme.test' },
			returnAll: true,
			timeMin: '',
			timeMax: '',
			options: {},
		},
		credential: calendar,
		responses: ok({ items: [{ id: 'e1' }, { id: 'e2' }] }),
	},
	{
		// A date that is not ISO 8601 (the default format of the Date & Time node).
		name: 'googleCalendar event.getAll US dates',
		type: 'n8n-nodes-base.googleCalendar',
		typeVersion: 1.3,
		parameters: {
			resource: 'event',
			operation: 'getAll',
			calendar: { __rl: true, mode: 'id', value: 'mia@acme.test' },
			returnAll: true,
			timeMin: '11/13/2026',
			timeMax: '11/22/2026',
			options: {},
		},
		credential: calendar,
		responses: ok({ items: [{ id: 'e1' }] }),
	},
	{
		name: 'googleCalendar event.getAll limit and offsets',
		type: 'n8n-nodes-base.googleCalendar',
		typeVersion: 1.3,
		parameters: {
			operation: 'getAll',
			calendar: { __rl: true, mode: 'list', value: 'team@example.com', cachedResultName: 'Team' },
			limit: 10,
			timeMin: '2024-05-01T00:00:00.000+02:00',
			timeMax: '2024-05-08T00:00:00.000-05:00',
			options: { orderBy: 'startTime', query: 'standup', showDeleted: true },
		},
		credential: calendar,
		responses: ok({
			items: [
				{
					id: 'e1',
					summary: 'Event 1',
					start: { dateTime: '2024-05-01T09:00:00+02:00' },
					end: { dateTime: '2024-05-01T10:00:00+02:00' },
				},
				{
					id: 'e2',
					summary: 'Event 2',
					start: { dateTime: '2024-05-02T09:00:00+02:00' },
					end: { dateTime: '2024-05-02T10:00:00+02:00' },
				},
			],
		}),
	},
	{
		name: 'googleCalendar event.getAll returnAll with time zone',
		type: 'n8n-nodes-base.googleCalendar',
		typeVersion: 1.3,
		parameters: {
			operation: 'getAll',
			calendar: { __rl: true, mode: 'id', value: 'Team%20Room@example.com' },
			returnAll: true,
			timeMin: '2024-05-01T08:00:00.000Z',
			timeMax: '2024-05-31T08:00:00.000Z',
			options: {
				timeZone: { __rl: true, mode: 'list', value: 'Europe/Berlin' },
				fields: 'items(id,summary),nextPageToken',
			},
		},
		credential: calendar,
		responses: [
			{
				body: {
					items: [
						{
							id: 'e1',
							summary: 'Event 1',
							start: { dateTime: '2024-05-01T09:00:00+02:00' },
							end: { dateTime: '2024-05-01T10:00:00+02:00' },
						},
					],
					nextPageToken: 'pg2',
				},
			},
			{
				body: {
					items: [
						{
							id: 'e2',
							summary: 'Event 2',
							start: { dateTime: '2024-05-02T09:00:00+02:00' },
							end: { dateTime: '2024-05-02T10:00:00+02:00' },
						},
					],
				},
			},
		],
	},
	{
		name: 'googleCalendar event.getAll recurring first',
		type: 'n8n-nodes-base.googleCalendar',
		typeVersion: 1.3,
		parameters: {
			resource: 'event',
			operation: 'getAll',
			calendar: { __rl: true, mode: 'id', value: 'ops@example.com' },
			timeMin: '2024-05-01T00:00:00.000Z',
			timeMax: '2024-06-01T00:00:00.000Z',
			options: { recurringEventHandling: 'first' },
		},
		credential: calendar,
		responses: ok({
			items: [
				{
					id: 'e1',
					summary: 'Event 1',
					start: { dateTime: '2024-05-01T09:00:00+02:00' },
					end: { dateTime: '2024-05-01T10:00:00+02:00' },
					recurrence: ['RRULE:FREQ=WEEKLY'],
					created: '2024-04-01T00:00:00.000Z',
				},
				{
					id: 'e2',
					summary: 'Event 2',
					start: { dateTime: '2024-05-02T09:00:00+02:00' },
					end: { dateTime: '2024-05-02T10:00:00+02:00' },
					recurrence: ['RRULE:FREQ=DAILY'],
					created: '2024-05-02T00:00:00.000Z',
				},
				{
					id: 'e3',
					summary: 'Event 3',
					start: { dateTime: '2024-05-03T09:00:00+02:00' },
					end: { dateTime: '2024-05-03T10:00:00+02:00' },
					created: '2023-01-01T00:00:00.000Z',
				},
			],
		}),
	},
	{
		name: 'rssFeedRead rss 2.0 with custom fields',
		type: 'n8n-nodes-base.rssFeedRead',
		typeVersion: 1.2,
		parameters: {
			url: 'https://feeds.example.com/feed.xml',
			options: { customFields: 'author, comments' },
		},
		responses: [
			{
				headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
				body: '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">\n<channel>\n<title>News &amp; Views</title>\n<item>\n<title>First &#8217;post&#8217;</title>\n<link>https://example.com/1</link>\n<description><![CDATA[<p>Hello <b>world</b></p><br/>Line two &amp; more &nbsp;]]></description>\n<content:encoded><![CDATA[<div>Full <i>text</i></div><p>Next</p>]]></content:encoded>\n<dc:creator>Ada</dc:creator>\n<author>ada@example.com (Ada)</author>\n<comments>https://example.com/1#c</comments>\n<category>a</category><category domain="x">b</category>\n<guid isPermaLink="false">id-1</guid>\n<enclosure url="https://example.com/a.mp3" length="10" type="audio/mpeg"/>\n<pubDate>Mon, 06 May 2024 10:00:00 GMT</pubDate>\n</item>\n<item>\n<title>Second</title>\n<description>Plain <span class="x">inline</span> text</description>\n<pubDate>Tue, 07 May 2024 08:30:00 +0200</pubDate>\n<guid>https://example.com/2</guid>\n</item>\n<item><title>No date</title><pubDate>not a date</pubDate></item>\n</channel>\n</rss>',
			},
		],
	},
	{
		name: 'rssFeedRead atom',
		type: 'n8n-nodes-base.rssFeedRead',
		typeVersion: 1.2,
		parameters: { url: 'https://feeds.example.com/feed.xml', options: {} },
		responses: [
			{
				headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
				body: '<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n<title>Atom feed</title>\n<entry>\n<title type="html">Entry &lt;one&gt;</title>\n<link rel="self" href="https://e.com/self"/><link rel="alternate" href="https://e.com/1"/>\n<id>urn:1</id>\n<published>2024-05-06T10:00:00Z</published>\n<author><name>Bob</name></author>\n<content type="html">&lt;p&gt;Hi &amp;amp; bye&lt;/p&gt;</content>\n<summary>Short</summary>\n</entry>\n<entry><title>Two</title><updated>2024-05-07T08:00:00+02:00</updated><link href="https://e.com/2"/></entry>\n</feed>',
			},
		],
	},
	{
		name: 'rssFeedRead podcast',
		type: 'n8n-nodes-base.rssFeedRead',
		typeVersion: 1.2,
		parameters: { url: 'https://feeds.example.com/feed.xml', options: {} },
		responses: [
			{
				headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
				body: '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">\n<channel><title>Pod</title>\n<item><title>Ep 1</title><itunes:duration>12:34</itunes:duration><itunes:episode>1</itunes:episode>\n<itunes:image href="https://e.com/ep1.png"/><itunes:summary>About</itunes:summary>\n<enclosure url="https://e.com/1.mp3" type="audio/mpeg" length="1"/></item>\n</channel></rss>',
			},
		],
	},
	{
		name: 'rssFeedRead rss 1.0',
		type: 'n8n-nodes-base.rssFeedRead',
		typeVersion: 1.2,
		parameters: { url: 'https://feeds.example.com/feed.xml', options: {} },
		responses: [
			{
				headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
				body: '<?xml version="1.0"?>\n<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">\n<channel rdf:about="https://e.com/"><title>RDF</title></channel>\n<item rdf:about="https://e.com/a"><title>A</title><link>https://e.com/a</link><dc:date>2024-05-06T10:00:00Z</dc:date></item>\n</rdf:RDF>',
			},
		],
	},
	// OpenAI (langchain package): message a model
	{
		name: 'openAi text.response',
		type: '@n8n/n8n-nodes-langchain.openAi',
		typeVersion: 2.3,
		parameters: {
			resource: 'text',
			operation: 'response',
			modelId: { __rl: true, mode: 'list', value: 'gpt-5-mini' },
			responses: {
				values: [
					{ role: 'user', content: 'Say hi' },
					{ role: 'assistant', content: 'Hi!' },
					{ type: 'text', role: 'user', content: 'Again' },
				],
			},
			options: { instructions: 'Be brief', maxTokens: 50, temperature: 0.2, store: false },
		},
		credential: { type: 'openAiApi', data: { apiKey: 'sk-fake', organizationId: 'org-fake' } },
		responses: ok({
			id: 'resp_1',
			error: null,
			output: [
				{ type: 'reasoning', id: 'rs_1' },
				{ type: 'message', content: [{ type: 'output_text', text: 'Hi again' }] },
			],
		}),
	},
	{
		name: 'openAi text.response json schema raw',
		type: '@n8n/n8n-nodes-langchain.openAi',
		typeVersion: 2.3,
		parameters: {
			modelId: { __rl: true, mode: 'id', value: 'gpt-4.1' },
			responses: { values: [{ content: 'Give a message' }] },
			simplify: false,
			options: {
				reasoning: { reasoningOptions: { effort: 'low' } },
				textFormat: {
					textOptions: {
						type: 'json_schema',
						name: 'msg',
						schema: '{"type":"object","properties":{"message":{"type":"string"}}}',
					},
				},
				metadata: '{"team":"ops"}',
				truncation: true,
			},
		},
		credential: {
			type: 'openAiApi',
			data: { apiKey: 'sk-fake', url: 'https://proxy.example.com/v1' },
		},
		responses: ok({
			id: 'resp_2',
			output: [
				{ type: 'message', content: [{ type: 'output_text', text: '{"message":"hello"}' }] },
			],
		}),
	},
	{
		name: 'openAi text.response json object',
		type: '@n8n/n8n-nodes-langchain.openAi',
		typeVersion: 2.3,
		parameters: {
			modelId: 'gpt-4o',
			responses: { values: [{ role: 'system', content: 'List colors' }] },
			options: { textFormat: { textOptions: { type: 'json_object', verbosity: 'low' } } },
		},
		credential: { type: 'openAiApi', data: { apiKey: 'sk-fake' } },
		responses: ok({
			id: 'resp_3',
			output: [{ type: 'message', content: [{ type: 'output_text', text: 'not json' }] }],
		}),
	},
	// Google Sheets
	{
		name: 'googleSheets sheet.read',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.7,
		parameters: {
			resource: 'sheet',
			operation: 'read',
			documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
			sheetName: { __rl: true, mode: 'list', value: 'gid=0' },
		},
		credential: sheets,
		responses: [
			{ body: sheetMeta },
			{
				body: {
					values: [
						['Name', '', 'Count', 'Note'],
						['Ada', '', 3],
						['', '', '', ''],
						['Bob', '', 0, 'x'],
					],
				},
			},
		],
	},
	{
		// The converter adds `readVersion` for reads. The v1 node ignores the parameter.
		name: 'googleSheets sheet.read filters AND (default)',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.7,
		parameters: {
			resource: 'sheet',
			operation: 'read',
			documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
			sheetName: { __rl: true, mode: 'list', value: 'gid=0' },
			readVersion: 4.7,
			filtersUI: {
				values: [
					{ lookupColumn: 'Status', lookupValue: 'open' },
					{ lookupColumn: 'Count', lookupValue: 3 },
				],
			},
		},
		items: [{}, {}],
		credential: sheets,
		responses: [{ body: sheetMeta }, filterRows, filterRows],
	},
	{
		// The converter adds `readVersion` for reads. The v1 node ignores the parameter.
		name: 'googleSheets sheet.read filters OR first match',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.7,
		parameters: {
			resource: 'sheet',
			operation: 'read',
			documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
			sheetName: { __rl: true, mode: 'list', value: 'gid=0' },
			readVersion: 4.7,
			filtersUI: {
				values: [
					{ lookupColumn: 'Name', lookupValue: 'Bob' },
					{ lookupColumn: 'Status', lookupValue: 'open' },
				],
			},
			combineFilters: 'OR',
			options: { returnFirstMatch: true },
		},
		credential: sheets,
		responses: [{ body: sheetMeta }, filterRows],
	},
	{
		// The converter adds `readVersion` for reads. The v1 node ignores the parameter.
		name: 'googleSheets sheet.read filters OR first match v4.5',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.5,
		parameters: {
			resource: 'sheet',
			operation: 'read',
			documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
			sheetName: { __rl: true, mode: 'list', value: 'gid=0' },
			readVersion: 4.5,
			filtersUI: {
				values: [
					{ lookupColumn: 'Name', lookupValue: 'Bob' },
					{ lookupColumn: 'Status', lookupValue: 'open' },
				],
			},
			combineFilters: 'OR',
			options: { returnFirstMatch: true },
		},
		credential: sheets,
		responses: [{ body: sheetMeta }, filterRows],
	},
	{
		// The converter adds `readVersion` for reads. The v1 node ignores the parameter.
		name: 'googleSheets sheet.read filters all matches v4.4',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.4,
		parameters: {
			resource: 'sheet',
			operation: 'read',
			documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
			sheetName: { __rl: true, mode: 'list', value: 'gid=0' },
			readVersion: 4.4,
			filtersUI: { values: [{ lookupColumn: 'Name', lookupValue: 'Ada' }] },
			options: { returnAllMatches: 'returnAllMatches' },
		},
		credential: sheets,
		responses: [{ body: sheetMeta }, filterRows],
	},
	{
		// The converter adds `readVersion` for reads. The v1 node ignores the parameter.
		name: 'googleSheets sheet.read filters first match v4.4',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.4,
		parameters: {
			resource: 'sheet',
			operation: 'read',
			documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
			sheetName: { __rl: true, mode: 'list', value: 'gid=0' },
			readVersion: 4.4,
			filtersUI: { values: [{ lookupColumn: 'Status', lookupValue: 'open' }] },
		},
		credential: sheets,
		responses: [{ body: sheetMeta }, filterRows],
	},
	{
		// The converter adds `readVersion` for reads. The v1 node ignores the parameter.
		name: 'googleSheets sheet.read filters no match',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.6,
		parameters: {
			resource: 'sheet',
			operation: 'read',
			documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
			sheetName: { __rl: true, mode: 'list', value: 'gid=0' },
			readVersion: 4.6,
			filtersUI: { values: [{ lookupColumn: 'Name', lookupValue: 'Zed' }] },
		},
		credential: sheets,
		responses: [{ body: sheetMeta }, filterRows],
	},
	{
		name: 'googleSheets sheet.read range by name',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.7,
		parameters: {
			resource: 'sheet',
			operation: 'read',
			documentId: {
				__rl: true,
				mode: 'url',
				value:
					'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit#gid=0',
			},
			sheetName: { __rl: true, mode: 'name', value: 'Sales Q1' },
			options: {
				dataLocationOnSheet: { values: { rangeDefinition: 'specifyRangeA1', range: 'A1:C10' } },
				outputFormatting: { values: { general: 'FORMATTED_VALUE', date: 'SERIAL_NUMBER' } },
			},
		},
		credential: sheets,
		responses: [
			{ body: sheetMeta },
			{
				body: {
					values: [
						['Region', 'Total'],
						['EU', '1,200'],
					],
				},
			},
		],
	},
	{
		name: 'googleSheets sheet.append define below',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.7,
		parameters: {
			resource: 'sheet',
			operation: 'append',
			documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
			sheetName: { __rl: true, mode: 'id', value: '123' },
			columns: {
				mappingMode: 'defineBelow',
				value: { Name: 'Cy', Count: 7, Tags: ['a', 'b'] },
				schema: [{ id: 'Name' }, { id: 'Count' }, { id: 'Tags' }],
			},
		},
		credential: sheets,
		responses: [
			{ body: sheetMeta },
			{
				body: {
					values: [
						['Name', 'Count', 'Tags', 'Other'],
						['Ada', '3'],
					],
				},
			},
			{ body: {} },
			{ body: { updatedRows: 1 } },
		],
	},
	{
		name: 'googleSheets sheet.append define below with null values',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.7,
		parameters: {
			resource: 'sheet',
			operation: 'append',
			documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
			sheetName: { __rl: true, mode: 'id', value: '123' },
			columns: {
				mappingMode: 'defineBelow',
				value: { Name: null, Count: 7 },
				schema: [
					{ id: 'Name', type: 'string' },
					{ id: 'Count', type: 'string' },
				],
			},
		},
		credential: sheets,
		responses: [
			{ body: sheetMeta },
			{
				body: {
					values: [
						['Name', 'Count'],
						['Ada', '3'],
					],
				},
			},
			{ body: {} },
			{ body: { updatedRows: 1 } },
		],
	},
	{
		name: 'googleSheets sheet.append auto map new column',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.7,
		parameters: {
			resource: 'sheet',
			operation: 'append',
			documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
			sheetName: { __rl: true, mode: 'name', value: 'Sales Q1' },
			columns: { mappingMode: 'autoMapInputData', value: {} },
			options: { cellFormat: 'RAW' },
		},
		items: [
			{ Region: 'EU', Total: 5, Owner: 'ada' },
			{ Region: 'US', row_number: 4 },
		],
		credential: sheets,
		responses: [
			{ body: sheetMeta },
			{ body: { values: [['Region', 'Total']] } },
			{ body: {} },
			{ body: {} },
			{ body: { updatedRows: 2 } },
		],
	},
	{
		name: 'googleSheets sheet.append use append',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.7,
		parameters: {
			resource: 'sheet',
			operation: 'append',
			documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
			sheetName: { __rl: true, mode: 'list', value: '123' },
			columns: { mappingMode: 'defineBelow', value: { Name: 'Di' }, schema: [{ id: 'Name' }] },
			options: { useAppend: true },
		},
		credential: sheets,
		responses: [
			{ body: sheetMeta },
			{
				body: {
					values: [
						['Name', 'Count'],
						['Ada', 1],
					],
				},
			},
			{
				body: {
					values: [
						['Name', 'Count'],
						['Ada', 1],
						['Bob', 2],
					],
				},
			},
			{ body: { updates: {} } },
		],
	},
	{
		name: 'googleSheets sheet.update',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.7,
		parameters: {
			resource: 'sheet',
			operation: 'update',
			documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
			sheetName: { __rl: true, mode: 'id', value: '123' },
			columns: {
				mappingMode: 'defineBelow',
				value: { Name: 'Bob', Count: 9, Note: null, Meta: { a: 1 } },
				matchingColumns: ['Name'],
				schema: [{ id: 'Name' }, { id: 'Count' }, { id: 'Note' }, { id: 'Meta' }],
			},
		},
		credential: sheets,
		responses: [
			{ body: sheetMeta },
			{
				body: {
					values: [
						['Name', 'Count', 'Note', 'Meta'],
						['Ada', '1'],
						['Bob', '2', 'old'],
					],
				},
			},
			{ body: { totalUpdatedCells: 3 } },
		],
	},
	{
		name: 'googleSheets sheet.update by row_number',
		type: 'n8n-nodes-base.googleSheets',
		typeVersion: 4.7,
		parameters: {
			resource: 'sheet',
			operation: 'update',
			documentId: { __rl: true, mode: 'id', value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' },
			sheetName: { __rl: true, mode: 'id', value: '123' },
			columns: {
				mappingMode: 'defineBelow',
				value: { row_number: 3, Count: 9, Note: null },
				matchingColumns: ['row_number'],
				schema: [{ id: 'Name' }, { id: 'Count' }, { id: 'Note' }, { id: 'row_number' }],
			},
		},
		credential: sheets,
		responses: [
			{ body: sheetMeta },
			{
				body: {
					values: [
						['Name', 'Count', 'Note'],
						['Ada', '1'],
						['Bob', '2', 'old'],
					],
				},
			},
			{ body: { totalUpdatedCells: 2 } },
		],
	},
];

export const EQUIVALENCE_CASES: EquivalenceCase[] = [
	...declarative,
	...handPorted,
	...DATA_TABLE_CASES,
	...SHEETS_UPSERT_CASES,
	...SHEETS_APPEND_CASES,
];

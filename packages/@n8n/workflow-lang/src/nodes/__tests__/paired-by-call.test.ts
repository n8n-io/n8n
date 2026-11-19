/**
 * What v1 pairs for a library node on three input items.
 *
 * The compiled library node runs once for each input item, and keeps, for each output item, the
 * index of the input item whose call gave it (`StepCall.pairsByCall`, `emitStep` in
 * `src/convert/steps.ts`). That is exact only when the v1 node pairs each output item with the
 * input item of its call (`pairedItem: { item: i }`), and with nothing else (not an array of
 * pairs, and not the same index on every item). This test runs the v1 node of each case on
 * three items and records what v1 gives. `PAIRS_BY_CALL_ROWS` in `src/convert/library.ts` holds
 * the rows that this table classes `by-call`; the snapshot below makes a later change of a node
 * show here.
 *
 * The cases of the SQL files (`mysql-cases.ts`, `postgres-cases.ts`) and of the mail file
 * (`email-send-cases.ts`) do not have the shape of `EquivalenceCase` (they need a database or an
 * SMTP server on this machine), so this test leaves them out. The `GMAIL_MAIL_CASES` have the
 * shape and run here.
 */
import { writeFileSync } from 'node:fs';

import { ADAPTERS, libraryCallKey } from '../../convert/library.ts';
import { convertWorkflow } from '../../convert/index.ts';
import { connect, node, webhookNode } from '../../convert/__tests__/workflows.ts';
import type { EquivalenceCase } from './equivalence.ts';
import { EQUIVALENCE_CASES } from './equivalence-cases.ts';
import { GMAIL_MAIL_CASES } from './gmail-mail-cases.ts';
import { disposeRecorder, recordV1, recorderAvailable } from './v1-recorder.ts';

interface Row {
	/** `by-call`, `all-one`, `none`, `empty`, `other` or `error`. */
	kind: string;
	/** The pair of each output item: an input index, a list of them, a value, or `error`. */
	pairs: string;
	/** The reply of the v1 node to a case that does not error, for the report. */
	note: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The `item` of a pair, when the value is one pair of one input item. */
function indexOf(pair: unknown): number | null {
	if (!isRecord(pair) || Object.keys(pair).length !== 1) return null;
	const item = pair.item;
	return typeof item === 'number' && Number.isInteger(item) ? item : null;
}

/** The pair of one output item, as short text: one index, a list of indexes, or the value. */
function pairText(value: unknown): string {
	if (value === null || value === undefined) return 'none';
	const one = indexOf(value);
	if (one !== null) return String(one);
	if (Array.isArray(value)) {
		const list = value.map(indexOf);
		if (list.every((index) => index !== null)) return `[${list.join(',')}]`;
	}
	return JSON.stringify(value);
}

/**
 * The class of a row.
 *
 * - `by-call`: each output item pairs with the input item of its call. The indices do not go
 *   back and the first is 0. A call that gives no item is no row here, so the last index need
 *   not be the last input item.
 * - `all-one`: every output item pairs with item 0. Exact only for a node that v1 runs once for
 *   all items, and the converter keeps those rows (`BATCH_OPERATIONS`) without pairs.
 * - `empty`: the node gave no item. A node that gives items for other answers is a risk, so the
 *   row stays out of the rule.
 */
function kindOf(pairs: string[], inputCount: number): string {
	if (pairs.length === 0) return 'empty';
	if (pairs.every((pair) => pair === 'none')) return 'none';
	if (!pairs.every((pair) => /^\d+$/.test(pair))) return 'other';
	const indices = pairs.map(Number);
	if (indices.every((index) => index === 0)) return 'all-one';
	const ordered = indices.every((index, k) => k === 0 || index >= indices[k - 1]!);
	const inside = indices.every((index) => index >= 0 && index < inputCount);
	return ordered && inside && indices[0] === 0 ? 'by-call' : 'other';
}

/** Three input items: the items of the case when it has several, else its item three times. */
function threeItems(c: EquivalenceCase): Array<Record<string, unknown>> {
	const items = c.items ?? [];
	if (items.length > 1) return structuredClone(items);
	const one = items[0] ?? {};
	return [structuredClone(one), structuredClone(one), structuredClone(one)];
}

/** The case on three items, as a case without settings: the node runs, and nothing else does. */
function probeCase(c: EquivalenceCase): EquivalenceCase {
	return {
		name: `${c.name} [three items]`,
		type: c.type,
		typeVersion: c.typeVersion,
		parameters: c.parameters,
		items: threeItems(c),
		responses: c.responses,
		...(c.credential ? { credential: c.credential } : {}),
		...(c.responseBytes === true ? { responseBytes: true } : {}),
		...(c.serviceResults ? { serviceResults: c.serviceResults } : {}),
	};
}

/** The `resource.operation` of the call, as the converter reads it after the adapter of the type. */
function callKeyOf(c: EquivalenceCase): string {
	const adapt = ADAPTERS[c.type];
	const adapted = adapt ? adapt(structuredClone(c.parameters), c.typeVersion) : c.parameters;
	return libraryCallKey(c.type, adapted) ?? '-';
}

async function rowOf(c: EquivalenceCase): Promise<Row> {
	const recording = await recordV1(probeCase(c));
	const note = `${c.type} ${callKeyOf(c)}`;
	if (recording.error !== undefined) {
		return { kind: 'error', pairs: 'error', note: `${note} | ${recording.error}` };
	}
	const pairs = (recording.pairs ?? []).map(pairText);
	const kind = kindOf(pairs, threeItems(c).length);
	if (kind !== 'all-one') return { kind, pairs: pairs.join(','), note };
	// Every output item pairs with item 0: that also happens when only the call of the first
	// item gives items. The answers moved by one call: a node that pairs with the index of the
	// call then pairs an item with another index.
	const moved = await recordV1({
		...probeCase(c),
		responses: [...c.responses.slice(1), c.responses[0]!],
	});
	const other =
		moved.error === undefined ? (moved.pairs ?? []).map(pairText).join(',') : moved.error;
	const follows =
		moved.error === undefined && (moved.pairs ?? []).some((pair) => pairText(pair) !== '0');
	return {
		kind: follows ? 'by-call' : 'all-one',
		pairs: pairs.join(','),
		note: `${note} | answers moved by one call: ${other}`,
	};
}

const cases: EquivalenceCase[] = [...EQUIVALENCE_CASES, ...GMAIL_MAIL_CASES].filter(
	(c) => c.subNodes === undefined,
);

/**
 * The reasons of the two readers of a library node, from the end of their diagnostics: absent
 * when the converter compiled the read of the paired item through the node.
 */
function reasons(parameters: Record<string, unknown>, typeVersion: number) {
	const sheets = node('Sheet', 'googleSheets', typeVersion, [400, 0], parameters, {
		credentials: { googleSheetsOAuth2Api: { id: 'case', name: 'case' } },
	});
	const source = node('Source', 'code', 2, [200, 0], {
		jsCode: "return [{ json: { id: 'a' } }, { json: { id: 'b' } }, { json: { id: 'c' } }];",
	});
	const reader = (name: string, type: string, read: string) =>
		type === 'code'
			? node(name, 'code', 2, [600, 0], {
					mode: 'runOnceForEachItem',
					jsCode: `class Box {}\nreturn { json: { id: ${read} } };`,
				})
			: node(name, 'set', 3.4, [600, 200], {
					mode: 'raw',
					options: {},
					jsonOutput: `={ "id": "{{ ${read} }}" }`,
				});
	const result = convertWorkflow({
		name: 'Paired read through a library node',
		nodes: [
			webhookNode(),
			source,
			sheets,
			reader('Secret Reader', 'code', "$('Source').item.json.id"),
			reader('Secret Expression', 'set', "$('Source').item.json.id"),
		],
		connections: connect([
			['Webhook', 0, 'Source', 0],
			['Source', 0, 'Sheet', 0],
			['Sheet', 0, 'Secret Reader', 0],
			['Sheet', 0, 'Secret Expression', 0],
		]),
		settings: { executionOrder: 'v1' },
	});
	const of = (code: string, name: string) => {
		const found = result.diagnostics.find((d) => d.code === code && d.node === name);
		return found === undefined ? undefined : /\[pairing: (.*)\]$/.exec(found.message)?.[1];
	};
	return {
		code: of('code-node-reference', 'Secret Reader'),
		expression: of('paired-item', 'Secret Expression'),
	};
}

describe('the compiled read of a paired item through a library node', () => {
	it('compiles through a Sheets read, which pairs by call', () => {
		const out = reasons(
			{
				resource: 'sheet',
				operation: 'read',
				documentId: { __rl: true, mode: 'id', value: 'doc1' },
				sheetName: { __rl: true, mode: 'list', value: 'gid=0' },
			},
			4.7,
		);
		expect(out.code).toBeUndefined();
		expect(out.expression).toBeUndefined();
	});

	it('does not compile through a Sheets clear, which pairs nothing', () => {
		const out = reasons(
			{
				resource: 'sheet',
				operation: 'clear',
				documentId: { __rl: true, mode: 'id', value: 'doc1' },
				sheetName: { __rl: true, mode: 'name', value: 'Sheet1' },
			},
			4.7,
		);
		expect(out.code).toBe('no pairs after n8n-nodes-base.googleSheets@4.7');
		expect(out.expression).toBe('no pairs after n8n-nodes-base.googleSheets@4.7');
	});
});

/**
 * What v1 pairs for each case on three input items: the class and the pairs of its output items
 * (`<class> <pair>,<pair>,...`). A change of a node, or of its version, shows here.
 */
const SNAPSHOT: Record<string, string> = {
	'adalo collection.get': 'by-call 0,1,2',
	'adalo collection.delete': 'by-call 0,1,2',
	'adalo collection.getAll limit': 'by-call 0,0,1,1,2,2',
	'currents run.getAll filters': 'by-call 0,0,1,1,2,2',
	'currents run.get': 'by-call 0,1,2',
	'currents action.create': 'by-call 0,1,2',
	'currents action.update': 'by-call 0,1,2',
	'currents project.getAll': 'by-call 0,1,2',
	'currents run.reset': 'by-call 0,1,2',
	'googleBusinessProfile post.get': 'by-call 0,1,2',
	'googleBusinessProfile review.reply': 'by-call 0,1,2',
	'googleBusinessProfile post.delete': 'by-call 0,1,2',
	'highLevel contact.get': 'by-call 0,1,2',
	'highLevel opportunity.update': 'by-call 0,1,2',
	'highLevel task.delete': 'by-call 0,1,2',
	'highLevel calendar.getFreeSlots': 'by-call 0,1,2',
	'jinaAi reader.read': 'by-call 0,1,2',
	'jinaAi reader.search': 'by-call 0,1,2',
	'npm package.getMetadata': 'by-call 0,1,2',
	'npm distTag.getMany': 'by-call 0,1,2',
	'perplexity search.search': 'by-call 0,1,2',
	'perplexity embedding.createEmbedding': 'by-call 0,1,2',
	'perplexity agent.createResponse': 'by-call 0,1,2',
	'sendInBlue contact.create': 'by-call 0,1,2',
	'sendInBlue contact.get': 'by-call 0,1,2',
	'sendInBlue contact.getAll': 'by-call 0,0,1,1,2,2',
	'sendInBlue contact.update': 'by-call 0,1,2',
	'sendInBlue sender.create': 'by-call 0,1,2',
	'sendInBlue attribute.delete': 'by-call 0,1,2',
	'whatsApp media.mediaUrlGet': 'by-call 0,1,2',
	'whatsApp media.mediaDelete': 'by-call 0,1,2',
	'telegram message.sendMessage': 'by-call 0,1,2',
	'telegram message.sendMessage html options': 'by-call 0,1,2',
	'telegram message.sendMessage no attribution': 'by-call 0,1,2',
	'airtable record.create': 'by-call 0,1,2',
	'airtable record.create auto map': 'by-call 0,1',
	'airtable record.search limit': 'other [0],[1],[2]',
	'airtable record.search all pages': 'other [0],[0],[0],[1],[2]',
	'airtable record.create schema types': 'by-call 0,1,2',
	'airtable record.update by id typecast': 'by-call 0,1,2',
	'airtable record.update by id auto map': 'by-call 0,1',
	'airtable record.upsert by column': 'by-call 0,1,2',
	'airtable record.upsert by id creates on 422': 'by-call 0,1,2',
	'airtable record.upsert several matches': 'by-call 0,0,1,1,2,2',
	'airtable record.search v2.1 flat fields': 'other [0],[0],[1],[1]',
	'slack message.post v2.3 channel thread options': 'by-call 0,1,2',
	'slack message.post v2 user by name with bot profile': 'by-call 0,1',
	'slack message.post v2.4 blocks': 'by-call 0,1,2',
	'microsoftOutlook message.send': 'by-call 0,1',
	'microsoftOutlook message.move': 'by-call 0,1',
	'microsoftOutlook message.delete shared mailbox': 'by-call 0,1,2',
	'microsoftOutlook message.send shared mailbox': 'by-call 0,1,2',
	'slack message.post v2.3 link to the workflow': 'by-call 0,1,2',
	'slack message.post v2.4 blocks with the link and OAuth2 user token': 'by-call 0,1,2',
	'slack message.post v2.2 OAuth2 bot token': 'by-call 0,1,2',
	'slack reaction.add': 'by-call 0,1,2',
	'slack channel.history all pages sorted': 'by-call 0,0,0,1,2',
	'slack channel.history limit': 'by-call 0,0,1,1,2,2',
	'supabase row.getAll any filter with limit': 'by-call 0,0,1,1,2,2',
	'supabase row.getAll all filters return all': 'by-call 0,1,2',
	'supabase row.getAll string filter': 'by-call 0,1',
	'supabase row.create define below for all items': 'by-call 0,1',
	'supabase row.create auto map': 'by-call 0,1',
	'supabase row.get': 'by-call 0,1,2',
	'supabase row.update define below': 'by-call 0,1,2',
	'supabase row.update auto map': 'by-call 0,1,2',
	'notion databasePage.getAll v2.2 manual filters': 'by-call 0,0,0,1,1,2,2',
	'notion databasePage.getAll v2.2 property name clash': 'by-call 0,1,2',
	'notion databasePage.getAll v2.2 all filters raw': 'by-call 0,1,2',
	'notion databasePage.getAll v2.2 json filter': 'by-call 0,1',
	'notion databasePage.update v2.2 properties': 'by-call 0,1,2',
	'notion databasePage.create v2.2 for all items': 'by-call 0,1',
	'notion databasePage.create': 'by-call 0,1,2',
	'notion databasePage.create markdown raw': 'error error',
	'notion databasePage.getAll json filter and sort': 'by-call 0,0,0,1,1,2,2',
	'notion databasePage.getAll all raw': 'by-call 0,0,1,2',
	'gmail message.send text': 'by-call 0,1,2',
	'gmail draft.create text with all addresses': 'by-call 0,1',
	'gmail draft.create html in a thread, no recipient': 'by-call 0,1,2',
	'gmail draft.create with no options and no text': 'by-call 0,1,2',
	'gmail message.reply to the sender and the recipients': 'error error',
	'gmail message.reply v2.2 to the reply address only': 'error error',
	'gmail thread.reply to the recipients only': 'error error',
	'gmail draft.create with an address that has no at sign': 'error error',
	'gmail message.send names that are not ASCII and a subject with a line break': 'by-call 0,1,2',
	'gmail message.send html sender name': 'by-call 0,1,2',
	'gmail message.getAll simple limit and filters': 'by-call 0,0',
	'gmail message.getAll returnAll pages and sender': 'all-one 0,0',
	'gmail message.getAll no messages': 'empty ',
	'gmail message.get simple': 'by-call 0,1,2',
	'gmail message.addLabels': 'by-call 0,1',
	'gmail message.removeLabels': 'by-call 0,1,2',
	'gmail message.markAsRead': 'by-call 0,1,2',
	'gmail message.markAsUnread': 'by-call 0,1,2',
	'gmail message.delete': 'by-call 0,1,2',
	'googleDrive folder.create in a folder': 'by-call 0,1,2',
	'googleDrive folder.create in a shared drive, full output': 'by-call 0,1,2',
	'googleDrive file.createFromText in the root': 'by-call 0,1',
	'googleDrive file.createFromText in a folder with properties': 'by-call 0,1,2',
	'googleDrive file.createFromText in a shared drive, no content': 'by-call 0,1,2',
	'googleDrive file.createFromText as a Google document': 'by-call 0,1,2',
	'googleDrive file.copy with the cached name': 'by-call 0,1,2',
	'googleDrive file.copy to a folder, name read': 'by-call 0,1,2',
	'googleDrive file.move': 'by-call 0,1,2',
	'googleDrive file.deleteFile to the trash': 'by-call 0,1,2',
	'googleDrive file.deleteFile for good': 'by-call 0,1,2',
	'googleDrive fileFolder.search null query in root': 'empty ',
	'googleDrive fileFolder.search name in folder with types': 'by-call 0,0,1,1,2,2',
	'googleDrive fileFolder.search query returnAll in a shared drive': 'by-call 0,0,1,2',
	'googleDrive fileFolder.search root folder of my drive': 'empty ',
	'googleCalendar event.getAll empty bounds': 'by-call 0,0,1,1,2,2',
	'googleCalendar event.delete': 'by-call 0,1',
	'googleCalendar event.getAll US dates': 'by-call 0,1,2',
	'googleCalendar event.getAll limit and offsets': 'by-call 0,0,1,1,2,2',
	'googleCalendar event.getAll returnAll with time zone': 'by-call 0,0,1,2',
	'googleCalendar event.getAll recurring first': 'by-call 0,0,1,1,2,2',
	'rssFeedRead rss 2.0 with custom fields': 'other [0],[0],[0],[1],[1],[1],[2],[2],[2]',
	'rssFeedRead version 1.1': 'other [0],[1],[2]',
	'rssFeedRead atom': 'other [0],[0],[1],[1],[2],[2]',
	'rssFeedRead podcast': 'other [0],[1],[2]',
	'rssFeedRead rss 1.0': 'other [0],[1],[2]',
	'openAi text.response': 'by-call 0,1,2',
	'openAi text.response json schema raw': 'by-call 0,1,2',
	'openAi text.response json object': 'by-call 0,1,2',
	'googleSheets sheet.read': 'by-call 0,0,1,1,2,2',
	'googleSheets sheet.read filters AND (default)': 'by-call 0,0,0,1,1,1',
	'googleSheets sheet.read filters OR first match': 'by-call 0,1,2',
	'googleSheets sheet.read filters OR first match v4.5': 'by-call 0,0,1,1,2,2',
	'googleSheets sheet.read filters all matches v4.4': 'by-call 0,0,1,1,2,2',
	'googleSheets sheet.read filters first match v4.4': 'by-call 0,1,2',
	'googleSheets sheet.read filters no match': 'empty ',
	'googleSheets sheet.read range by name': 'by-call 0,1,2',
	'googleSheets sheet.append define below': 'by-call 0,1,2',
	'googleSheets sheet.append define below with null values': 'by-call 0,1,2',
	'googleSheets sheet.append auto map new column': 'by-call 0,1',
	'googleSheets sheet.append use append': 'by-call 0,1,2',
	'googleSheets sheet.update': 'by-call 0,1,2',
	'googleSheets sheet.update by row_number': 'by-call 0,1,2',
	'telegram message.sendMessage: failed request 400 with a JSON body': 'error error',
	'telegram message.sendMessage: failed request 400 with a text body': 'error error',
	'telegram message.sendMessage: failed request 401 with a JSON body': 'error error',
	'telegram message.sendMessage: failed request 401 with a text body': 'error error',
	'telegram message.sendMessage: failed request 403 with a JSON body': 'error error',
	'telegram message.sendMessage: failed request 403 with a text body': 'error error',
	'telegram message.sendMessage: failed request 404 with a JSON body': 'error error',
	'telegram message.sendMessage: failed request 404 with a text body': 'error error',
	'telegram message.sendMessage: failed request 429 with a JSON body': 'error error',
	'telegram message.sendMessage: failed request 429 with a text body': 'error error',
	'telegram message.sendMessage: failed request 500 with a JSON body': 'error error',
	'telegram message.sendMessage: failed request 500 with a text body': 'error error',
	'airtable record.create: failed request 400 with a JSON body': 'error error',
	'airtable record.create: failed request 400 with a text body': 'error error',
	'airtable record.create: failed request 401 with a JSON body': 'error error',
	'airtable record.create: failed request 401 with a text body': 'error error',
	'airtable record.create: failed request 403 with a JSON body': 'error error',
	'airtable record.create: failed request 403 with a text body': 'error error',
	'airtable record.create: failed request 404 with a JSON body': 'error error',
	'airtable record.create: failed request 404 with a text body': 'error error',
	'airtable record.create: failed request 429 with a JSON body': 'error error',
	'airtable record.create: failed request 429 with a text body': 'error error',
	'airtable record.create: failed request 500 with a JSON body': 'error error',
	'airtable record.create: failed request 500 with a text body': 'error error',
	'airtable record.update by id typecast: failed request 400 with a JSON body': 'error error',
	'airtable record.update by id typecast: failed request 400 with a text body': 'error error',
	'airtable record.update by id typecast: failed request 401 with a JSON body': 'error error',
	'airtable record.update by id typecast: failed request 401 with a text body': 'error error',
	'airtable record.update by id typecast: failed request 403 with a JSON body': 'error error',
	'airtable record.update by id typecast: failed request 403 with a text body': 'error error',
	'airtable record.update by id typecast: failed request 404 with a JSON body': 'error error',
	'airtable record.update by id typecast: failed request 404 with a text body': 'error error',
	'airtable record.update by id typecast: failed request 429 with a JSON body': 'error error',
	'airtable record.update by id typecast: failed request 429 with a text body': 'error error',
	'airtable record.update by id typecast: failed request 500 with a JSON body': 'error error',
	'airtable record.update by id typecast: failed request 500 with a text body': 'error error',
	'notion databasePage.getAll v2.2 json filter: failed request 400 with a JSON body': 'error error',
	'notion databasePage.getAll v2.2 json filter: failed request 400 with a text body': 'error error',
	'notion databasePage.getAll v2.2 json filter: failed request 401 with a JSON body': 'error error',
	'notion databasePage.getAll v2.2 json filter: failed request 401 with a text body': 'error error',
	'notion databasePage.getAll v2.2 json filter: failed request 403 with a JSON body': 'error error',
	'notion databasePage.getAll v2.2 json filter: failed request 403 with a text body': 'error error',
	'notion databasePage.getAll v2.2 json filter: failed request 404 with a JSON body': 'error error',
	'notion databasePage.getAll v2.2 json filter: failed request 404 with a text body': 'error error',
	'notion databasePage.getAll v2.2 json filter: failed request 429 with a JSON body': 'error error',
	'notion databasePage.getAll v2.2 json filter: failed request 429 with a text body': 'error error',
	'notion databasePage.getAll v2.2 json filter: failed request 500 with a JSON body': 'error error',
	'notion databasePage.getAll v2.2 json filter: failed request 500 with a text body': 'error error',
	'notion databasePage.create: failed request 400 with a JSON body': 'error error',
	'notion databasePage.create: failed request 400 with a text body': 'error error',
	'notion databasePage.create: failed request 401 with a JSON body': 'error error',
	'notion databasePage.create: failed request 401 with a text body': 'error error',
	'notion databasePage.create: failed request 403 with a JSON body': 'error error',
	'notion databasePage.create: failed request 403 with a text body': 'error error',
	'notion databasePage.create: failed request 404 with a JSON body': 'error error',
	'notion databasePage.create: failed request 404 with a text body': 'error error',
	'notion databasePage.create: failed request 429 with a JSON body': 'error error',
	'notion databasePage.create: failed request 429 with a text body': 'error error',
	'notion databasePage.create: failed request 500 with a JSON body': 'error error',
	'notion databasePage.create: failed request 500 with a text body': 'error error',
	'supabase row.get: failed request 400 with a JSON body': 'error error',
	'supabase row.get: failed request 400 with a text body': 'error error',
	'supabase row.get: failed request 401 with a JSON body': 'error error',
	'supabase row.get: failed request 401 with a text body': 'error error',
	'supabase row.get: failed request 403 with a JSON body': 'error error',
	'supabase row.get: failed request 403 with a text body': 'error error',
	'supabase row.get: failed request 404 with a JSON body': 'error error',
	'supabase row.get: failed request 404 with a text body': 'error error',
	'supabase row.get: failed request 429 with a JSON body': 'error error',
	'supabase row.get: failed request 429 with a text body': 'error error',
	'supabase row.get: failed request 500 with a JSON body': 'error error',
	'supabase row.get: failed request 500 with a text body': 'error error',
	'gmail message.send text: failed request 400 with a JSON body': 'error error',
	'gmail message.send text: failed request 400 with a text body': 'error error',
	'gmail message.send text: failed request 403 with a JSON body': 'error error',
	'gmail message.send text: failed request 403 with a text body': 'error error',
	'gmail message.send text: failed request 404 with a JSON body': 'error error',
	'gmail message.send text: failed request 404 with a text body': 'error error',
	'gmail message.send text: failed request 429 with a JSON body': 'error error',
	'gmail message.send text: failed request 429 with a text body': 'error error',
	'gmail message.send text: failed request 500 with a JSON body': 'error error',
	'gmail message.send text: failed request 500 with a text body': 'error error',
	'dataTable row.get by id': 'by-call 0,0,1,1,2,2',
	'dataTable row.get by id, version 1': 'by-call 0,0,1,1,2,2',
	'dataTable row.insert, version 1': 'all-one 0',
	'dataTable row.get by name, filters, order, all pages': 'error error',
	'dataTable row.get with a limit and an empty number condition': 'error error',
	'dataTable row.insert of two items with schema casts': 'by-call 0,1',
	'dataTable row.insert auto-mapped, optimized bulk': 'none none',
	'dataTable row.update by email': 'error error',
	'dataTable row.upsert by id, dry run': 'error error',
	'dataTable row.deleteRows with like': 'error error',
	'dataTable row.rowExists hit': 'error error',
	'dataTable row.rowNotExists miss': 'error error',
	'dataTable row.get, gt on a date column': 'error error',
	'dataTable row.get, lt on a date column': 'error error',
	'dataTable row.get, gte on a date column': 'error error',
	'dataTable row.get, gt on a date column with ISO date-time text': 'error error',
	'dataTable row.get, gte on a string column': 'error error',
	'googleSheets sheet.appendOrUpdate updates a matching row': 'by-call 0,1',
	'googleSheets sheet.appendOrUpdate appends a new key': 'by-call 0,1,2',
	'googleSheets sheet.appendOrUpdate auto-map with a new column': 'by-call 0,1',
	'googleSheets sheet.appendOrUpdate with append and a header row': 'by-call 0,1,2',
	'googleSheets sheet.append v4.0 define below without a schema': 'by-call 0,1,2',
	'googleSheets sheet.append v4.4 define below without a schema': 'error error',
	'googleSheets sheet.append v4.7 columns in another order and one more in the sheet':
		'by-call 0,1,2',
	'googleSheets sheet.append v4.7 with a column that the sheet no longer has': 'error error',
	'googleSheets sheet.clear whole sheet': 'none none,none',
	'googleSheets sheet.clear whole sheet and keep the first row': 'none none,none,none',
	'googleSheets sheet.clear rows': 'none none,none,none',
	'googleSheets sheet.clear columns': 'none none,none,none',
	'googleSheets sheet.clear one column': 'none none,none,none',
	'googleSheets sheet.clear a range with a sheet name in it': 'none none,none,none',
	'googleSheets sheet.clear the default range': 'none none,none,none',
	'googleSheets sheet.delete rows': 'other [0,1]',
	'googleSheets sheet.delete one row by default': 'other [0,1,2]',
	'googleSheets sheet.delete columns': 'other [0,1,2]',
	'googleSheets sheet.read with a service account': 'by-call 0,0,1,1,2,2',
	'googleSheets sheet.append with a service account': 'by-call 0,1,2',
	'googleSheets failed request 400': 'error error',
	'googleSheets failed sheet lookup 400': 'error error',
	'googleCalendar failed request 400': 'error error',
	'microsoftOutlook failed request 400': 'error error',
	'googleSheets failed request 403': 'error error',
	'googleSheets failed sheet lookup 403': 'error error',
	'googleCalendar failed request 403': 'error error',
	'microsoftOutlook failed request 403': 'error error',
	'googleSheets failed request 404': 'error error',
	'googleSheets failed sheet lookup 404': 'error error',
	'googleCalendar failed request 404': 'error error',
	'microsoftOutlook failed request 404': 'error error',
	'googleSheets failed request 429': 'error error',
	'googleSheets failed sheet lookup 429': 'error error',
	'googleCalendar failed request 429': 'error error',
	'microsoftOutlook failed request 429': 'error error',
	'googleSheets failed request 500': 'error error',
	'googleSheets failed sheet lookup 500': 'error error',
	'googleCalendar failed request 500': 'error error',
	'microsoftOutlook failed request 500': 'error error',
	'microsoftOutlook failed request 400 with the message of Microsoft Graph': 'error error',
	'microsoftOutlook failed send 403': 'error error',
	'microsoftTeams channel.create': 'by-call 0,1',
	'microsoftTeams channel.create team from the list, no options': 'by-call 0,1,2',
	'microsoftTeams channel.create team id that is not a GUID': 'error error',
	'microsoftTeams channel.create team id with text after the GUID': 'by-call 0,1,2',
	'microsoftTeams channel.deleteChannel': 'by-call 0,1,2',
	'microsoftTeams channel.deleteChannel that fails': 'error error',
	'microsoftTeams channel.get': 'by-call 0,1,2',
	'microsoftTeams channel.get that fails': 'error error',
	'microsoftTeams channel.get channel id with a slash': 'error error',
	'microsoftTeams channel.get empty channel id': 'error error',
	'microsoftTeams channel.getAll with a limit': 'by-call 0,0,1,1,2,2',
	'microsoftTeams channel.getAll all pages': 'by-call 0,0,1,2',
	'microsoftTeams channel.getAll next link to another host': 'error error',
	'microsoftTeams channel.update': 'by-call 0,1,2',
	'microsoftTeams channelMessage.create with the link to the workflow': 'by-call 0,1',
	'microsoftTeams channelMessage.create as a reply, no link': 'by-call 0,1,2',
	'microsoftTeams channelMessage.get': 'by-call 0,1,2',
	'microsoftTeams channelMessage.getAll with a limit and two pages': 'by-call 0,0,0,1,1,2,2',
	'microsoftTeams channelMessage.getAll all': 'by-call 0,0,1,1,2,2',
	'microsoftTeams channelMessage.getAllReplies': 'by-call 0,1,2',
	'microsoftTeams channelMessage.reply with the link': 'by-call 0,1,2',
	'microsoftTeams channelMessage.reply no link': 'by-call 0,1,2',
	'microsoftTeams channelMessage.softDeleteMessage': 'by-call 0,1,2',
	'microsoftTeams channelMessage.undoSoftDeleteMessage of a reply': 'by-call 0,1,2',
	'microsoftTeams chat.get': 'by-call 0,1,2',
	'microsoftTeams chat.get that is not there': 'error error',
	'microsoftTeams chat.getAll with a limit': 'by-call 0,0,0,1,2',
	'microsoftTeams chat.getAll all': 'by-call 0,1,2',
	'microsoftTeams chatMember.getAll': 'by-call 0,1,2',
	'microsoftTeams chatMember.remove': 'by-call 0,1,2',
	'microsoftTeams chatMessage.create with the link to the workflow': 'by-call 0,1',
	'microsoftTeams chatMessage.create html, no link, Microsoft OAuth2': 'by-call 0,1,2',
	'microsoftTeams chatMessage.get': 'by-call 0,1,2',
	'microsoftTeams chatMessage.get that fails': 'error error',
	'microsoftTeams chatMessage.getAll with a limit': 'by-call 0,0,1,1,2,2',
	'microsoftTeams chatMessage.getAll all pages': 'by-call 0,0,1,2',
	'microsoftTeams task.create': 'by-call 0,1,2',
	'microsoftTeams task.create no options': 'by-call 0,1,2',
	'microsoftTeams task.deleteTask': 'by-call 0,1,2',
	'microsoftTeams task.get': 'by-call 0,1,2',
	'microsoftTeams task.getAll of the member': 'by-call 0,1,2',
	'microsoftTeams task.getAll of a plan': 'by-call 0,0,1,1,2,2',
	'microsoftTeams task.update': 'by-call 0,1,2',
	'microsoftTeams task.get status 500': 'error error',
	'microsoftTeams task.get status 404': 'error error',
	'microsoftTeams task.create status 400': 'error error',
	'microsoftTeams chatMember.remove status 403': 'error error',
	'microsoftTeams chat.getAll status 429 on the second page': 'error error',
	'microsoftTeams channel.update status 418': 'error error',
	'microsoftTeams task.get status 501': 'error error',
	'microsoftTeams task.get id of dots': 'error error',
	'microsoftTeams task.get id with a bad percent code': 'error error',
	'microsoftTeams task.get id that decodes to a percent sign': 'error error',
	'microsoftTeams task.get id with other letters and spaces around it': 'by-call 0,1,2',
	'microsoftTeams task.get id that is a number': 'by-call 0,1,2',
	'openAi text.message': 'by-call 0,0,1,1,2,2',
	'openAi text.message json raw': 'by-call 0,1,2',
	'openAi text.message empty prompt': 'error error',
	'openAi text.message custom header': 'by-call 0,1,2',
	'openAi text.response 2.1 no built-in tools': 'by-call 0,1,2',
	'openAi text.response 2': 'by-call 0,1,2',
	'openAi text.message status 400': 'error error',
	'openAi text.response status 400': 'error error',
	'openAi text.message status 401': 'error error',
	'openAi text.response status 401': 'error error',
	'openAi text.message status 404': 'error error',
	'openAi text.response status 404': 'error error',
	'openAi text.message status 418': 'error error',
	'openAi text.response status 418': 'error error',
	'openAi text.message status 429': 'error error',
	'openAi text.response status 429': 'error error',
	'openAi text.message status 500': 'error error',
	'openAi text.response status 500': 'error error',
	'openAi text.message status 503': 'error error',
	'openAi text.response status 503': 'error error',
	'openAi text.message status 599': 'error error',
	'openAi text.response status 599': 'error error',
	'anthropic text.message defaults': 'by-call 0,1,2',
	'anthropic text.message options': 'by-call 0,1,2',
	'anthropic text.message status 401, then answer': 'by-call 0,1,2',
	'anthropic text.message raw output': 'by-call 0,1,2',
	'anthropic text.message paused turns': 'by-call 0,1,2',
	'anthropic text.message tool use without tools': 'by-call 0,1,2',
	'anthropic text.message tool use at the iteration limit': 'by-call 0,1,2',
	'anthropic text.message empty prompt': 'error error',
	'anthropic text.message status 400': 'error error',
	'anthropic text.message status 401': 'error error',
	'anthropic text.message status 404': 'error error',
	'anthropic text.message status 418': 'error error',
	'anthropic text.message status 429': 'error error',
	'anthropic text.message status 500': 'error error',
	'anthropic text.message status 503': 'error error',
	'anthropic text.message status 599': 'error error',
	'googleGemini text.message defaults': 'by-call 0,1,2',
	'googleGemini text.message options': 'by-call 0,0,1,1,2,2',
	'googleGemini text.message version 1 raw output': 'by-call 0,1,2',
	'googleGemini text.message function call without tools': 'by-call 0,1,2',
	'googleGemini text.message function call at the iteration limit': 'by-call 0,1,2',
	'googleGemini text.message gemma answers as another model': 'error error',
	'googleGemini text.message answer without candidates': 'error error',
	'googleGemini text.message empty prompt': 'error error',
	'googleGemini text.message status 401, then answer': 'by-call 0,1,2',
	'googleGemini text.message status 400': 'error error',
	'googleGemini text.message status 401': 'error error',
	'googleGemini text.message status 404': 'error error',
	'googleGemini text.message status 418': 'error error',
	'googleGemini text.message status 429': 'error error',
	'googleGemini text.message status 500': 'error error',
	'googleGemini text.message status 503': 'error error',
	'googleGemini text.message status 599': 'error error',
	'googleGemini text.message stop, wrong option type': 'error error',
	'googleGemini text.message continue': 'error error',
	'googleGemini text.message error output': 'error error',
	'googleGemini text.message retry continue': 'error error',
	'anthropic text.message stop': 'error error',
	'anthropic text.message continue': 'error error',
	'anthropic text.message error output': 'error error',
	'anthropic text.message retry continue': 'error error',
	'anthropic text.message retry then answer': 'error error',
	'openAi text.message stop': 'error error',
	'openAi text.message continue': 'error error',
	'openAi text.message continue (old setting)': 'error error',
	'openAi text.message error output': 'error error',
	'openAi text.message error output all fail': 'error error',
	'openAi text.message retry then answer': 'error error',
	'openAi text.message retry continue': 'error error',
	'openAi text.message retry error output': 'error error',
	'openAi text.message always output data': 'empty ',
	'openAi text.message execute once': 'by-call 0,1',
	'openAi text.response continue': 'error error',
	'openAi text.response error output': 'error error',
	'openAi text.response retry error output': 'error error',
	'openAi text.message network ECONNREFUSED, continue': 'error error',
	'openAi text.message network ENOTFOUND, continue': 'error error',
	'openAi text.message network ETIMEDOUT, continue': 'error error',
	'openAi text.message network ECONNRESET, continue': 'error error',
	'openAi text.message network EAI_AGAIN, continue': 'error error',
	'openAi text.message network EHOSTUNREACH, continue': 'error error',
	'openAi text.message network, stop': 'error error',
	'openAi text.message network, error output': 'error error',
	'openAi text.response network, continue': 'error error',
	'anthropic text.message network, continue': 'error error',
	'googleGemini text.message network, error output': 'error error',
	'telegram message.sendMessage no attribution: error item, continue': 'error error',
	'telegram message.sendMessage no attribution: error item, error output': 'error error',
	'telegram message.sendMessage no attribution: error item, continue, text body': 'error error',
	'telegram message.sendMessage no attribution: error item, error output, text body': 'error error',
	'gmail message.delete: error item, continue': 'error error',
	'gmail message.delete: error item, error output': 'error error',
	'gmail draft.create with an address that has no at sign: error item, continue': 'error error',
	'gmail draft.create with an address that has no at sign: error item, error output': 'error error',
	'supabase row.get: error item, continue': 'error error',
	'supabase row.get: error item, error output': 'error error',
	'supabase row.create define below for all items: error item, continue': 'error error',
	'supabase row.create define below for all items: error item, error output': 'error error',
	'supabase row.update define below: error item, continue': 'error error',
	'supabase row.update define below: error item, error output': 'error error',
	'googleDrive file.deleteFile for good: error item, continue': 'error error',
	'googleDrive file.deleteFile for good: error item, error output': 'error error',
	'notion databasePage.create: error item, continue': 'error error',
	'notion databasePage.create: error item, error output': 'error error',
	'slack reaction.add: error item, continue': 'error error',
	'slack reaction.add: error item, error output': 'error error',
	'googleSheets failed request 404: error item, continue': 'error error',
	'googleSheets failed request 404: error item, error output': 'error error',
	'googleCalendar failed request 404: error item, continue': 'error error',
	'googleCalendar failed request 404: error item, error output': 'error error',
	'microsoftOutlook failed request 404: error item, continue': 'error error',
	'microsoftOutlook failed request 404: error item, error output': 'error error',
	'microsoftTeams task.get status 404: error item, continue': 'error error',
	'microsoftTeams task.get status 404: error item, error output': 'error error',
	'send text with one file': 'by-call 0,1,2',
	'send html with the attribution and three files': 'by-call 0,1,2',
	'send a file without a name and a sender name': 'by-call 0,1,2',
	'send for two items, each with its file': 'by-call 0,1',
	'send with an empty list of files': 'by-call 0,1,2',
	'send with a binary field that the item does not have': 'error error',
	'send with files and an item without binary data': 'error error',
	'send of version 2 without the attribution': 'by-call 0,1,2',
	'send with an option of a reply that the node does not read': 'by-call 0,1,2',
	'reply with a file': 'error error',
	'reply with the attribution option, which the node does not read': 'error error',
	'draft in a thread with a file': 'by-call 0,1,2',
	'draft without the operation parameter': 'by-call 0,1,2',
	'send to an address with a local part that is not ASCII': 'by-call 0,1,2',
	'send a file with a name that is not ASCII': 'by-call 0,1,2',
};

describe.runIf(recorderAvailable())('what v1 pairs for a library node on three items', () => {
	afterAll(async () => {
		await disposeRecorder();
	});

	it('gives the pairs of the snapshot', { timeout: 880_000 }, async () => {
		const table: Record<string, Row> = {};
		for (const c of cases) table[c.name] = await rowOf(c);
		for (const [name, row] of Object.entries(table)) {
			console.log(`${row.kind}\t${row.pairs}\t${row.note}\t${name}`);
		}
		const counts: Record<string, number> = {};
		for (const row of Object.values(table)) counts[row.kind] = (counts[row.kind] ?? 0) + 1;
		console.log(`count ${Object.keys(table).length} ${JSON.stringify(counts)}`);
		if (process.env.PAIRS_OUT !== undefined) {
			writeFileSync(process.env.PAIRS_OUT, JSON.stringify(table, null, '\t'));
		}
		const actual: Record<string, string> = {};
		for (const [name, row] of Object.entries(table)) {
			actual[name] = `${row.kind} ${row.pairs}`;
		}
		expect(actual).toEqual(SNAPSHOT);
	});
});

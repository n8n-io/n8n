/**
 * Poll equivalence of the compiled Gmail Trigger (`nodes/gmail-trigger.ts`)
 * and the v1 node, versions 1 to 1.4 (spec section 9.8).
 *
 * A fake mailbox answers the Gmail API. Each case is a timeline: mail arrives,
 * then a poll runs, again and again. The v1 node polls first (its real `poll`
 * from the built `n8n-nodes-base`, in production mode); its requests and the
 * answers it got are recorded. The library poll then runs in the reference
 * runner and in the bytecode VM with the recorded answers and the same static
 * data. All three must send the same requests, give the same items, and leave
 * the same static data.
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { DEFAULT_NODE_PACKAGES } from '../../credentials/types.ts';
import type { Fixture } from '../../reference/runner.ts';
import { jsonCopy, runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

const nodesBase = join(DEFAULT_NODE_PACKAGES[0]);
const built = existsSync(join(nodesBase, 'dist/nodes/Google/Gmail/GmailTrigger.node.js'));

interface Mail {
	id: string;
	/** Seconds since the epoch. */
	at: number;
	labels?: string[];
	from?: string;
	subject?: string;
}

interface Request {
	method: string;
	url: string;
	qs: unknown;
}

interface Answer {
	status: number;
	headers: Record<string, string>;
	body: unknown;
}

/** The Gmail API over a list of messages, as far as the trigger uses it. */
class Mailbox {
	mail: Mail[] = [];

	/** Message ids whose next fetches fail, with the number of failures left. */
	failing = new Map<string, number>();

	readonly pageSize: number;

	constructor(pageSize = 3) {
		this.pageSize = pageSize;
	}

	answer(url: string, qs: Json): Answer {
		const ok = (body: unknown): Answer => ({ status: 200, headers: {}, body });
		const path = url.replace('https://www.googleapis.com/gmail/v1/users/me', '');
		if (path === '/labels') {
			return ok({
				labels: [
					{ id: 'INBOX', name: 'INBOX', type: 'system' },
					{ id: 'UNREAD', name: 'UNREAD', type: 'system' },
					{ id: 'SENT', name: 'SENT', type: 'system' },
					{ id: 'DRAFT', name: 'DRAFT', type: 'system' },
					{ id: 'Label_1', name: 'Invoices', type: 'user' },
				],
			});
		}
		if (path === '/messages') {
			const q = typeof qs.q === 'string' ? qs.q : '';
			const after = /after:(\d+)/.exec(q);
			const from = /from:(\S+)/.exec(q);
			const labelIds = Array.isArray(qs.labelIds) ? qs.labelIds : qs.labelIds ? [qs.labelIds] : [];
			const list = this.mail
				.filter((m) => !after || m.at >= Number(after[1]))
				.filter((m) => !q.includes('is:unread') || (m.labels ?? []).includes('UNREAD'))
				.filter((m) => !from || m.from === from[1])
				.filter((m) => labelIds.every((l) => (m.labels ?? []).includes(String(l))))
				.sort((a, b) => b.at - a.at);
			const start = typeof qs.pageToken === 'string' ? Number(qs.pageToken) : 0;
			const page = list.slice(start, start + this.pageSize);
			const next = start + this.pageSize < list.length ? String(start + this.pageSize) : undefined;
			return ok({
				messages: page.map((m) => ({ id: m.id, threadId: `t-${m.id}` })),
				resultSizeEstimate: list.length,
				...(next ? { nextPageToken: next } : {}),
			});
		}
		const id = path.replace('/messages/', '');
		const left = this.failing.get(id) ?? 0;
		if (left > 0) {
			this.failing.set(id, left - 1);
			return { status: 503, headers: {}, body: { error: { code: 503, message: 'Backend Error' } } };
		}
		const m = this.mail.find((x) => x.id === id);
		if (!m)
			return { status: 404, headers: {}, body: { error: { code: 404, message: 'Not Found' } } };
		return ok({
			id: m.id,
			threadId: `t-${m.id}`,
			labelIds: m.labels ?? ['INBOX', 'UNREAD'],
			snippet: `About ${m.subject ?? m.id}`,
			payload: {
				mimeType: 'text/plain',
				headers: [
					{ name: 'From', value: m.from ?? 'someone@example.com' },
					{ name: 'To', value: 'me@example.com' },
					{ name: 'Subject', value: m.subject ?? `Mail ${m.id}` },
				],
			},
			sizeEstimate: 1200,
			historyId: '1',
			internalDate: String(m.at * 1000),
		});
	}
}

/** The class of the v1 node, from the built package. */
function v1Trigger(): { poll: (this: unknown) => Promise<unknown> } {
	const req = createRequire(join(nodesBase, 'package.json'));
	const mod = req('./dist/nodes/Google/Gmail/GmailTrigger.node.js') as {
		GmailTrigger: new () => { poll: (this: unknown) => Promise<unknown> };
	};
	return new mod.GmailTrigger();
}

const NODE = 'Gmail Trigger';

/** One poll of the v1 node, in production mode. */
async function pollV1(
	version: number,
	parameters: Json,
	staticData: Json,
	mailbox: Mailbox,
	nowSec: number,
): Promise<{ items: unknown[]; requests: Request[]; answers: Answer[] }> {
	const requests: Request[] = [];
	const answers: Answer[] = [];
	const node = {
		id: '1',
		name: NODE,
		type: 'n8n-nodes-base.gmailTrigger',
		typeVersion: version,
		position: [0, 0],
		parameters,
	};
	const errorClass = createRequire(join(nodesBase, 'package.json'))('n8n-workflow') as {
		NodeApiError: new (node: unknown, error: Json) => Error;
	};
	const context = {
		getNode: () => node,
		getMode: () => 'trigger',
		getWorkflow: () => ({ id: 'wf' }),
		getPollBudgetMs: () => 300_000,
		getWorkflowStaticData: (type: string) => {
			const key = type === 'global' ? 'global' : `node:${NODE}`;
			if (!isRecord(staticData[key])) staticData[key] = {};
			return staticData[key];
		},
		getNodeParameter: (name: string, fallback?: unknown) =>
			name in parameters ? parameters[name] : fallback,
		logger: { warn: () => {}, error: () => {}, debug: () => {}, info: () => {} },
		helpers: {
			returnJsonArray: (data: unknown[]) => data.map((json) => ({ json })),
			requestWithAuthentication: async (_type: string, options: Json) => {
				const qs = isRecord(options.qs) ? options.qs : {};
				const request = {
					method: String(options.method),
					url: String(options.uri),
					qs: jsonCopy(qs),
				};
				requests.push(request);
				const answer = mailbox.answer(request.url, qs);
				answers.push(structuredClone(answer));
				if (answer.status >= 400) {
					throw new errorClass.NodeApiError(node, {
						message: 'Gmail error',
						httpCode: String(answer.status),
					});
				}
				return answer.body;
			},
		},
	};
	const realNow = Date.now;
	Date.now = () => nowSec * 1000;
	try {
		const out = await v1Trigger().poll.call(context);
		const items =
			Array.isArray(out) && Array.isArray(out[0]) ? out[0].map((i: Json) => i.json) : [];
		return { items: jsonCopy(items) as unknown[], requests, answers };
	} finally {
		Date.now = realNow;
	}
}

function librarySource(version: number, parameters: Json): string {
	const params = { ...parameters, pollNode: NODE, pollVersion: version };
	return `import { schedule, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [schedule({ cron: '* * * * *', poll: true })],
	credentials: { c: { type: 'gmailOAuth2' } },
	async run(ctx) {
		return await ctx.node({
			name: ${JSON.stringify(NODE)},
			type: 'n8n-nodes-base.gmailTrigger',
			typeVersion: ${version},
			parameters: ${JSON.stringify(params)},
			credential: 'c',
		});
	},
});
`;
}

interface Step {
	/** Mail that arrives before the poll. */
	arrive?: Mail[];
	/** Message ids whose next fetches fail. */
	fail?: Record<string, number>;
	/** The time of the poll, in seconds. */
	at: number;
}

interface Case {
	name: string;
	version: number;
	parameters: Json;
	steps: Step[];
	pageSize?: number;
}

const T = 1_731_400_000;
const mail = (id: string, at: number, extra: Partial<Mail> = {}): Mail => ({ id, at, ...extra });

const timeline: Step[] = [
	{ at: T },
	{
		at: T + 60,
		arrive: [
			mail('m1', T + 10, { subject: 'Invoice 1' }),
			mail('m2', T + 20, { labels: ['DRAFT'] }),
			mail('m3', T + 30, { labels: ['SENT'] }),
			mail('m4', T + 30, { labels: ['INBOX', 'UNREAD', 'Label_1'], from: 'billing@example.com' }),
		],
	},
	// m5 lands in the boundary second of the last cursor: the query returns m4 again.
	{ at: T + 120, arrive: [mail('m5', T + 30), mail('m6', T + 90)] },
	{ at: T + 180 },
];

const CASES: Case[] = [
	...[1, 1.1, 1.2, 1.3, 1.4].map((version) => ({
		name: `version ${version}: a mailbox over four polls`,
		version,
		parameters: { simple: true, filters: {}, options: {} },
		steps: timeline,
	})),
	{
		name: 'version 1.4: filters (sender, unread, label, search)',
		version: 1.4,
		parameters: {
			simple: true,
			filters: {
				sender: 'billing@example.com',
				readStatus: 'unread',
				labelIds: ['Label_1'],
				q: 'invoice',
				includeSpamTrash: true,
			},
			options: {},
		},
		steps: timeline,
	},
	{
		name: 'version 1.4: more mail than maxResults, pages, and fetches that fail',
		version: 1.4,
		pageSize: 2,
		parameters: { simple: true, maxResults: 2, filters: {}, options: {} },
		steps: [
			{ at: T },
			{
				at: T + 60,
				arrive: [1, 2, 3, 4, 5].map((n) => mail(`b${n}`, T + n * 5)),
				fail: { b3: 2 },
			},
			{ at: T + 120 },
			{ at: T + 180, arrive: [mail('b6', T + 150)] },
			{ at: T + 240 },
			{ at: T + 300 },
		],
	},
	{
		name: 'version 1.3: a fetch that fails',
		version: 1.3,
		parameters: { simple: true, filters: {}, options: {} },
		steps: [
			{ at: T },
			{ at: T + 60, arrive: [mail('c1', T + 10), mail('c2', T + 20)], fail: { c1: 1 } },
			{ at: T + 120 },
		],
	},
];

describe.runIf(built)('Gmail Trigger poll: compiled library vs v1', () => {
	describe.each(CASES)('$name', (c) => {
		it('sends the same requests, gives the same items and keeps the same static data', async () => {
			const mailbox = new Mailbox(c.pageSize);
			const staticV1: Json = {};
			let staticLib: Json = {};
			const source = librarySource(c.version, c.parameters);
			const compiled = compile(source);
			expect(compiled.diagnostics).toEqual([]);
			expect(compiled.module).toBeDefined();
			const module = decodeModule(compiled.module ?? new Uint8Array());
			const delivered: string[] = [];

			for (const [n, step] of c.steps.entries()) {
				mailbox.mail.push(...(step.arrive ?? []));
				for (const [id, count] of Object.entries(step.fail ?? {})) mailbox.failing.set(id, count);
				const v1 = await pollV1(c.version, c.parameters, staticV1, mailbox, step.at);

				const fixture: Fixture = {
					trigger: { scheduledAt: step.at * 1000 },
					now: step.at * 1000,
					seed: 1,
					effects: {
						[NODE]: v1.answers.length > 0 ? v1.answers : [{ status: 200, headers: {}, body: {} }],
					},
					staticData: staticLib,
				};
				const reference = await runReference(source, fixture);
				expect(reference.status, `poll ${n}`).toBe('ok');
				const requests = reference.effects.map((e) => {
					const args = isRecord(e.args) ? e.args : {};
					return {
						method: String(args.method),
						url: String(args.url),
						qs: jsonCopy(args.qs ?? {}),
					};
				});
				expect(requests, `requests of poll ${n}`).toEqual(v1.requests);
				expect(reference.result, `items of poll ${n}`).toEqual(v1.items);
				expect(reference.staticData, `static data after poll ${n}`).toEqual(jsonCopy(staticV1));

				const bytecode = runModule(module, fixture);
				expect(JSON.stringify(bytecode), `bytecode of poll ${n}`).toBe(JSON.stringify(reference));
				staticLib = reference.staticData ?? {};
				for (const item of v1.items) if (isRecord(item)) delivered.push(String(item.id));
			}
			// The timeline delivers mail, and each message once at most.
			expect(delivered.length).toBeGreaterThan(0);
			expect(new Set(delivered).size).toBe(delivered.length);
			if (process.env.GMAIL_TRIGGER_DEBUG)
				console.log(c.name, delivered, JSON.stringify(staticLib));
		});
	});
});

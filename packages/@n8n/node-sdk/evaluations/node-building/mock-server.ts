import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import path from 'node:path';

import { isRecord } from './util';

export const MOCK_PORT = 18090;
export const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;

/** One request as the mock saw it. The log key is the credential secret, so each case gets its own log. */
export interface LoggedRequest {
	readonly at: number;
	readonly method: string;
	readonly path: string;
	readonly query: Record<string, string>;
	readonly headers: Record<string, string>;
	readonly body: unknown;
	readonly status: number;
	/** Items in the returned page, for pagination checks. */
	readonly returned?: number;
	readonly nextCursor?: string | null;
}

interface Reply {
	readonly status: number;
	readonly body: unknown;
	readonly headers?: Record<string, string>;
	readonly returned?: number;
	readonly nextCursor?: string | null;
}

interface Incoming {
	readonly method: string;
	readonly path: string;
	readonly query: Record<string, string>;
	readonly headers: Record<string, string>;
	readonly body: unknown;
}

const error = (status: number, message: string, extra: Record<string, unknown> = {}): Reply => ({
	status,
	body: { error: message, ...extra },
});

const UNAUTHORIZED = error(401, 'unauthorized');

export interface AcmeTask {
	readonly id: string;
	readonly title: string;
	readonly status: 'open' | 'done';
	readonly assignee: string | null;
	readonly createdAt: string;
}

const ASSIGNEES = ['ada', 'grace', 'linus'];

/** 25 tasks, 8 of them done. */
export const ACME_SEED: readonly AcmeTask[] = Array.from({ length: 25 }, (_, index) => ({
	id: `tsk_${String(index + 1).padStart(3, '0')}`,
	title: `Task ${index + 1}`,
	status: index % 3 === 2 ? 'done' : 'open',
	assignee: index % 4 === 0 ? null : ASSIGNEES[index % 3],
	createdAt: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
}));

export const ACME_CREATED_AT = '2026-02-01T00:00:00.000Z';

const toCursor = (offset: number) => Buffer.from(String(offset)).toString('base64url');
const fromCursor = (cursor: string) => {
	const offset = Number(Buffer.from(cursor, 'base64url').toString());
	return Number.isInteger(offset) && offset >= 0 ? offset : undefined;
};

const intParam = (value: string | undefined, fallback: number) =>
	value === undefined ? fallback : /^\d+$/.test(value) ? Number(value) : Number.NaN;

function acmeTasks(request: Incoming, key: string, stores: Map<string, AcmeTask[]>): Reply {
	const tasks = stores.get(key) ?? [...ACME_SEED];
	stores.set(key, tasks);
	if (request.method === 'GET') {
		const { status, cursor } = request.query;
		if (status !== undefined && status !== 'open' && status !== 'done') {
			return error(400, 'status must be open or done');
		}
		const pageSize = intParam(request.query.pageSize, 20);
		if (!(pageSize >= 1 && pageSize <= 50)) return error(400, 'pageSize must be 1 to 50');
		const offset = cursor === undefined ? 0 : fromCursor(cursor);
		if (offset === undefined) return error(400, 'invalid cursor');
		const matching = tasks.filter((task) => status === undefined || task.status === status);
		const data = matching.slice(offset, offset + pageSize);
		const nextCursor = offset + pageSize < matching.length ? toCursor(offset + pageSize) : null;
		return { status: 200, body: { data, nextCursor }, returned: data.length, nextCursor };
	}
	if (request.method !== 'POST') return error(405, 'method not allowed');
	const { body } = request;
	if (!isRecord(body)) return error(400, 'body must be a JSON object');
	const unknown = Object.keys(body).find((field) => field !== 'title' && field !== 'assignee');
	if (unknown) return error(400, `unknown field ${unknown}`);
	if (typeof body.title !== 'string' || body.title === '') return error(400, 'title is required');
	if (body.assignee !== undefined && (typeof body.assignee !== 'string' || body.assignee === '')) {
		return error(400, 'assignee must be a non-empty string');
	}
	const task: AcmeTask = {
		id: `tsk_${String(tasks.length + 1).padStart(3, '0')}`,
		title: body.title,
		status: 'open',
		assignee: body.assignee ?? null,
		createdAt: ACME_CREATED_AT,
	};
	tasks.push(task);
	return { status: 201, body: task };
}

const lineItem = (sku: string, description: string, quantity: number, unitPriceCents: number) => ({
	sku,
	description,
	quantity,
	unitPriceCents,
	totalCents: quantity * unitPriceCents,
});

const invoice = (
	id: string,
	fields: { status: string; dueDate: string | null; lineItems: Array<ReturnType<typeof lineItem>> },
) => ({
	id,
	['number']: `2026-${id.slice(-4)}`,
	status: fields.status,
	currency: 'EUR',
	customer: { id: 'cus_1', name: 'Acme Corp' },
	issuedAt: '2026-09-01',
	dueDate: fields.dueDate,
	totalCents: fields.lineItems.reduce((sum, item) => sum + item.totalCents, 0),
	lineItems: fields.lineItems,
});

export const LEDGER_INVOICES = {
	inv_1001: invoice('inv_1001', {
		status: 'open',
		dueDate: '2026-10-15',
		lineItems: [
			lineItem('SUP-1', 'Support hours', 3, 2500),
			lineItem('LIC-2', 'License seat', 2, 1999),
			lineItem('SHP-9', 'Shipping', 1, 1457),
		],
	}),
	inv_1002: invoice('inv_1002', {
		status: 'draft',
		dueDate: null,
		lineItems: [lineItem('CON-4', 'Consulting day', 1, 90000)],
	}),
	inv_1003: invoice('inv_1003', {
		status: 'paid',
		dueDate: '2026-09-30',
		lineItems: [lineItem('LIC-2', 'License seat', 10, 1999)],
	}),
};

function ledger(request: Incoming): Reply {
	const id = /^\/invoices\/([^/]+)$/.exec(request.path.replace('/ledger/api', ''))?.[1];
	if (request.method !== 'GET' || id === undefined) return error(404, 'not_found');
	const found = Object.entries(LEDGER_INVOICES).find(([invoiceId]) => invoiceId === id)?.[1];
	return found
		? { status: 200, body: { data: found } }
		: error(404, 'not_found', { message: `Invoice ${id} not found` });
}

export interface SearchlyHit {
	readonly id: string;
	readonly title: string;
	readonly lang: 'en' | 'de';
	readonly score: number;
}

/** 34 documents. `workflow` matches 23 of them, 6 of those in German. */
export const SEARCHLY_DOCS: readonly SearchlyHit[] = Array.from({ length: 34 }, (_, index) => {
	const n = index + 1;
	return {
		id: `doc_${n}`,
		title: n % 3 === 0 ? `Release notes ${n}` : `Workflow tip ${n}`,
		lang: n % 4 === 0 ? 'de' : 'en',
		score: 100 - n,
	};
});

export const searchlyMatches = (query: string, lang?: string) =>
	SEARCHLY_DOCS.filter(
		(doc) =>
			query
				.toLowerCase()
				.split(/\s+/)
				.every((word) => doc.title.toLowerCase().includes(word)) &&
			(lang === undefined || doc.lang === lang),
	);

function searchly(request: Incoming, key: string, limited: Set<string>): Reply {
	if (request.method !== 'POST' || request.path !== '/searchly/v2/search') {
		return error(404, 'not found');
	}
	if (!limited.has(key)) {
		limited.add(key);
		return { ...error(429, 'rate_limited'), headers: { 'retry-after': '1' } };
	}
	const { index } = request.query;
	if (index === undefined) return error(400, 'index is required');
	if (index !== 'docs') return error(404, `index ${index} not found`);
	const offset = intParam(request.query.offset, 0);
	const limit = intParam(request.query.limit, 10);
	if (!(offset >= 0)) return error(400, 'offset must be an integer of 0 or more');
	if (!(limit >= 1 && limit <= 10)) return error(400, 'limit must be 1 to 10');
	const { body } = request;
	if (!isRecord(body) || typeof body.query !== 'string' || body.query === '') {
		return error(400, 'body.query is required');
	}
	const extra = Object.keys(body).find((field) => field !== 'query' && field !== 'filters');
	if (extra) return error(400, `unknown field ${extra}`);
	const { filters } = body;
	if (filters !== undefined && !isRecord(filters)) return error(400, 'filters must be an object');
	const lang = filters?.lang;
	if (lang !== undefined && lang !== 'en' && lang !== 'de') {
		return error(400, 'filters.lang must be en or de');
	}
	const matches = searchlyMatches(body.query, lang);
	const hits = matches.slice(offset, offset + limit);
	return {
		status: 200,
		body: { hits, total: matches.length, offset, limit },
		returned: hits.length,
	};
}

const DOCS: Record<string, { file: string; type: string }> = {
	'acme-tasks': { file: 'acme-tasks.md', type: 'text/markdown' },
	ledger: { file: 'ledger.md', type: 'text/markdown' },
	searchly: { file: 'searchly.openapi.json', type: 'application/json' },
};

/** The credential secret of the request, by service. */
function keyOf(service: string, request: Incoming): string | undefined {
	const secret =
		service === 'acme-tasks'
			? request.headers['x-acme-key']
			: service === 'ledger'
				? /^Bearer (\S+)$/.exec(request.headers.authorization ?? '')?.[1]
				: request.query.api_key;
	const prefix = { 'acme-tasks': 'acme_', ledger: 'ldg_', searchly: 'sly_' }[service];
	return prefix && secret?.startsWith(prefix) ? secret : undefined;
}

async function readIncoming(request: IncomingMessage): Promise<Incoming> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) chunks.push(Buffer.from(chunk));
	const text = Buffer.concat(chunks).toString();
	const url = new URL(request.url ?? '/', MOCK_URL);
	const parse = (): unknown => {
		try {
			return JSON.parse(text);
		} catch {
			return text;
		}
	};
	return {
		method: request.method ?? 'GET',
		path: url.pathname.replace(/\/+$/, '') || '/',
		query: Object.fromEntries(url.searchParams),
		headers: Object.fromEntries(
			Object.entries(request.headers).map(([name, value]) => [
				name,
				Array.isArray(value) ? value.join(', ') : (value ?? ''),
			]),
		),
		body: text === '' ? undefined : parse(),
	};
}

export interface MockServer {
	readonly url: string;
	readonly server: Server;
	requestsFor(key: string): readonly LoggedRequest[];
	close(): Promise<void>;
}

/** The three mock services, their docs, and a request log per credential secret at `/__log`. */
export async function startMockServer(port = MOCK_PORT): Promise<MockServer> {
	const log = new Map<string, LoggedRequest[]>();
	const acmeStores = new Map<string, AcmeTask[]>();
	const limited = new Set<string>();

	const route = (request: Incoming): { key: string; reply: Reply } => {
		const service = request.path.split('/')[1] ?? '';
		const docs = DOCS[service];
		if (docs && request.path === `/${service}/docs`) {
			return {
				key: 'docs',
				reply: {
					status: 200,
					body: readFileSync(path.join(__dirname, 'docs', docs.file), 'utf8'),
					headers: { 'content-type': docs.type },
				},
			};
		}
		if (!docs) return { key: 'unknown', reply: error(404, 'not found') };
		const key = keyOf(service, request);
		if (key === undefined) return { key: 'unauthenticated', reply: UNAUTHORIZED };
		const reply =
			service === 'acme-tasks'
				? request.path === '/acme-tasks/v1/tasks'
					? acmeTasks(request, key, acmeStores)
					: error(404, 'not found')
				: service === 'ledger'
					? ledger(request)
					: searchly(request, key, limited);
		return { key, reply };
	};

	const server = createServer((raw, response) => {
		void readIncoming(raw).then((request) => {
			if (request.path === '/__health') {
				response.writeHead(200, { 'content-type': 'application/json' });
				response.end(JSON.stringify({ ok: true, service: 'n8n-node-eval-mock' }));
				return;
			}
			if (request.path === '/__log') {
				response.writeHead(200, { 'content-type': 'application/json' });
				response.end(JSON.stringify(log.get(request.query.key ?? '') ?? []));
				return;
			}
			const { key, reply } = route(request);
			const entries = log.get(key) ?? [];
			log.set(key, entries);
			entries.push({
				at: Date.now(),
				...request,
				status: reply.status,
				...(reply.returned !== undefined ? { returned: reply.returned } : {}),
				...(reply.nextCursor !== undefined ? { nextCursor: reply.nextCursor } : {}),
			});
			const text = typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body);
			response.writeHead(reply.status, {
				'content-type': 'application/json',
				...reply.headers,
			});
			response.end(text);
		});
	});

	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(port, '127.0.0.1', () => resolve());
	});
	const address = server.address();
	const actualPort = isRecord(address) && typeof address.port === 'number' ? address.port : port;
	return {
		url: `http://127.0.0.1:${actualPort}`,
		server,
		requestsFor: (key) => log.get(key) ?? [],
		close: async () => await new Promise((resolve) => server.close(() => resolve())),
	};
}

/** Starts the mock, or reuses one that another eval process already runs on the port. */
export async function ensureMockServer(): Promise<MockServer | undefined> {
	try {
		return await startMockServer();
	} catch (cause) {
		const health = await fetch(`${MOCK_URL}/__health`)
			.then(async (response) => await response.json())
			.catch(() => undefined);
		if (isRecord(health) && health.service === 'n8n-node-eval-mock') return undefined;
		throw new Error(`Port ${MOCK_PORT} is in use by another program`, { cause });
	}
}

/** The requests the mock logged for one credential secret. */
export async function fetchLog(key: string, baseUrl = MOCK_URL): Promise<LoggedRequest[]> {
	const response = await fetch(`${baseUrl}/__log?key=${encodeURIComponent(key)}`);
	const entries: unknown = await response.json();
	return Array.isArray(entries) ? entries.filter(isLoggedRequest) : [];
}

const isLoggedRequest = (value: unknown): value is LoggedRequest =>
	isRecord(value) && typeof value.method === 'string' && typeof value.at === 'number';

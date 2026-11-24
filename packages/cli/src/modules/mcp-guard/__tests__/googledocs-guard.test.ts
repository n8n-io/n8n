import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import type { GymAdmin } from '../gym-admin';
import { HttpGuardRouter } from '../http-router';
import { HttpRunRegistry } from '../http-runs';
import { createHttpToolCaller } from '../http-tool-caller';
import { enrichGoogleDocs, GOOGLE_DOCS_PROFILE, withPlainDocuments } from '../google-docs-profile';
import type { HydrationModel } from '../hydration-llm';
import type { McpCaller } from '../mcp-upstream';
import { sendToNetwork } from '../network';
import { isReadShaped } from '../request-classifier';
import { isTokenExchange, loadVendorKnowledge, vendorForRequest } from '../vendor-knowledge';

vi.mock('../network', () => ({
	sendToNetwork: vi.fn(async () => new Response('{"documentId":"x"}')),
}));

const REAL_TOKEN = 'ya29.real-oauth-token-of-the-user';
const TENANT_TOKEN = 'gym-tenant-token';
const DOCS = 'docs.googleapis.com';
const DRIVE = 'www.googleapis.com';
const DOC_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
const model: HydrationModel = { resolve: async () => ({}) as never };

const docs = loadVendorKnowledge('googledocs');

const call = (method: string, host: string, path: string, body?: unknown) => ({
	method,
	url: new URL(`https://${host}${path}`),
	headers: { authorization: `Bearer ${REAL_TOKEN}` },
	body: body === undefined ? undefined : Buffer.from(JSON.stringify(body)),
});

const run = (text: string) => ({ textRun: { content: text } });
const paragraph = (...texts: string[]) => ({ paragraph: { elements: texts.map(run) } });
const document = (content: unknown[]) => ({
	documentId: DOC_ID,
	title: 'Plan',
	revisionId: 'r1',
	body: { content },
});

describe('the Google Docs vendor file', () => {
	it('loads, names the Docs host and path prefix, and has no read path', () => {
		expect(docs.name).toBe('googledocs');
		expect(docs.hosts).toEqual(['docs.googleapis.com']);
		expect(docs.pathPrefixes).toEqual(['/v1/documents']);
		expect(docs.passthroughHosts).toEqual(['oauth2.googleapis.com']);
		expect(docs.readPaths).toEqual([]);
		expect(docs.instructions).toContain('plainText');
		expect(docs.instructions).toContain('native.google_drive');
		expect(docs.instructions).toContain('Known gaps');
	});

	it('routes the Docs paths of the node here, and the Drive paths and other APIs elsewhere', () => {
		expect(vendorForRequest(DOCS, `/v1/documents/${DOC_ID}`)?.name).toBe('googledocs');
		expect(vendorForRequest(DOCS, `/v1/documents/${DOC_ID}:batchUpdate`)?.name).toBe('googledocs');
		// The Drive vendor owns the Drive paths. This vendor must not claim them.
		expect(vendorForRequest(DRIVE, '/drive/v3/files')?.name).not.toBe('googledocs');
		expect(vendorForRequest(DRIVE, '/drive/v3/drives')?.name).not.toBe('googledocs');
		expect(vendorForRequest(DRIVE, '/gmail/v1/users/me/messages')?.name).toBe('gmail');
		expect(vendorForRequest(DRIVE, '/drive/v2/files')).toBeUndefined();
		expect(vendorForRequest(DRIVE, '/upload/drive/v3/files')?.name).not.toBe('googledocs');
		expect(vendorForRequest(DOCS, '/v2/documents')).toBeUndefined();
		expect(vendorForRequest('example.com', '/v1/documents/x')).toBeUndefined();
	});

	it('keeps the token exchange of the sign-in host working, also for a service account', () => {
		const exchange = (method: string, path: string) => ({
			method,
			url: new URL(`https://oauth2.googleapis.com${path}`),
		});

		expect(isTokenExchange(exchange('POST', '/token'))).toBe(true);
		expect(isTokenExchange(exchange('POST', '/revoke'))).toBe(false);
	});
});

describe('Google Docs routing: every operation of the node', () => {
	it.each([
		['document: get', 'GET', DOCS, `/v1/documents/${DOC_ID}`, true],
		['document: update', 'POST', DOCS, `/v1/documents/${DOC_ID}:batchUpdate`, false],
		['document create of the Docs API (the node lacks it)', 'POST', DOCS, '/v1/documents', false],
	])('%s: %s is read-shaped = %s', (_label, method, host, path, read) => {
		expect(isReadShaped(call(method, host, path, {}), docs.readPaths)).toBe(read);
		expect(vendorForRequest(host, path)?.name).toBe('googledocs');
	});
});

describe('enrichGoogleDocs', () => {
	it('adds the plain text of the paragraphs, without the last line break', () => {
		const out = enrichGoogleDocs(
			document([{ sectionBreak: {} }, paragraph('Hello ', 'world\n'), paragraph('Second\n')]),
		) as Record<string, unknown>;

		expect(out.plainText).toBe('Hello world\nSecond');
		expect(out.documentId).toBe(DOC_ID);
		expect(out.body).toBeDefined();
	});

	it('reads the cells of a table and a table of contents, and skips images', () => {
		const table = {
			table: {
				tableRows: [
					{ tableCells: [{ content: [paragraph('A\n')] }, { content: [paragraph('B\n')] }] },
					{ tableCells: [{ content: [paragraph('C\n')] }, 'bad cell'] },
					'bad row',
				],
			},
		};
		const toc = { tableOfContents: { content: [paragraph('Intro\n')] } };
		const image = { paragraph: { elements: [{ inlineObjectElement: { inlineObjectId: 'o1' } }] } };

		const out = enrichGoogleDocs(document([toc, table, image, paragraph('End\n')])) as {
			plainText: string;
		};

		expect(out.plainText).toBe('Intro\nA\nB\nC\nEnd');
	});

	it('cuts a long text, and gives an empty text to an empty document', () => {
		const long = enrichGoogleDocs(document([paragraph('x'.repeat(30_000))])) as {
			plainText: string;
		};

		expect(long.plainText).toHaveLength(20_000);
		expect((enrichGoogleDocs(document([])) as { plainText: string }).plainText).toBe('');
	});

	it('leaves other answers as they are, and works on a list of documents', () => {
		const files = { id: 'abc', name: 'x' };

		expect(enrichGoogleDocs(files)).toBe(files);
		expect(enrichGoogleDocs(null)).toBeNull();
		expect(enrichGoogleDocs({ body: { content: 'no list' } })).toEqual({
			body: { content: 'no list' },
		});
		expect(
			(enrichGoogleDocs([document([paragraph('a\n')])]) as Array<{ plainText: string }>)[0]
				.plainText,
		).toBe('a');
	});
});

describe('withPlainDocuments', () => {
	it('keeps only the document fields of the files, and drops folders and permissions', () => {
		const out = withPlainDocuments({
			world_version: 1,
			native: {
				google_drive: {
					files: [
						{
							ref: 'doc:1',
							id: DOC_ID,
							name: 'Plan',
							mimeType: 'application/vnd.google-apps.document',
							content: 'text',
							folder: 'folder:x',
							parents: ['folder:x'],
							owner: 'person:other',
							shared_with: ['a@b.test'],
						},
						'not an object',
					],
					folders: [{ ref: 'folder:x' }],
					permissions: [{ ref: 'p' }],
				},
				other: { keep: true },
			},
		});

		expect(out).toEqual({
			world_version: 1,
			native: {
				google_drive: {
					files: [
						{
							ref: 'doc:1',
							id: DOC_ID,
							name: 'Plan',
							mimeType: 'application/vnd.google-apps.document',
							content: 'text',
						},
					],
				},
				other: { keep: true },
			},
		});
	});

	it('leaves an overlay without Drive data as it is, and handles a Drive block without files', () => {
		const plain = { world_version: 1 };

		expect(withPlainDocuments(plain)).toBe(plain);
		expect(withPlainDocuments({ native: { other: {} } })).toEqual({ native: { other: {} } });
		expect(withPlainDocuments({ native: { google_drive: { folders: [{}] } } })).toEqual({
			native: { google_drive: { files: [] } },
		});
	});
});

describe('the profile of Google Docs', () => {
	it('uses the Drive gym service, the Google OAuth credential', () => {
		expect(GOOGLE_DOCS_PROFILE.name).toBe('googledocs');
		expect(GOOGLE_DOCS_PROFILE.gymService).toBe('google-drive');
		expect(GOOGLE_DOCS_PROFILE.credentialKind).toBe('google_oauth');
		expect(GOOGLE_DOCS_PROFILE.credentialField).toBe('oauthTokenData.access_token');
		expect(GOOGLE_DOCS_PROFILE.opaqueIds).toBe(true);
	});

	describe('lookups', () => {
		const lookups = GOOGLE_DOCS_PROFILE.lookups!;

		it('reads the real document that a batchUpdate names', () => {
			expect(
				lookups('write_post_documents', {
					method: 'POST',
					path: `/v1/documents/${DOC_ID}:batchUpdate`,
					body: { requests: [] },
				}),
			).toEqual([
				{ tool: 'read_get_documents', args: { method: 'GET', path: `/v1/documents/${DOC_ID}` } },
			]);
		});

		it('reads nothing for a read, a new document, or a path that is not a document', () => {
			expect(
				lookups('read_get_documents', { method: 'GET', path: `/v1/documents/${DOC_ID}` }),
			).toEqual([]);
			expect(lookups('write_post_documents', { method: 'POST', path: '/v1/documents' })).toEqual(
				[],
			);
			expect(
				lookups('write_post_documents', {
					method: 'POST',
					path: '/v1/documents/a%2Fb:batchUpdate',
				}),
			).toEqual([]);
			expect(
				lookups('write_post_documents', { method: 'POST', path: `/v1/documents/${DOC_ID}/x` }),
			).toEqual([]);
		});

		it('builds a read that is read-shaped and inside the vendor', () => {
			const [read] = lookups('write_post_documents', {
				method: 'POST',
				path: `/v1/documents/${DOC_ID}:batchUpdate`,
			});
			const req = call('GET', DOCS, String(read.args.path));

			expect(isReadShaped(req, docs.readPaths)).toBe(true);
			expect(vendorForRequest(DOCS, req.url.pathname)?.name).toBe('googledocs');
		});
	});

	it('copies a document to the gym', () => {
		const hydrateRead = GOOGLE_DOCS_PROFILE.hydrateRead;

		expect(hydrateRead).toBeUndefined();
	});

	it('hydrates a write on a document that the gym did not make', () => {
		const hydrateWrite = GOOGLE_DOCS_PROFILE.hydrateWrite!;
		const args = { method: 'POST', path: `/v1/documents/${DOC_ID}:batchUpdate` };

		expect(hydrateWrite(args, new Set())).toBe(true);
		expect(hydrateWrite(args, new Set([DOC_ID]))).toBe(false);
		expect(hydrateWrite({ method: 'POST', path: '/v1/documents' }, new Set())).toBe(false);
	});
});

describe('the real answer reaches the plan with plain text', () => {
	it('adds plainText to the real read that the hydration gets', async () => {
		const real = document([paragraph('Hello\n'), paragraph('World\n')]);
		const upstream = createHttpToolCaller({
			origin: () => `https://${DOCS}`,
			send: async () => new Response(JSON.stringify(real)),
			headers: () => ({}),
			enrich: GOOGLE_DOCS_PROFILE.enrich,
		});
		const hydrate = vi.fn(async (..._a: unknown[]) => {});
		const gym = {
			listTools: async () => [],
			callTool: vi.fn(async () => ({ content: [{ type: 'text' as const, text: '{}' }] })),
		};
		const router = new HttpGuardRouter({
			upstream,
			gym: gym as unknown as McpCaller,
			hydrator: { hydrate, hydrateWrite: vi.fn(), noteWrite: vi.fn() },
			profile: GOOGLE_DOCS_PROFILE,
		});

		await router.handle(call('GET', DOCS, `/v1/documents/${DOC_ID}`));

		const seen = JSON.stringify(hydrate.mock.calls[0][2]);
		expect(seen).toContain('"plainText\\":\\"Hello\\\\nWorld');
	});
});

describe('the credential of the node never leaves the guard', () => {
	const logs: string[] = [];
	let gymRequests: Array<{ url: string; headers: http.IncomingHttpHeaders }>;
	let gym: http.Server;
	let gymUrl: string;

	beforeAll(async () => {
		gym = http.createServer((req, res) => {
			req.resume();
			req.on('end', () => {
				gymRequests.push({ url: req.url ?? '', headers: req.headers });
				res.setHeader('content-type', 'application/json');
				res.end('{"documentId":"gymmade12345"}');
			});
		});
		await new Promise<void>((resolve) => gym.listen(0, '127.0.0.1', resolve));
		gymUrl = `http://127.0.0.1:${(gym.address() as AddressInfo).port}`;
	});

	afterAll(async () => {
		await new Promise((resolve) => gym.close(resolve));
	});

	beforeEach(() => {
		logs.length = 0;
		gymRequests = [];
		vi.mocked(sendToNetwork).mockClear();
		const sink = (text: string) => {
			logs.push(text);
		};
		Container.set(Logger, {
			info: sink,
			warn: sink,
			error: sink,
			debug: sink,
		} as unknown as Logger);
	});

	async function setup() {
		const admin = {
			createTenant: vi.fn(async () => {}),
			seed: vi.fn(async () => ({})),
			issueMcpCredential: vi.fn(async () => TENANT_TOKEN),
			tenantExists: vi.fn(async () => true),
			deleteTenant: vi.fn(async () => {}),
		};
		const registry = new HttpRunRegistry({
			profile: GOOGLE_DOCS_PROFILE,
			vendor: docs,
			admin: admin as unknown as GymAdmin,
			gymUrl,
		});
		const created = await registry.getOrCreate('agent-chat', model);
		return { created, admin };
	}

	it('asks the gym for a credential of the service google-drive', async () => {
		const { admin } = await setup();

		expect(admin.issueMcpCredential).toHaveBeenCalledWith(
			expect.any(String),
			'google-drive',
			'google_oauth',
			'oauthTokenData.access_token',
		);
	});

	it('sends a batchUpdate and a new document only to the gym, and the real read is a GET', async () => {
		const { created } = await setup();

		await created.router.handle(
			call('POST', DOCS, `/v1/documents/${DOC_ID}:batchUpdate`, {
				requests: [{ insertText: { text: 'x', endOfSegmentLocation: {} } }],
			}),
		);
		await created.router.handle(call('POST', DOCS, '/v1/documents', { title: 'New' }));

		const real = vi.mocked(sendToNetwork).mock.calls.map(([req]) => req);
		// Only the lookup of the document that the batchUpdate names is a real request. It is a GET.
		expect(real.every((req) => req.method === 'GET')).toBe(true);
		expect(real.every((req) => req.url.pathname.startsWith('/v1/documents/'))).toBe(true);
		expect(gymRequests.map((r) => r.url)).toEqual(
			expect.arrayContaining([`/v1/documents/${DOC_ID}:batchUpdate`, '/v1/documents']),
		);
		expect(gymRequests.every((r) => r.headers.authorization === `Bearer ${TENANT_TOKEN}`)).toBe(
			true,
		);
		expect(JSON.stringify(gymRequests)).not.toContain(REAL_TOKEN);
		expect(logs.join('\n')).not.toContain(REAL_TOKEN);
	});

	it('answers a read of a document that only the gym knows, and the real read stays a GET', async () => {
		const { created } = await setup();

		await created.router.handle(call('POST', DOCS, '/v1/documents', { title: 'New' }));
		vi.mocked(sendToNetwork).mockClear();
		// The id of a gym document in a path is not known as an id of the gym here, so the read goes to the
		// real service first and then to the gym. This is safe: the real read is a GET.
		const res = await created.router.handle(call('GET', DOCS, '/v1/documents/gymmade12345'));

		expect(res.status).toBe(200);
		expect(vi.mocked(sendToNetwork).mock.calls.every(([req]) => req.method === 'GET')).toBe(true);
	});
});

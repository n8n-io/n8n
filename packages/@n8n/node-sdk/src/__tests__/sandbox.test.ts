import { createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { isRecord } from '@n8n/utils/is-record';
import type { IDataObject, IHttpRequestOptions, INode, INodeType } from 'n8n-workflow';

import { compat, defineCredential, field } from '../credentials';
import type { PermissionRefusal } from '../egress';
import { escapeProbeCredentials, escapeProbes } from './escape-probes';
import { packAction } from '../pack';
import { defineNode, t } from '../index';
import { runRecorder } from '../profile';
import { replayFixtures } from '../publish';
import {
	connectLines,
	policyExecutorLoader,
	sandboxedVersionOf,
	warmSandbox,
	wasmSidecarRuntime,
	type GuestRuntime,
	type SandboxOptions,
} from '../sandbox';
import {
	executorOf,
	hostRuntime,
	type BinaryStore,
	type ContractOrigin,
	type ExecutorHost,
	type PackedVersion,
} from '../runtime';
import { toVersionedTriggerType } from '../triggers';
import { NODE_CONTRACT_VERSION } from '../version';

const SANDBOX = path.resolve(__dirname, '..', '..', 'sandbox');
const SIDECAR = path.join(SANDBOX, 'sidecar', 'target', 'release', 'n8n-sandbox');
const GUESTS = path.join(SANDBOX, 'dist');
const GUEST = path.join(GUESTS, 'action.wasm');
const TRIGGER_GUEST = path.join(GUESTS, 'trigger.wasm');

const acmeToken = () =>
	defineCredential({
		id: 'acme.token',
		version: '1.0.0',
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
	'inputUrlProbe',
	'credentialHostProbe',
	'baseUrlProbe',
	'pollutionProbe',
	'randomProbe',
	'clockProbe',
	'echoProbe',
	'failureProbe',
	'canaryProbe',
	'credentialProbe',
	'credentialErrorProbe',
	'binaryProbe',
	'parsersProbe',
	'openStreamsProbe',
	'globalsProbe',
	'migrateProbe',
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

const IDENTITY = {
	action: 'probe',
	version: '1.0.0',
	bundleHash: 'hash',
	nodeContract: NODE_CONTRACT_VERSION,
};

const WASM_PAGE_BYTES = 65_536;

/** The sidecar runtime, with each request method in `methods`. */
const recordedMethods = (methods: string[]): GuestRuntime => {
	const inner = wasmSidecarRuntime({ sidecar: SIDECAR, guests: GUESTS });
	return {
		name: inner.name,
		async start(session) {
			const connection = await inner.start(session);
			return {
				...connection,
				request: async (method, params) => {
					methods.push(method);
					return await connection.request(method, params);
				},
			};
		},
	};
};

describe('connectLines', () => {
	it('measures the message limit in UTF-8 bytes', async () => {
		const connection = connectLines(
			{ write: () => undefined, stop: () => undefined },
			{
				limits: { memoryMb: 64, cpuMs: 1_000, wallMs: 1_000, maxMessageBytes: 20 },
				label: 'probe',
			},
		);
		const request = connection.request('run', {});
		connection.receive(`{"method":"${'é'.repeat(7)}"}`);
		await expect(request).rejects.toThrow('probe gave a message larger than 20 bytes');
	});
});

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

	const outputOf = async (
		name: ProbeName,
		host = hostOf(),
		sandbox = options(),
		runtime = hostRuntime(),
	) => {
		const packed = await packAction(path.join(dirs.root, 'probes.ts'), name);
		const { executor } = await sandboxedVersionOf(
			{
				manifest: packed.manifest,
				origin: 'community',
				readBundle: async () => packed.bundle,
				readSdk: async () => packed.sdk ?? '',
			},
			sandbox,
			runtime,
		);
		const [[output] = []] = await executor(host);
		return output;
	};
	const run = async (
		name: ProbeName,
		host = hostOf(),
		sandbox = options(),
		runtime = hostRuntime(),
	) => (await outputOf(name, host, sandbox, runtime))?.json.value;

	beforeAll(async () => {
		// Inside this package, so tsx resolves @n8n/node-sdk when pack loads credentials.ts.
		dirs.root = await mkdtemp(path.join(__dirname, '..', '..', '.package-test-'));
		canary.server = createServer((_request, response) => {
			canary.hits += 1;
			response.end('reached');
		});
		await new Promise<void>((resolve) => canary.server?.listen(0, '127.0.0.1', resolve));
		const { port } = canary.server.address() as AddressInfo;
		await writeFile(path.join(dirs.root, 'probes.ts'), escapeProbes(`http://127.0.0.1:${port}/`));
		await writeFile(path.join(dirs.root, 'credentials.ts'), escapeProbeCredentials);
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

	it('compiles each guest at warm-up, so a later run compiles nothing', async () => {
		const warm = { ...options(), cacheDir: path.join(dirs.root, 'warm-cache') };
		const compiled = async () => {
			const files = (await readdir(warm.cacheDir)).filter((file) => file.endsWith('.cwasm')).sort();
			return await Promise.all(
				files.map(async (file) => [file, (await stat(path.join(warm.cacheDir, file))).mtimeMs]),
			);
		};
		await warmSandbox({ ...warm, sidecar: SIDECAR, guests: GUESTS });
		const warmed = await compiled();
		expect(warmed).toHaveLength(3);
		expect((await stat(warm.cacheDir)).mode & 0o777).toBe(0o700);
		await expect(run('pollutionProbe', hostOf(), warm)).resolves.toBe('yes');
		expect(await compiled()).toEqual(warmed);
	}, 30_000);

	it('gives the bundle no global fetch', async () => {
		await expect(run('fetchProbe')).rejects.toThrow('fetch is not available in the sandbox');
		expect(canary.hits).toBe(0);
	});

	it('gives the bundle no process and no environment', async () => {
		await expect(run('processProbe')).rejects.toThrow(
			/can't access property "env", .* is undefined/,
		);
	});

	it('has none of the globals that the pack check refuses', async () => {
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
		const { recorder, profile } = runRecorder(1);
		await expect(run('loopProbe', { ...hostOf(), recorder })).rejects.toThrow(
			'The bundle used its CPU time of 1000 ms and was stopped',
		);
		expect(Date.now() - started).toBeLessThan(10_000);
		expect(
			profile(IDENTITY, { errorType: 'UserError' }).sandbox?.guestCpuMs,
		).toBeGreaterThanOrEqual(1_000);
	});

	it('stops a memory blow-up at the memory limit', async () => {
		const { recorder, profile } = runRecorder(1);
		await expect(run('memoryProbe', { ...hostOf(), recorder })).rejects.toThrow(
			'The bundle reached its memory limit of 64 MB and was stopped',
		);
		const peak = profile(IDENTITY, { errorType: 'UserError' }).sandbox?.memoryPeakBytes;
		expect(peak).toBeGreaterThan(32 * 2 ** 20);
		expect(peak).toBeLessThanOrEqual(64 * 2 ** 20);
	});

	it('records the guest CPU time, the memory peak and the instantiate time of a run', async () => {
		const methods: string[] = [];
		const sandbox = { ...options(), runtime: recordedMethods(methods) };
		const { recorder, profile } = runRecorder(1);

		await run('echoProbe', { ...hostOf(), recorder }, sandbox);

		const recorded = profile(IDENTITY, { outputItems: 1 });
		const { guestCpuMs = 0, memoryPeakBytes = 0, instantiateMs = -1 } = recorded.sandbox ?? {};
		expect(guestCpuMs).toBeGreaterThan(0);
		expect(memoryPeakBytes).toBeGreaterThanOrEqual(WASM_PAGE_BYTES);
		expect(memoryPeakBytes % WASM_PAGE_BYTES).toBe(0);
		expect(instantiateMs).toBeGreaterThanOrEqual(0);
		expect(methods.filter((method) => method === '[stats]')).toHaveLength(1);
		expect(recorded.rpcs.map(({ method }) => method)).not.toContain('[stats]');
	});

	it('sends no [stats] request without a run profile', async () => {
		const methods: string[] = [];
		const sandbox = { ...options(), runtime: recordedMethods(methods) };

		await run('echoProbe', hostOf(), sandbox);

		expect(methods).toContain('action.item-run.[take]');
		expect(methods).not.toContain('[stats]');
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

	it('refuses a host from input outside the input hosts of the host', async () => {
		const host: ExecutorHost = {
			...hostOf(),
			parameter: (name) => (name === 'url' ? 'https://other.test/x' : undefined),
			egressInputHosts: ['allowed.test'],
		};
		await expect(run('inputUrlProbe', host)).rejects.toThrow(
			'Host not allowed: this n8n instance lets a URL from input reach only allowed.test, not other.test',
		);
		expect(requests).toEqual([]);
	});

	it('takes the credential hosts from the host, not from the bundle', async () => {
		await expect(run('credentialHostProbe')).rejects.toThrow('evil.example');
		expect(requests).toEqual([]);
	});

	it('takes the credential hosts from the credential manifest before the host type', async () => {
		const runtime = hostRuntime({
			credentialManifestOf: async (name) =>
				name === 'slackApi'
					? {
							kind: 'credential',
							id: 'slack.token',
							name: 'slackApi',
							semver: '1.0.0',
							nodeContract: '2.5.0',
							sdk: '0.0.0',
							displayName: 'Slack',
							fields: { type: 'object', properties: {} },
							scheme: { kind: 'none' },
							hosts: ['evil.example'],
						}
					: undefined,
		});
		await run('credentialHostProbe', hostOf(), options(), runtime);
		expect(requests.map(({ url }) => url)).toEqual(['https://evil.example/steal']);
	});

	it('refuses a bundle that names a base URL outside the egress hosts of its manifest', async () => {
		const { manifest, bundle, sdk } = await packAction(
			path.join(dirs.root, 'probes.ts'),
			'baseUrlProbe',
		);
		expect(manifest.contract.egress).toEqual({ hosts: ['evil.example'] });
		const { egress: _, ...contract } = manifest.contract;
		await expect(
			sandboxedVersionOf(
				{
					manifest: { ...manifest, contract },
					origin: 'community',
					readBundle: async () => bundle,
					readSdk: async () => sdk ?? '',
				},
				options(),
				hostRuntime(),
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

	it('gives the bundle the real time, which moves during a host call, in whole milliseconds', async () => {
		const answeredAt: number[] = [];
		const host: ExecutorHost = {
			...hostOf(),
			request: async () => {
				await new Promise((resolve) => setTimeout(resolve, 50));
				answeredAt.push(Date.now());
				return { body: {}, headers: {}, statusCode: 200 };
			},
		};
		const { before, after } = JSON.parse((await run('clockProbe', host)) as string) as Record<
			'before' | 'after',
			[number, number]
		>;
		expect(Math.abs(after[0] - answeredAt[0])).toBeLessThan(1_000);
		expect(after[0] - before[0]).toBeGreaterThanOrEqual(49);
		expect(after[1] - before[1]).toBeGreaterThanOrEqual(49);
		for (const value of [...before, ...after]) expect(Number.isInteger(value)).toBe(true);
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

	it('fails a response over the limit of the host, as in-process', async () => {
		const host: ExecutorHost = {
			...hostOf(),
			maxResponseBytes: 1024,
			request: async (request) => {
				requests.push(request);
				throw Object.assign(new Error('maxContentLength size of 1024 exceeded'), {
					code: 'ERR_BAD_RESPONSE',
				});
			},
		};
		await expect(run('echoProbe', host)).rejects.toThrow(
			'probe.probe got a response larger than 1024 bytes',
		);
		expect(requests).toEqual([expect.objectContaining({ maxResponseBytes: 1024 })]);
	});

	it('records the sandbox start, each JSON-RPC message, and the guest request under its call', async () => {
		const { recorder, profile } = runRecorder(1);

		await run('echoProbe', { ...hostOf(), recorder });

		const recorded = profile(
			{
				action: 'probe',
				version: '1.0.0',
				bundleHash: 'hash',
				nodeContract: NODE_CONTRACT_VERSION,
			},
			{ outputItems: 1 },
		);
		expect(recorded).toMatchObject({
			path: 'sandbox',
			phases: [{ name: 'sandboxStart', compileCached: true }],
			rpcCount: recorded.rpcs.length,
		});
		expect(recorded.rpcs.map(({ method, direction }) => `${direction} ${method}`)).toEqual(
			expect.arrayContaining([
				'host_to_guest [initialize]',
				'host_to_guest action.item-run.[new]',
				'host_to_guest action.item-run.[take]',
				'guest_to_host http.request',
				'host_to_guest action.item-run.[drop]',
			]),
		);
		const callOf = (method: string) => recorded.rpcs.find((rpc) => rpc.method === method);
		const sizes = {
			requestBytes: expect.any(Number),
			responseBytes: expect.any(Number),
			encodeMs: expect.any(Number),
			decodeMs: expect.any(Number),
		};
		expect(callOf('action.item-run.[take]')).toMatchObject(sizes);
		expect(callOf('http.request')).toMatchObject(sizes);
		expect(callOf('action.item-run.[drop]')).not.toHaveProperty('responseBytes');
		const [take, call] = [callOf('action.item-run.[take]'), callOf('http.request')];
		expect(recorded.requests).toEqual([
			expect.objectContaining({ method: 'GET', host: 'api.example.com', rpc: call?.id }),
		]);
		const [request] = recorded.requests;
		const times = [take?.startMs, call?.startMs, request?.startMs, request?.endMs, call?.endMs];
		expect(times).toEqual([...times].sort((a = 0, b = 0) => a - b));
		expect(call?.endMs).toBeLessThanOrEqual(take?.endMs ?? 0);
	});

	it.each(['shape', 'redacted'] as const)(
		'records %s payloads without the credential secret',
		async (capture) => {
			const CANARY = 'canary-0e4b8d2f6a9c1357';
			const { recorder, profile } = runRecorder(1, capture);
			const host: ExecutorHost = {
				...hostOf(),
				node: { ...node, credentials: { acmeApi: { id: '1', name: 'Acme' } } },
				parameter: (name) => (name === 'note' ? 'hello' : undefined),
				credentialData: async () => ({ account: 'acc-1', apiKey: CANARY }),
				recorder,
				// The request layer signs with the key, and the API echoes the header back.
				request: async (options) => ({
					body: {
						authorization: `Bearer ${CANARY}`,
						note: isRecord(options.body) ? options.body.note : undefined,
					},
					headers: { 'content-type': 'application/json' },
					statusCode: 200,
				}),
			};

			const value = await run('canaryProbe', host);

			expect(value).toContain(CANARY);
			const recorded = profile(
				{
					action: 'probe',
					version: '1.0.0',
					bundleHash: 'hash',
					nodeContract: NODE_CONTRACT_VERSION,
				},
				{ outputItems: 1 },
			);
			expect(JSON.stringify(recorded)).not.toContain(CANARY);
			expect(recorded.payloads).toMatchObject({
				capture,
				inputs: [capture === 'shape' ? '{"note":string(5)}' : '{"note":"hello"}'],
				outputs: [expect.any(String)],
			});
			expect(recorded.requests).toEqual([
				expect.objectContaining({
					requestBody: capture === 'shape' ? '{"note":string(5)}' : '{"note":"hello"}',
					responseBody:
						capture === 'shape'
							? '{"authorization":string(30),"note":string(5)}'
							: expect.stringContaining('[REDACTED]'),
				}),
			]);
		},
	);

	it('gives the guest an error answer when the host answer cannot be encoded', async () => {
		const body: Record<string, unknown> = {};
		body.self = body;
		const request = async () => ({ body, headers: {}, statusCode: 200 });

		await expect(run('echoProbe', { ...hostOf(), request })).rejects.toThrow(/circular/);
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

	it('reads a file through the host, so the bytes and the parser stay in the host', async () => {
		const csv = Buffer.from('a;b\n1;2\n');
		const store: BinaryStore = {
			input: async () => ({
				data: csv.toString('base64'),
				mimeType: 'text/csv',
				bytes: csv.length,
			}),
			read: async (entry) => Readable.from([Buffer.from(entry.data, 'base64')]),
			write: async () => await Promise.reject(new Error('no writes in this test')),
		};
		const reads: unknown[] = [];
		const value = await run('parsersProbe', {
			...hostOf(),
			parameter: (name) => (name === 'file' ? 'data' : undefined),
			binary: store,
			extractFile: async (file, request) => {
				reads.push({ meta: file.meta, request });
				return [
					['a', 'b'],
					['1', '2'],
				];
			},
		});
		expect(value).toBe(
			JSON.stringify([
				['a', 'b'],
				['1', '2'],
			]),
		);
		expect(reads).toEqual([
			{
				meta: { mimeType: 'text/csv', bytes: csv.length },
				request: { format: 'csv', options: { delimiter: ';', header: false } },
			},
		]);
	});

	it('stops a binary download over the limit of the host, as in-process', async () => {
		const pulled = { chunks: 0 };
		function* chunks() {
			for (const _ of Array.from({ length: 1000 })) {
				pulled.chunks += 1;
				yield Buffer.alloc(1024);
			}
		}
		const store: BinaryStore = {
			input: async () => ({ data: 'eA==', mimeType: 'text/plain', bytes: 1 }),
			read: async (entry) => Readable.from([Buffer.from(entry.data, 'base64')]),
			write: async (stream) => {
				const read = { bytes: 0 };
				for await (const chunk of stream) read.bytes += (chunk as Buffer).length;
				return { data: '', mimeType: 'application/octet-stream', bytes: read.bytes };
			},
		};
		const host: ExecutorHost = {
			...hostOf(),
			parameter: (name) => (name === 'file' ? 'data' : undefined),
			binary: store,
			maxResponseBytes: 4096,
			request: async (request) =>
				request.encoding === 'stream'
					? { body: Readable.from(chunks()), headers: {}, statusCode: 200 }
					: { body: { ok: true }, headers: {}, statusCode: 200 },
		};
		await expect(run('binaryProbe', host)).rejects.toThrow(
			'probe.probe got a response larger than 4096 bytes',
		);
		expect(pulled.chunks).toBeLessThan(64);
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

	it('replays the migration pairs with the migrate of the guest', async () => {
		const replay = async (name: ProbeName, expected: Record<string, unknown>) => {
			const packed = await packAction(path.join(dirs.root, 'probes.ts'), name);
			const loaded = await sandboxedVersionOf(
				{
					manifest: packed.manifest,
					origin: 'community',
					readBundle: async () => packed.bundle,
					readSdk: async () => packed.sdk ?? '',
				},
				options(),
				hostRuntime(),
			);
			return await replayFixtures(
				packed,
				{ executions: [], migrations: [{ fromMajor: 1, params: { text: 'hi' }, expected }] },
				{ contract: loaded.action, executor: loaded.executor, migrate: loaded.migrate },
			);
		};

		await expect(replay('migrateProbe', { message: 'hi' })).resolves.toEqual([]);
		await expect(replay('migrateProbe', { message: 'ho' })).resolves.toEqual([
			'probe.probe@2.0.0 migration from 1: got {"message":"hi"}',
		]);
		await expect(replay('pollutionProbe', { message: 'hi' })).resolves.toEqual([
			'probe.probe@1.0.0 migration from 1: the contract has no migrate',
		]);
	});
});

const TRIGGERS = `import { defineNode, path, t } from '@n8n/node-sdk';
const feed = defineNode({ id: 'feed', displayName: 'Feed', baseUrl: 'https://api.feed.test' });
const change = t.obj({ id: t.str() });
export const changed = feed.trigger('changed', {
	trigger: 'On change',
	summary: 'Starts on a change.',
	input: {},
	output: change,
	poll: {
		request: ({ since }) => ({ path: path\`/changes\`, query: { since } }),
		response: t.arr(change),
		items: (page) => page,
		cursor: { id: (item) => Number(item.id) },
		firstRun: 'emit',
	},
});
export const leaked = feed.trigger('leaked', {
	trigger: 'On leak',
	summary: 'Starts on a leak.',
	input: {},
	output: change,
	poll: {
		request: () => ({ url: 'https://evil.example/steal' }),
		response: t.arr(change),
		items: (page) => page,
		cursor: { id: (item) => Number(item.id) },
	},
});
export const hooked = feed.trigger('hooked', {
	trigger: 'On hook',
	summary: 'Starts on a hook.',
	input: {},
	output: change,
	webhook: {
		verify: { algorithm: 'sha256', header: 'x-signature', secret: 'generated' },
		register: {
			create: ({ url, secret }) => ({ method: 'POST', path: path\`/hooks\`, body: { url, secret } }),
			id: (body) => (body as { id?: string }).id,
			check: ({ id }) => ({ path: path\`/hooks/\${id}\` }),
			delete: ({ id }) => ({ method: 'DELETE', path: path\`/hooks/\${id}\` }),
		},
		emit: ({ body }) => [{ id: String(body.id) }],
	},
});
`;

describe.skipIf(!existsSync(SIDECAR) || !existsSync(TRIGGER_GUEST))(
	'contract triggers in the sandbox',
	() => {
		const dirs = { root: '' };
		const sent: IHttpRequestOptions[] = [];
		const refusals: PermissionRefusal[] = [];
		const options = (sidecar = SIDECAR): SandboxOptions => ({
			sidecar,
			guests: GUESTS,
			cacheDir: path.join(dirs.root, 'cache'),
			credentialType: () => undefined,
			limits: { cpuMs: 1_000, memoryMb: 64, wallMs: 20_000 },
		});
		const versionOf = async (name: string, origin: ContractOrigin): Promise<PackedVersion> => {
			const { manifest, bundle, sdk } = await packAction(path.join(dirs.root, 'triggers.ts'), name);
			return { manifest, origin, readBundle: async () => bundle, readSdk: async () => sdk ?? '' };
		};
		/** A loader that runs first-party versions in this process and every other one in wasm. */
		const loaderOf = (sandbox: SandboxOptions) =>
			policyExecutorLoader(
				{
					lists: { 'first-party': ['in-process'], community: ['wasm'], private: ['wasm'] },
					available: { missing: {} },
					runtimes: {
						wasm: () =>
							wasmSidecarRuntime({ sidecar: sandbox.sidecar ?? '', guests: sandbox.guests ?? '' }),
					},
				},
				sandbox,
			);
		/** The node type of a trigger with the default runtime lists. */
		const typeOf = async (version: PackedVersion, sandbox = options()): Promise<INodeType> => {
			const runtime = hostRuntime({
				executorLoader: loaderOf(sandbox),
				onPermissionRefused: (refusal) => refusals.push(refusal),
			});
			return new (toVersionedTriggerType([version], runtime))().getNodeType(1);
		};
		const contextOf = (staticData: IDataObject, replies: unknown[]) => ({
			getNode: () => node,
			getNodeParameter: () => undefined,
			getWorkflowStaticData: () => staticData,
			getMode: () => 'trigger',
			getNodeWebhookUrl: () => 'https://n8n.test/webhook/1',
			getCredentials: async () => await Promise.resolve({}),
			logger: { warn: () => undefined },
			helpers: {
				httpRequest: async (request: IHttpRequestOptions) => {
					sent.push(request);
					const body: unknown = replies.shift();
					return await Promise.resolve(
						request.returnFullResponse ? { body, headers: {}, statusCode: 200 } : body,
					);
				},
			},
		});

		beforeAll(async () => {
			dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-sandbox-triggers-'));
			await writeFile(path.join(dirs.root, 'triggers.ts'), TRIGGERS);
		});

		afterAll(async () => {
			await rm(dirs.root, { recursive: true, force: true });
		});

		beforeEach(() => {
			sent.length = 0;
			refusals.length = 0;
		});

		it('polls a community trigger in the sandbox, and the host keeps its cursor', async () => {
			const type = await typeOf(await versionOf('changed', 'community'));
			const staticData: IDataObject = {};
			const first = await type.poll?.call(contextOf(staticData, [[{ id: '1' }]]) as never);
			expect(first?.[0]?.map(({ json }) => json)).toEqual([{ id: '1' }]);
			expect(staticData.cursor).toBe('1');
			const replies = [[{ id: '2' }, { id: '1' }]];
			const second = await type.poll?.call(contextOf(staticData, replies) as never);
			expect(second?.[0]?.map(({ json }) => json)).toEqual([{ id: '2' }]);
			expect(sent.map(({ url, qs }) => [url, qs])).toEqual([
				['https://api.feed.test/changes', {}],
				['https://api.feed.test/changes', { since: '1' }],
			]);
		}, 30_000);

		it('refuses a poll request outside the egress of the manifest in the host, and reports it', async () => {
			const type = await typeOf(await versionOf('leaked', 'community'));
			await expect(type.poll?.call(contextOf({}, [[]]) as never)).rejects.toThrow(
				'Host not allowed: feed.leaked may send requests to api.feed.test, not to evil.example',
			);
			expect(sent).toEqual([]);
			expect(refusals).toEqual([
				expect.objectContaining({
					action: 'feed.leaked',
					permission: 'egress',
					host: 'evil.example',
				}),
			]);
		}, 30_000);

		it('runs a first-party trigger in this process and a community trigger in the sandbox', async () => {
			const missing = options(path.join(dirs.root, 'no-sidecar'));
			const firstParty = await typeOf(await versionOf('changed', 'first-party'), missing);
			const polled = await firstParty.poll?.call(contextOf({}, [[{ id: '1' }]]) as never);
			expect(polled?.[0]?.map(({ json }) => json)).toEqual([{ id: '1' }]);
			const community = await typeOf(await versionOf('changed', 'community'), missing);
			await expect(community.poll?.call(contextOf({}, [[]]) as never)).rejects.toThrow(
				'The sandbox did not start',
			);
		}, 30_000);

		it('registers, checks, delivers and deletes the webhook of a sandboxed trigger', async () => {
			const type = await typeOf(await versionOf('hooked', 'community'));
			const hooks = type.webhookMethods?.default;
			const data: IDataObject = {};
			expect(await hooks?.create.call(contextOf(data, [{ id: 'h1' }]) as never)).toBe(true);
			expect(data.webhookId).toBe('h1');
			expect(data.webhookSecret).toMatch(/^[0-9a-f]{64}$/);
			expect(await hooks?.checkExists.call(contextOf(data, [{}]) as never)).toBe(true);
			const body = { id: 7 };
			const rawBody = Buffer.from(JSON.stringify(body));
			const deliver = async (secret: string) => {
				const response = { status: () => response, send: () => response, end: () => response };
				const signature = createHmac('sha256', secret).update(rawBody).digest('hex');
				return await type.webhook?.call({
					...contextOf(data, []),
					getRequestObject: () => ({ rawBody }),
					getHeaderData: () => ({ 'x-signature': signature }),
					getBodyData: () => body,
					getQueryData: () => ({}),
					getResponseObject: () => response,
				} as never);
			};
			expect(await deliver(data.webhookSecret as string)).toEqual({
				workflowData: [[{ json: { id: '7' } }]],
			});
			expect(await deliver('forged')).toEqual({ noWebhookResponse: true });
			expect(await hooks?.delete.call(contextOf(data, [{}]) as never)).toBe(true);
			expect(data).toEqual({});
			expect(sent.map(({ method, url }) => `${method ?? 'GET'} ${url}`)).toEqual([
				'POST https://api.feed.test/hooks',
				'GET https://api.feed.test/hooks/h1',
				'DELETE https://api.feed.test/hooks/h1',
			]);
		}, 30_000);

		it('refuses a sandboxed webhook bundle whose manifest drops its signature', async () => {
			const version = await versionOf('hooked', 'community');
			const { verify: _, ...contract } = version.manifest.contract;
			const type = await typeOf({ ...version, manifest: { ...version.manifest, contract } });
			await expect(
				type.webhookMethods?.default?.create.call(contextOf({}, []) as never),
			).rejects.toThrow('checks another webhook signature than its manifest');
		}, 30_000);
	},
);

import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { INode } from 'n8n-workflow';

import { packAction, type PackedAction } from '../pack';
import { hostRuntime, type ExecutorHost } from '../runtime';
import { WORKER_GUEST, workerRuntime } from '../runtimes/worker';
import {
	sandboxedVersionOf,
	wasmSidecarRuntime,
	type Connection,
	type GuestRuntime,
} from '../sandbox';

const SANDBOX = path.resolve(__dirname, '..', '..', 'sandbox');
const SIDECAR = path.join(SANDBOX, 'sidecar', 'target', 'release', 'n8n-sandbox');
// The guests with `chunk-run`. Point it at a private build until the shared guests have it.
const GUESTS = process.env.N8N_NODE_CONTRACT_SANDBOX_GUESTS ?? path.join(SANDBOX, 'dist');

const PROBE = `import { defineNode, t } from '@n8n/node-sdk';
const probe = defineNode({ id: 'probe', displayName: 'Probe' });
export const chunkProbe = probe.action('chunk', {
	action: 'Chunk',
	summary: 'Probe chunked item runs.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: { text: t.str() },
	output: t.obj({ value: t.str() }),
	egress: { hosts: ['api.example.com'] },
	run: async ({ input, http, item }) => {
		await http.request({ url: 'https://api.example.com/' + input.text });
		if (input.text === 'twice') await http.request({ url: 'https://api.example.com/again' });
		if (input.text === 'fail') throw new Error('item failed');
		return { value: input.text + ':' + String(item.json.n) };
	},
} as any);
`;

const node: INode = {
	id: '1',
	name: 'Probe',
	type: 'probe',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

type Served = Parameters<Connection['serve']>[0];

/** A runtime whose connections record each request method. */
const recorded = (inner: GuestRuntime, methods: string[]): GuestRuntime => ({
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
});

/** A guest that runs `script` with the host calls at its first `[take]` and gives no outcome. */
const scripted = (script: (calls: Served) => Promise<unknown>): GuestRuntime => ({
	name: 'scripted',
	async start({ manifest }) {
		const served = new Map<'calls', Served>();
		return {
			async request(method) {
				if (method === '[initialize]') {
					return { nodeContract: manifest.nodeContract, kind: 'action' };
				}
				if (method === 'action.describe') {
					return { id: manifest.id, node: { id: manifest.contract.node, displayName: 'Probe' } };
				}
				if (method === 'action.chunk-run.[new]') return 1;
				if (method === 'action.chunk-run.[take]') {
					await script(served.get('calls')!).catch(() => undefined);
					return { outputs: [], done: true };
				}
				throw new Error(`unexpected ${method}`);
			},
			notify() {},
			serve(calls) {
				served.set('calls', calls);
				return () => served.delete('calls');
			},
			close() {},
		};
	},
});

describe('chunked item runs', () => {
	const dirs = { root: '' };
	const packed = new Map<'probe', PackedAction>();
	const requests: string[] = [];

	const hostOf = (texts: readonly string[], continueOnFail: boolean): ExecutorHost => ({
		items: texts.map((_text, n) => ({ json: { n } })),
		node,
		parameter: (key, index) => (key === 'text' ? texts[index] : undefined),
		request: async (request) => {
			requests.push(String(request.url));
			return { body: {}, headers: {}, statusCode: 200 };
		},
		continueOnFail: () => continueOnFail,
		limits: { maxRequests: 1 },
	});

	const executorOf = async (runtime: GuestRuntime, chunkItems: boolean) => {
		const probe = packed.get('probe')!;
		const { executor } = await sandboxedVersionOf(
			{ manifest: probe.manifest, origin: 'private', readBundle: async () => probe.bundle },
			{
				runtime,
				chunkItems,
				cacheDir: path.join(dirs.root, 'cache'),
				credentialType: () => undefined,
				limits: { wallMs: 60_000 },
			},
			hostRuntime(),
		);
		return executor;
	};

	beforeAll(async () => {
		dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-chunked-'));
		await writeFile(path.join(dirs.root, 'probe.ts'), PROBE);
		packed.set('probe', await packAction(path.join(dirs.root, 'probe.ts'), 'chunkProbe'));
	});

	afterAll(async () => {
		await rm(dirs.root, { recursive: true, force: true });
	});

	beforeEach(() => {
		requests.length = 0;
	});

	const runtimes: Array<[string, () => GuestRuntime, boolean]> = [
		[
			'wasm-sidecar',
			() => wasmSidecarRuntime({ sidecar: SIDECAR, guests: GUESTS }),
			existsSync(SIDECAR) && existsSync(path.join(GUESTS, 'action.wasm')),
		],
		['worker', () => workerRuntime(), existsSync(WORKER_GUEST)],
	];

	describe.each(runtimes)('on %s', (_name, runtimeOf, available) => {
		it.skipIf(!available)(
			'gives each item its own input, request count, error and pairing in one chunk-run',
			async () => {
				const texts = ['a', 'fail', 'twice', 'b'];
				const methods: string[] = [];
				const chunked = await executorOf(recorded(runtimeOf(), methods), true);
				const outputs = await chunked(hostOf(texts, true));
				expect(outputs).toEqual([
					[
						{ json: { value: 'a:0' }, pairedItem: { item: 0 } },
						{ json: { error: 'item failed' }, pairedItem: { item: 1 } },
						{
							json: {
								error: expect.stringContaining('sent 1 requests for one input item'),
							},
							pairedItem: { item: 2 },
						},
						{ json: { value: 'b:3' }, pairedItem: { item: 3 } },
					],
				]);
				expect(requests).toEqual([
					'https://api.example.com/a',
					'https://api.example.com/fail',
					'https://api.example.com/twice',
					'https://api.example.com/b',
				]);
				expect(methods.filter((method) => method.startsWith('action.'))).toEqual([
					'action.describe',
					'action.chunk-run.[new]',
					'action.chunk-run.[take]',
				]);

				const sent = [...requests];
				requests.length = 0;
				const perItem = await executorOf(runtimeOf(), false);
				expect(await perItem(hostOf(texts, true))).toEqual(outputs);
				expect(requests).toEqual(sent);
			},
		);

		it.skipIf(!available)('stops at the first failed item without continue-on-fail', async () => {
			const chunked = await executorOf(runtimeOf(), true);
			await expect(chunked(hostOf(['a', 'fail', 'b'], false))).rejects.toThrow('item failed');
			expect(requests).toEqual(['https://api.example.com/a', 'https://api.example.com/fail']);
		});
	});

	it('fails the run when the guest names another item than the next one', async () => {
		const executor = await executorOf(
			scripted(async (calls) => await calls('chunk.item', { index: 1 })),
			true,
		);
		await expect(executor(hostOf(['a', 'b'], true))).rejects.toThrow(
			'probe.chunk named item 1, and the next item is 0',
		);
	});

	it('fails the run on a host call before the first item', async () => {
		const executor = await executorOf(
			scripted(
				async (calls) =>
					await calls('http.request', {
						request: {
							method: 'GET',
							target: { tag: 'url', val: 'https://api.example.com/a' },
							query: [],
							headers: [],
						},
					}),
			),
			true,
		);
		await expect(executor(hostOf(['a'], true))).rejects.toThrow(
			'probe.chunk called http.request before the first item',
		);
		expect(requests).toEqual([]);
	});
});

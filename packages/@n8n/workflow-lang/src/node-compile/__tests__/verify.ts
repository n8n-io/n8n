import { helperSources } from '../../convert/helpers.ts';
import { withDerivedValues } from '../../credentials/derived.ts';
import { deriveInject } from '../../credentials/inject.ts';
import type { PublicCredential } from '../../credentials/public.ts';
import { publicCredential } from '../../credentials/public.ts';
import type {
	EquivalenceCase,
	NormalRequest,
	RecordedItem,
	Recording,
} from '../../nodes/__tests__/equivalence.ts';
import { applyCredential, normalizeRequest } from '../../nodes/__tests__/equivalence.ts';
import { recordV1, recordV1Cached } from '../../nodes/__tests__/v1-recorder.ts';
import { runReference } from '../../reference/runner.ts';
import type { ErrorMode, NodeSources } from '../convert.ts';
import { compileNodeInstance } from '../convert.ts';
import { evaluateDerivation } from '../evaluate-node.ts';
import type { CredentialMint } from '../specialise.ts';

export const V1_TIMEZONE = 'America/New_York';

type Registry = Parameters<typeof deriveInject>[0];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function credentialsOf(
	c: EquivalenceCase,
	registry: Registry,
): Record<string, PublicCredential> {
	if (!c.credential) return {};
	return {
		[c.credential.type]: publicCredential(registry.get(c.credential.type), c.credential.data),
	};
}

const escaped = (text: string) =>
	text.replaceAll('\r', '%0D').replaceAll('\n', '%0A').replaceAll('"', '%22');

export function sentParts(multipart: unknown): unknown {
	if (!Array.isArray(multipart)) return multipart;
	return multipart.map((part: unknown) => {
		if (!isRecord(part)) return part;
		const name = escaped(String(part.name));
		const file = part.binary;
		if (!isRecord(file)) return { name, value: part.value };
		if (file.id !== undefined) return { name, stored: file };
		return {
			name,
			...(typeof file.fileName === 'string' ? { fileName: escaped(file.fileName) } : {}),
			...(typeof file.mimeType === 'string' ? { contentType: file.mimeType } : {}),
			data: file.data,
		};
	});
}

type Compiled = ReturnType<typeof compileNodeInstance>;
const RECENT_COMPILES = 8;
const recent: Array<{ sources: NodeSources; key: string; compiled: Compiled }> = [];

export function compileForCheck(
	sources: NodeSources,
	instance: { type: string; version: number; parameters: Record<string, unknown> },
	credentials: Record<string, PublicCredential>,
	errorMode: ErrorMode = 'stopWorkflow',
): Compiled {
	const key = JSON.stringify([
		instance.type,
		instance.version,
		instance.parameters,
		credentials,
		errorMode,
	]);
	const found = recent.find((entry) => entry.sources === sources && entry.key === key);
	if (found) return found.compiled;
	const compiled = compileNodeInstance(
		sources,
		instance,
		null,
		credentials,
		V1_TIMEZONE,
		errorMode,
	);
	recent.push({ sources, key, compiled });
	if (recent.length > RECENT_COMPILES) recent.shift();
	return compiled;
}

async function within<T>(ms: number, work: Promise<T>): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	const late = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => reject(new Error(`no result after ${ms} ms`)), ms);
	});
	try {
		return await Promise.race([work, late]);
	} finally {
		clearTimeout(timer);
	}
}

const TOKEN_EXCHANGE_URL = 'https://oauth2.googleapis.com/token';
const MAX_TOKEN_ROUNDS = 4;

export const MINTED_TOKEN_RESPONSE: EquivalenceCase['responses'][number] = {
	body: { access_token: 'minted-token', expires_in: 3599, token_type: 'Bearer' },
};

function tokenExchangeScope(request: NormalRequest): string | undefined {
	if (request.method !== 'POST' || request.url !== TOKEN_EXCHANGE_URL) return undefined;
	const form = isRecord(request.body) ? request.body.$form : undefined;
	const assertion = isRecord(form) ? form.assertion : undefined;
	if (typeof assertion !== 'string') return undefined;
	try {
		const claims: unknown = JSON.parse(
			Buffer.from(assertion.split('.')[1] ?? '', 'base64url').toString('utf8'),
		);
		return isRecord(claims) && typeof claims.scope === 'string' ? claims.scope : undefined;
	} catch {
		return undefined;
	}
}

interface MintedRun {
	testCase: EquivalenceCase;
	v1: Recording;
	exchanges: Set<number>;
	tokens: Record<string, { access_token: string }>;
}

async function recordWithMints(
	c: EquivalenceCase,
	mints: CredentialMint[],
	record: (testCase: EquivalenceCase) => Promise<Recording>,
): Promise<MintedRun | string> {
	const answerAt = (list: EquivalenceCase['responses'], k: number) =>
		list[Math.min(k, list.length - 1)];
	let testCase = c;
	for (let round = 0; round < MAX_TOKEN_ROUNDS; round++) {
		const v1 = await record(testCase);
		const exchanges = new Set<number>();
		const tokens: Record<string, { access_token: string }> = {};
		let settled = true;
		for (const [k, request] of v1.requests.entries()) {
			const scope = tokenExchangeScope(request);
			if (scope === undefined) continue;
			const mint = mints.find((m) => m.scopes.join(' ') === scope);
			if (!mint) return `v1 asks for a token with scopes that the compiled node did not record`;
			exchanges.add(k);
			const body = answerAt(testCase.responses, k)?.body;
			const token = isRecord(body) ? body.access_token : undefined;
			if (typeof token !== 'string') {
				settled = false;
				continue;
			}
			if (tokens[mint.name] !== undefined && tokens[mint.name].access_token !== token)
				return 'v1 got two different tokens for one token request';
			tokens[mint.name] = { access_token: token };
		}
		if (settled) return { testCase, v1, exchanges, tokens };
		const others = testCase.responses.filter((r) => r !== MINTED_TOKEN_RESPONSE);
		let used = 0;
		testCase = {
			...testCase,
			responses: v1.requests.map((_request, k) =>
				exchanges.has(k) ? MINTED_TOKEN_RESPONSE : (answerAt(others, used++) ?? { body: {} }),
			),
		};
	}
	return 'the token requests of v1 do not settle';
}

function withoutFiles(item: Record<string, unknown>): Record<string, unknown> {
	const { $binary: _files, ...json } = item;
	return json;
}

function isErrorJson(json: unknown): boolean {
	if (!isRecord(json) || !json.error) return false;
	return Object.keys(json).every((key) => ['error', 'message', 'details'].includes(key));
}

export type ErrorPairing = 'item' | 'position';

export function outputsOfV1Engine(
	outputs: RecordedItem[][],
	mode: ErrorMode,
	inputs: Array<Record<string, unknown>>,
): { outputs: unknown[][]; pairing?: ErrorPairing } | string {
	if (outputs.length > 1) return 'the v1 node has more than one output';
	const items = outputs[0] ?? [];
	if (mode !== 'continueErrorOutput') {
		return { outputs: [items.map((i) => (i.error === undefined ? i.json : { error: i.error }))] };
	}
	const main: unknown[] = [];
	const errors: unknown[] = [];
	let pairing: ErrorPairing | undefined;
	for (const [k, item] of items.entries()) {
		if (item.error !== undefined) {
			errors.push({ error: item.error });
			continue;
		}
		if (!isErrorJson(item.json)) {
			main.push(item.json);
			continue;
		}
		const found: ErrorPairing = item.paired === undefined ? 'position' : 'item';
		if (pairing !== undefined && pairing !== found)
			return 'v1 pairs some error items with their input items and not others';
		pairing = found;
		let at = item.paired;
		if (found === 'position') {
			if (inputs.length === 1 || items.length === 1) at = 0;
			else if (items.length === inputs.length) at = k;
		}
		const input = at === undefined ? undefined : inputs[at];
		if (found === 'item' && input === undefined)
			return 'v1 pairs an error item with an input item that is not there';
		errors.push(
			input === undefined
				? item.json
				: { ...withoutFiles(input), ...(isRecord(item.json) ? item.json : {}) },
		);
	}
	return { outputs: [main, errors], pairing };
}

function continueWorkflow(
	type: string,
	c: EquivalenceCase,
	credentialType: string | undefined,
	errorOutput: boolean,
	pairing: ErrorPairing,
): string {
	const split = !errorOutput
		? 'for (const r of result) out.push(r);'
		: pairing === 'item'
			? 'splitErrorItems(result, item, out, errors);'
			: 'for (const r of result) all.push(r);';
	const helper = pairing === 'item' ? 'splitErrorItems' : 'splitErrorItemsByPosition';
	return `import { webhook, workflow } from '@n8n/workflow-lang';

type Json = any;

export default workflow({
	triggers: [webhook({ path: 'verify' })],
	${credentialType ? `credentials: { c: { type: ${JSON.stringify(credentialType)} } },` : ''}
	async run(ctx) {
		const items: Json[] = ${JSON.stringify(c.items ?? [{}])};
		let out: Json[] = [];
		let errors: Json[] = [];
		try {
			const all: Json[] = [];
			for (const item of items) {
				const result: Json[] = await ctx.node({
					name: 'Node',
					type: ${JSON.stringify(type)},
					typeVersion: ${c.typeVersion},
					parameters: {},
					items: [item],
					${credentialType ? "credential: 'c'," : ''}
				});
				${split}
			}
			${errorOutput && pairing === 'position' ? 'splitErrorItemsByPosition(all, items, out, errors);' : ''}
		} catch (error) {
			out = [...items];
			errors = [];
		}
		return ${errorOutput ? '[out, errors]' : '[out]'};
	},
});

${errorOutput ? helperSources([helper]).join('\n\n') : ''}
`;
}

export async function differenceFromV1(
	c: EquivalenceCase,
	sources: NodeSources,
	registry: Registry,
	options: { cache?: boolean; pairings?: Set<ErrorPairing> } = {},
): Promise<string | undefined> {
	const mode: ErrorMode = c.onError ?? 'stopWorkflow';
	const continues = mode !== 'stopWorkflow';
	const compiled = compileForCheck(
		sources,
		{ type: c.type, version: c.typeVersion, parameters: c.parameters },
		credentialsOf(c, registry),
		mode,
	);
	if ('errors' in compiled) return `does not compile: ${compiled.errors[0]}`;
	const credentialType = c.credential?.type;
	const plainSource = `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'verify' })],
	${credentialType ? `credentials: { c: { type: ${JSON.stringify(credentialType)} } },` : ''}
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: ${JSON.stringify(compiled.type)},
			typeVersion: ${c.typeVersion},
			parameters: {},
			${c.items ? `items: ${JSON.stringify(c.items)},` : ''}
			${credentialType ? "credential: 'c'," : ''}
		});
	},
});
`;
	const record = async (testCase: EquivalenceCase) =>
		await within(8000, options.cache === true ? recordV1Cached(testCase) : recordV1(testCase));
	const minted =
		compiled.mints.length > 0 ? await recordWithMints(c, compiled.mints, record) : undefined;
	if (typeof minted === 'string') return minted;
	const v1 = minted?.v1 ?? (await record(c));
	const engine = continues ? outputsOfV1Engine(v1.outputs ?? [], mode, c.items ?? [{}]) : undefined;
	if (typeof engine === 'string' && v1.error === undefined) return engine;
	const pairing = typeof engine === 'object' ? engine.pairing : undefined;
	const source = continues
		? continueWorkflow(
				compiled.type,
				c,
				credentialType,
				mode === 'continueErrorOutput',
				pairing ?? 'item',
			)
		: plainSource;
	const responses = minted
		? minted.testCase.responses.filter((_response, k) => !minted.exchanges.has(k))
		: c.responses;
	const fixture = {
		trigger: { body: {}, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects: { Node: responses.map((r) => ({ status: 200, headers: {}, ...r })) },
	};
	const out = await runReference(source, fixture, {
		extraNodes: { [compiled.file]: compiled.source },
	});

	const data: Record<string, unknown> = withDerivedValues(credentialType ?? '', {
		...(registry.get(credentialType ?? '')?.defaults ?? {}),
		...c.credential?.data,
	});
	if (compiled.derivations.length > 0) {
		const derived: Record<string, unknown> = isRecord(data.n8nDerived)
			? { ...data.n8nDerived }
			: {};
		for (const { name, code } of compiled.derivations) {
			const value = evaluateDerivation(code, data);
			if (value === undefined)
				return `a derived credential value is not text: ${code.slice(0, 80)}`;
			derived[name] = value;
		}
		data.n8nDerived = derived;
	}
	if (minted) {
		for (const mint of compiled.mints) {
			if (minted.tokens[mint.name] === undefined && minted.exchanges.size > 0)
				return 'the compiled node recorded a token request that v1 did not send';
		}
		data.n8nMinted = minted.tokens;
	}
	const inject = credentialType ? deriveInject(registry, credentialType, data).inject : undefined;
	const requests = out.effects.map((effect) => {
		const args = isRecord(effect.args) ? effect.args : {};
		const { qsFormat: _, ...request } = normalizeRequest(
			applyCredential(
				{
					method: String(args.method),
					url: String(args.url),
					headers: args.headers,
					qs: args.qs,
					body:
						args.multipart === undefined ? args.body : { $multipart: sentParts(args.multipart) },
					basicAuth: args.basicAuth,
					inject: args.inject,
				},
				inject,
				data,
			),
		);
		const type = request.headers['content-type'] ?? '';
		if (type.startsWith('application/x-www-form-urlencoded') && typeof request.body === 'string') {
			const { 'content-type': _type, ...headers } = request.headers;
			return {
				...request,
				headers,
				body: { $form: Object.fromEntries(new URLSearchParams(request.body)) },
			};
		}
		return request;
	});
	const sent = minted ? v1.requests.filter((_request, k) => !minted.exchanges.has(k)) : v1.requests;
	const expected = sent.map(({ qsFormat: _, ...r }) => {
		const form = isRecord(r.body) ? r.body.$form : undefined;
		if (!isRecord(form)) return r;
		const text: Record<string, string> = {};
		for (const [key, value] of Object.entries(form)) {
			if (value !== undefined)
				text[key] = value === null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
		}
		const { 'content-type': _type, ...headers } = r.headers;
		return { ...r, headers, body: { $form: text } };
	});
	if (JSON.stringify(requests) !== JSON.stringify(expected)) {
		if (requests.length !== expected.length) {
			const cause = v1.error === undefined ? '' : `; v1 fails: ${v1.error.slice(0, 90)}`;
			return `the requests differ: count ${requests.length} / ${expected.length}${cause}`;
		}
		for (let k = 0; k < requests.length; k++) {
			const mine: Record<string, unknown> = { ...requests[k] };
			const theirs: Record<string, unknown> = { ...expected[k] };
			for (const part of ['method', 'url', 'qs', 'headers', 'body', 'basicAuth']) {
				const a = JSON.stringify(mine[part]);
				const b = JSON.stringify(theirs[part]);
				if (a !== b)
					return `the requests differ: ${part} ${String(a).slice(0, 70)} / ${String(b).slice(0, 70)}`;
			}
		}
		return 'the requests differ';
	}
	if (continues) {
		if (v1.error !== undefined) return `v1 fails outside the node: ${v1.error.slice(0, 90)}`;
		if (out.status !== 'ok')
			return `the compiled node fails: ${JSON.stringify(out.result).slice(0, 120)}`;
		if (typeof engine !== 'object') return 'v1 gives no outputs';
		const mine: unknown[] = Array.isArray(out.result) ? out.result : [];
		for (const [k, expected] of engine.outputs.entries()) {
			if (JSON.stringify(mine[k]) !== JSON.stringify(expected))
				return `output ${k} differs: ${JSON.stringify(mine[k]).slice(0, 70)} / ${JSON.stringify(expected).slice(0, 70)}`;
		}
		if (pairing !== undefined) options.pairings?.add(pairing);
		return undefined;
	}
	if (v1.error !== undefined) {
		if (out.status !== 'error') return 'v1 fails and the compiled node does not';
		const message = isRecord(out.result) ? out.result.message : out.result;
		return message === v1.error ? undefined : `the error differs: ${String(message)} / ${v1.error}`;
	}
	if (out.status !== 'ok')
		return `the compiled node fails: ${JSON.stringify(out.result).slice(0, 120)}`;
	return JSON.stringify(out.result) === JSON.stringify(v1.output)
		? undefined
		: 'the output differs';
}

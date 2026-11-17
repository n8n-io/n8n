import { createHash } from 'node:crypto';

import { Writer } from '../../convert/code.ts';
import { helperSources } from '../../convert/helpers.ts';
import {
	emitContinueLoop,
	emitContinueOnce,
	errorRetryOf,
	pairedOutputOf,
} from '../../convert/steps.ts';
import { withDerivedValues } from '../../credentials/derived.ts';
import { credentialFlagKey } from '../../credentials/flags.ts';
import { deriveInject } from '../../credentials/inject.ts';
import type { PublicCredential } from '../../credentials/public.ts';
import { publicCredential } from '../../credentials/public.ts';
import type {
	EquivalenceCase,
	NormalRequest,
	Recording,
} from '../../nodes/__tests__/equivalence.ts';
import { applyCredential, normalizeRequest } from '../../nodes/__tests__/equivalence.ts';
import { recordV1, recordV1Cached } from '../../nodes/__tests__/v1-recorder.ts';
import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { libraryNodeTypes } from '../../library/node-sources.ts';
import { referenceHash } from '../../reference/binary-response.ts';
import { runReference } from '../../reference/runner.ts';
import type { VmCost } from '../../testing/vm.ts';
import { allocationsOf, emptyCost, runModule } from '../../testing/vm.ts';
import type { ErrorMode, NodeSources } from '../convert.ts';
import { compileNodeInstance, valueAtPath } from '../convert.ts';
import { evaluateDerivation, evaluateFlag } from '../evaluate-node.ts';
import type {
	CredentialDerivation,
	CredentialMint,
	PublishFacts,
	RandomShape,
} from '../specialise.ts';

export const V1_TIMEZONE = 'America/New_York';
export const V1_NOW = Date.UTC(2024, 0, 15, 17, 30, 0);
const READS_CLOCK = /\bDate\.now\(\)|\bnew Date\(\)/;

async function atFixedClock<T>(work: () => Promise<T>): Promise<T> {
	const real = Date;
	globalThis.Date = new Proxy(real, {
		construct: (target, args: unknown[], newTarget) =>
			Reflect.construct(target, args.length === 0 ? [V1_NOW] : args, newTarget),
		apply: (target) => new target(V1_NOW).toString(),
		get: (target, key) => (key === 'now' ? () => V1_NOW : Reflect.get(target, key)),
	});
	try {
		return await work();
	} finally {
		globalThis.Date = real;
	}
}
export const V1_FACTS: PublishFacts = {
	workflow: { id: 'equivalence', active: false },
	instanceBaseUrl: 'http://localhost:5678',
};
const OTHER_SEEDS = [2, 3, 5];
const UUID_V4 = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/g;
const UUID_MARK = '<random uuid>';
const INTEGER_MARK = '<random integer>';

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

function credentialData(c: EquivalenceCase, registry: Registry): Record<string, unknown> {
	const type = c.credential?.type ?? '';
	return withDerivedValues(type, {
		...(registry.get(type)?.defaults ?? {}),
		...c.credential?.data,
	});
}

function flagValues(
	flags: CredentialDerivation[],
	data: Record<string, unknown>,
): Record<string, boolean> | undefined {
	const values: Record<string, boolean> = {};
	for (const { name, code } of flags) {
		const value = evaluateFlag(code, data);
		if (value === undefined) return undefined;
		values[name] = value;
	}
	return values;
}

export function flagKeyOf(
	c: EquivalenceCase,
	flags: CredentialDerivation[],
	registry: Registry,
): string | undefined {
	const values = flagValues(flags, credentialData(c, registry));
	return values === undefined
		? undefined
		: credentialFlagKey(
				flags.map((flag) => flag.name),
				values,
			);
}

const MAX_FLAG_VARIANTS = 8;
const LONG_TEXT = 'x'.repeat(80);

function otherValues(value: unknown, field: string): unknown[] {
	if (typeof value === 'boolean') return [!value];
	if (typeof value === 'string') return ['', LONG_TEXT, undefined];
	if (typeof value === 'number') return [0, 1, undefined];
	if (value === undefined) return [`fake-${field}`, true];
	return [];
}

export function flagVariants(
	c: EquivalenceCase,
	flags: CredentialDerivation[],
	registry: Registry,
): Array<{ data: Record<string, unknown>; key: string }> {
	const credential = c.credential;
	const base = flagKeyOf(c, flags, registry);
	if (!credential || base === undefined) return [];
	const classes = JSON.stringify(credentialsOf(c, registry));
	const fields = new Set<string>();
	for (const { code } of flags)
		for (const match of code.matchAll(/\bc\.([A-Za-z_$][\w$]*)/g)) fields.add(match[1]);
	const seen = new Set([base]);
	const variants: Array<{ data: Record<string, unknown>; key: string }> = [];
	for (const field of [...fields].sort()) {
		for (const value of otherValues(credentialData(c, registry)[field], field)) {
			if (variants.length >= MAX_FLAG_VARIANTS) return variants;
			const { [field]: _dropped, ...rest } = credential.data;
			const data = value === undefined ? rest : { ...rest, [field]: value };
			const changed = { ...c, credential: { ...credential, data } };
			if (JSON.stringify(credentialsOf(changed, registry)) !== classes) continue;
			const key = flagKeyOf(changed, flags, registry);
			if (key === undefined || seen.has(key)) continue;
			seen.add(key);
			variants.push({ data, key });
		}
	}
	return variants;
}

function storedFile(entry: unknown): unknown {
	if (!isRecord(entry) || typeof entry.data !== 'string') return entry;
	const { id, ...rest } = entry;
	const stored = referenceHash(id);
	if (stored !== undefined) return { ...rest, data: stored };
	if (id !== undefined) return entry;
	const bytes = Buffer.from(entry.data, 'base64');
	return { ...rest, data: createHash('sha256').update(bytes).digest('hex') };
}

export function comparableOutput(output: unknown): unknown {
	if (!Array.isArray(output)) return output;
	return output.map((item: unknown) => {
		if (!isRecord(item) || !isRecord(item.$binary)) return item;
		const { $binary: files, ...json } = item;
		const compared: Record<string, unknown> = {};
		for (const [name, entry] of Object.entries(files)) compared[name] = storedFile(entry);
		return { ...json, $binary: compared };
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
	pairedOutput = false,
	deferred: string[] = [],
): Compiled {
	const key = JSON.stringify([
		instance.type,
		instance.version,
		instance.parameters,
		credentials,
		errorMode,
		pairedOutput,
		deferred,
	]);
	const found = recent.find((entry) => entry.sources === sources && entry.key === key);
	if (found) return found.compiled;
	const compiled = compileNodeInstance(
		sources,
		instance,
		null,
		credentials,
		V1_TIMEZONE,
		V1_FACTS,
		errorMode,
		deferred,
		pairedOutput,
	);
	recent.push({ sources, key, compiled });
	if (recent.length > RECENT_COMPILES) recent.shift();
	return compiled;
}

function randomMark(
	mine: unknown,
	theirs: unknown,
	others: unknown[],
	shapes: RandomShape[],
): string | undefined {
	const made = [mine, ...others];
	if (typeof theirs === 'string' && made.every((value) => typeof value === 'string')) {
		if (!shapes.some((shape) => shape.kind === 'uuid') || theirs.includes(UUID_MARK))
			return undefined;
		const masked = String(mine).replace(UUID_V4, UUID_MARK);
		const count = (text: string) => text.match(UUID_V4)?.length ?? 0;
		const same = [theirs, ...made].every(
			(value) =>
				String(value).replace(UUID_V4, UUID_MARK) === masked &&
				count(String(value)) === count(String(mine)),
		);
		return same && count(String(mine)) > 0 ? masked : undefined;
	}
	const fits = (value: unknown, shape: RandomShape) =>
		shape.kind === 'integer' &&
		shape.min !== undefined &&
		shape.max !== undefined &&
		typeof value === 'number' &&
		Number.isInteger(value) &&
		value >= shape.min &&
		value < shape.max;
	const ranges = shapes.filter((shape) => made.every((value) => fits(value, shape)));
	return ranges.length > 0 && ranges.every((shape) => fits(theirs, shape))
		? INTEGER_MARK
		: undefined;
}

export function withoutRandomValues(
	mine: unknown,
	theirs: unknown,
	others: unknown[],
	shapes: RandomShape[],
): { mine: unknown; theirs: unknown } {
	if (Array.isArray(mine)) {
		const lists = [theirs, ...others];
		if (!lists.every((list) => Array.isArray(list) && list.length === mine.length))
			return { mine, theirs };
		const pairs = mine.map((member, k) =>
			withoutRandomValues(
				member,
				Array.isArray(theirs) ? theirs[k] : undefined,
				others.map((other) => (Array.isArray(other) ? other[k] : undefined)),
				shapes,
			),
		);
		return { mine: pairs.map((pair) => pair.mine), theirs: pairs.map((pair) => pair.theirs) };
	}
	if (isRecord(mine)) {
		const records = others.filter(isRecord);
		if (!isRecord(theirs) || records.length !== others.length) return { mine, theirs };
		const left: Record<string, unknown> = {};
		const right: Record<string, unknown> = { ...theirs };
		for (const [key, member] of Object.entries(mine)) {
			const pair = Object.hasOwn(theirs, key)
				? withoutRandomValues(
						member,
						theirs[key],
						records.map((other) => other[key]),
						shapes,
					)
				: { mine: member, theirs: undefined };
			left[key] = pair.mine;
			if (Object.hasOwn(theirs, key)) right[key] = pair.theirs;
		}
		return { mine: left, theirs: right };
	}
	const text = JSON.stringify(mine);
	if (others.every((other) => JSON.stringify(other) === text)) return { mine, theirs };
	const mark = randomMark(mine, theirs, others, shapes);
	return mark === undefined ? { mine, theirs } : { mine: mark, theirs: mark };
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

const V1_REQUEST_LIMIT = 'the node sent more than';

export type ErrorPairing = 'item' | 'position';

export type ContinueForm = ErrorPairing | 'once';

const MAX_ANSWERS = 64;

const ITEM_FIELD = /^=\{\{ \$json\.([A-Za-z_]\w*) \}\}$/;

export function itemFieldExpression(field: string): string {
	return `={{ $json.${field} }}`;
}

const FAILS_FOR_ITEM =
	/^=\{\{ \$json\.([A-Za-z_]\w*) === 'no' \? \$\('No such node'\)\.first\(\)\.json\.id : \$json\.\1 \}\}$/;
const NO_NODE = "$('No such node')";
const NO_NODE_MESSAGE = "Referenced node doesn't exist";
export const FAILING_VALUE = 'no';

export function itemFailureExpression(field: string): string {
	return `={{ $json.${field} === '${FAILING_VALUE}' ? ${NO_NODE}.first().json.id : $json.${field} }}`;
}

class ExpressionFailure extends Error {}

function valueForItem(value: unknown, item: Record<string, unknown>): unknown {
	if (typeof value === 'string') {
		const failing = FAILS_FOR_ITEM.exec(value)?.[1];
		if (failing !== undefined) {
			if (item[failing] === FAILING_VALUE) throw new ExpressionFailure(NO_NODE_MESSAGE);
			return item[failing];
		}
		const field = ITEM_FIELD.exec(value)?.[1];
		if (field !== undefined) return item[field];
		if (value.startsWith('='))
			throw new Error(`the check has no value for the expression ${value}`);
		return value;
	}
	if (Array.isArray(value)) return value.map((member: unknown) => valueForItem(member, item));
	if (isRecord(value))
		return Object.fromEntries(
			Object.entries(value).map(([key, member]) => [key, valueForItem(member, item)]),
		);
	return value;
}

export function itemParameterEntries(
	parameters: Record<string, unknown>,
	paths: string[],
	items: Array<Record<string, unknown>>,
	firstOnly: string[] = [],
	deferred: string[] = [],
): Array<Record<string, unknown>> {
	const entryOf = (path: string, item: Record<string, unknown>): unknown => {
		if (!deferred.includes(path)) return valueForItem(valueAtPath(parameters, path), item);
		try {
			return { value: valueForItem(valueAtPath(parameters, path), item) };
		} catch (error) {
			if (!(error instanceof ExpressionFailure)) throw error;
			return { error: { message: error.message } };
		}
	};
	return items.map((item, k) =>
		Object.fromEntries(
			paths
				.filter((path) => k === 0 || !firstOnly.includes(path))
				.map((path) => [path, entryOf(path, item)]),
		),
	);
}

function failingPaths(compiled: Exclude<Compiled, { errors: string[] }>): string[] {
	return compiled.itemParameters.filter((path) =>
		(JSON.stringify(valueAtPath(compiled.resolved, path)) ?? '').includes(NO_NODE),
	);
}

type ItemEntries = Array<Record<string, unknown>> | undefined;

function entriesOf(
	c: EquivalenceCase,
	compiled: Exclude<Compiled, { errors: string[] }>,
): ItemEntries {
	return compiled.itemParameters.length === 0
		? undefined
		: itemParameterEntries(
				compiled.resolved,
				compiled.itemParameters,
				c.items ?? [{}],
				compiled.firstItemParameters,
				compiled.deferred,
			);
}

function continueWorkflow(
	type: string,
	c: EquivalenceCase,
	credentialType: string | undefined,
	pairing: ContinueForm,
	each: ItemEntries,
): string {
	const errorOutput = c.settings?.onError === 'continueErrorOutput';
	const w = new Writer();
	w.depth = 2;
	const head = `{ name: 'Node', type: ${JSON.stringify(type)}, typeVersion: ${c.typeVersion}, parameters: `;
	const tail = credentialType ? ", credential: 'c' }" : ' }';
	const helpers =
		pairing === 'once'
			? emitContinueOnce(w, {
					node: 'Node',
					out: 'out',
					errors: errorOutput ? 'errors' : null,
					input: 'items',
					call: () => `${head}${each ? '{ each }' : '{}'}, items${tail}`,
					retry: errorRetryOf(c.settings ?? {}),
					trace: false,
				})
			: emitContinueLoop(w, {
					node: 'Node',
					out: 'out',
					errors: errorOutput ? 'errors' : null,
					input: 'items',
					item: 'item',
					index: each ? 'k' : null,
					call: () => `${head}${each ? '{ each: [each[k]] }' : '{}'}, items: [item]${tail}`,
					retry: errorRetryOf(c.settings ?? {}),
					byPosition: pairing === 'position',
					trace: false,
				});
	return `import { webhook, workflow } from '@n8n/workflow-lang';

type Json = any;

export default workflow({
	triggers: [webhook({ path: 'verify' })],
	${credentialType ? `credentials: { c: { type: ${JSON.stringify(credentialType)} } },` : ''}
	async run(ctx) {
		const items: Json[] = ${JSON.stringify(c.items ?? [{}])};
		${each ? `const each: Json[] = ${JSON.stringify(each)};` : ''}
${w.toString()}
		return ${errorOutput ? '[out, errors]' : '[out]'};
	},
});

${helperSources(helpers).join('\n\n')}
`;
}

export function errorPairingOfV1(recording: Recording): ErrorPairing | undefined {
	const [main, errors] = recording.outputs ?? [];
	const paired = recording.nodePaired ?? [];
	if (main === undefined || main.length > 0 || errors === undefined || errors.length === 0)
		return undefined;
	if (paired.length !== errors.length) return undefined;
	if (paired.every((p) => p)) return 'item';
	return paired.some((p) => p) ? undefined : 'position';
}

function workflowSourceOf(
	c: EquivalenceCase,
	type: string,
	parameters: Record<string, unknown>,
): string {
	const credentialType = c.credential?.type;
	return `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'verify' })],
	${credentialType ? `credentials: { c: { type: ${JSON.stringify(credentialType)} } },` : ''}
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: ${JSON.stringify(type)},
			typeVersion: ${c.typeVersion},
			parameters: ${JSON.stringify(parameters)},
			${c.items ? `items: ${JSON.stringify(c.items)},` : ''}
			${credentialType ? "credential: 'c'," : ''}
		});
	},
});
`;
}

function pairedSourceOf(c: EquivalenceCase, type: string, each: ItemEntries): string {
	const credentialType = c.credential?.type;
	return `import { webhook, workflow } from '@n8n/workflow-lang';

type Json = any;

export default workflow({
	triggers: [webhook({ path: 'verify' })],
	${credentialType ? `credentials: { c: { type: ${JSON.stringify(credentialType)} } },` : ''}
	async run(ctx) {
		const items: Json[] = ${JSON.stringify(c.items ?? [{}])};
		const run: Json = await ctx.node({
			name: 'Node',
			type: ${JSON.stringify(type)},
			typeVersion: ${c.typeVersion},
			parameters: ${JSON.stringify(each ? { each } : {})},
			items,
			${credentialType ? "credential: 'c'," : ''}
		});
		const lineage: Json[] = [];
		for (let k = 0; k < run.items.length; k++) {
			lineage.push(pairedSourceIndexes(run.paired[k], k, items.length, run.items.length));
		}
		return { items: run.items, lineage };
	},
});

${helperSources(['pairedSourceIndexes']).join('\n\n')}
`;
}

function lineageOfV1(paired: unknown[]): unknown[] {
	return paired.map((pair) =>
		(pair === null || pair === undefined ? [] : Array.isArray(pair) ? pair : [pair]).map(
			(one: unknown) => (isRecord(one) ? one.item : one),
		),
	);
}

function eachItemSourceOf(c: EquivalenceCase, type: string, each: ItemEntries): string {
	const credentialType = c.credential?.type;
	const loop = each
		? `const each: Json[] = ${JSON.stringify(each)};
		for (let k = 0; k < items.length; k++) {
			const item: Json = items[k];`
		: 'for (const item of items) {';
	return `import { webhook, workflow } from '@n8n/workflow-lang';

type Json = any;

export default workflow({
	triggers: [webhook({ path: 'verify' })],
	${credentialType ? `credentials: { c: { type: ${JSON.stringify(credentialType)} } },` : ''}
	async run(ctx) {
		const items: Json[] = ${JSON.stringify(c.items ?? [{}])};
		const out: Json[] = [];
		${loop}
			const result: Json[] = await ctx.node({
				name: 'Node',
				type: ${JSON.stringify(type)},
				typeVersion: ${c.typeVersion},
				parameters: ${each ? '{ each: [each[k]] }' : '{}'},
				items: [item],
				${credentialType ? "credential: 'c'," : ''}
			});
			for (const r of result) out.push(r);
		}
		return out;
	},
});
`;
}

const MAX_COMPILED_STEPS = 20000;
const effectsOf = (responses: EquivalenceCase['responses']) => ({
	Node: responses.map((r) => ({ status: 200, headers: {}, ...r })),
});

export interface CaseCost {
	ops: number;
	allocations: number;
	calls: number;
	reads: number;
	writes: number;
	branches: number;
	concats: number;
	stringUnits: number;
	effects: number;
	handWrittenOps?: number;
	handWrittenAllocations?: number;
}

const HAND_WRITTEN = new Set(libraryNodeTypes());

function bytecodeCost(
	source: string,
	extraNodes: Record<string, string>,
	responses: EquivalenceCase['responses'],
): { cost: VmCost; effects: string[] } | undefined {
	let built: ReturnType<typeof compile>;
	try {
		built = compile(source, { extraNodes });
	} catch {
		return undefined;
	}
	if (!built.ok || built.module === undefined) return undefined;
	const cost = emptyCost();
	const out = runModule(
		decodeModule(built.module),
		{
			trigger: { body: {}, headers: {}, query: {} },
			now: V1_NOW,
			seed: 1,
			effects: effectsOf(responses),
		},
		{ cost },
	);
	return out.status === 'ok' ? { cost, effects: out.effects.map((e) => e.kind) } : undefined;
}

export function costOfCase(
	c: EquivalenceCase,
	sources: NodeSources,
	registry: Registry,
	eachItem = false,
	form?: ContinueForm,
): CaseCost | undefined {
	const mode: ErrorMode = (form === undefined ? undefined : c.settings?.onError) ?? 'stopWorkflow';
	const compiled = compileForCheck(
		sources,
		{ type: c.type, version: c.typeVersion, parameters: c.parameters },
		credentialsOf(c, registry),
		mode,
		form === 'once' &&
			mode !== 'stopWorkflow' &&
			pairedOutputOf(mode === 'continueErrorOutput', errorRetryOf(c.settings ?? {})),
	);
	if ('errors' in compiled) return undefined;
	const given = c.responses.filter((r) => r !== MINTED_TOKEN_RESPONSE);
	const responses =
		form === undefined
			? given
			: Array.from({ length: MAX_ANSWERS }, (_, k) => given[Math.min(k, given.length - 1)]);
	const each = entriesOf(c, compiled);
	const mine = bytecodeCost(
		form !== undefined && mode !== 'stopWorkflow'
			? continueWorkflow(compiled.type, c, c.credential?.type, form, each)
			: eachItem
				? eachItemSourceOf(c, compiled.type, each)
				: workflowSourceOf(c, compiled.type, each ? { each } : {}),
		{ [compiled.file]: compiled.source },
		responses,
	);
	if (!mine) return undefined;
	const out: CaseCost = {
		ops: mine.cost.ops,
		allocations: allocationsOf(mine.cost),
		calls: mine.cost.calls,
		reads: mine.cost.reads,
		writes: mine.cost.writes,
		branches: mine.cost.branches,
		concats: mine.cost.concats,
		stringUnits: mine.cost.stringUnits,
		effects: mine.effects.length,
	};
	if (!HAND_WRITTEN.has(c.type)) return out;
	const theirs = bytecodeCost(workflowSourceOf(c, c.type, c.parameters), {}, responses);
	if (!theirs || theirs.effects.join() !== mine.effects.join()) return out;
	return {
		...out,
		handWrittenOps: theirs.cost.ops,
		handWrittenAllocations: allocationsOf(theirs.cost),
	};
}

const RUNTIME_ACCEPT = 'application/json,text/*;q=0.9,*/*;q=0.8';

function sentAccept(acceptAs: unknown, json: unknown): string {
	if (acceptAs === 'legacy') return json === true ? 'application/json' : '*/*';
	if (acceptAs === 'request') {
		const falsy =
			json === undefined || json === null || json === false || json === 0 || json === '';
		return falsy ? 'application/json, text/plain, */*' : 'application/json';
	}
	return RUNTIME_ACCEPT;
}

export async function differenceFromV1(
	c: EquivalenceCase,
	sources: NodeSources,
	registry: Registry,
	options: {
		cache?: boolean;
		pairing?: ContinueForm;
		pairings?: Set<ErrorPairing>;
		eachItem?: boolean;
		paired?: boolean;
	} = {},
): Promise<string | undefined> {
	const mode: ErrorMode =
		c.settings?.onError ?? (c.settings?.continueOnFail ? 'continueRegularOutput' : 'stopWorkflow');
	const continues = mode !== 'stopWorkflow';
	if (c.settings !== undefined && !continues)
		return 'node settings have a check only under a "continue" setting';
	if (options.paired === true && continues)
		return 'the paired items have a check only when the node stops the workflow';
	const pairedOutput =
		options.paired === true ||
		(options.pairing === 'once' &&
			pairedOutputOf(mode === 'continueErrorOutput', errorRetryOf(c.settings ?? {})));
	const instance = { type: c.type, version: c.typeVersion, parameters: c.parameters };
	const plain = compileForCheck(sources, instance, credentialsOf(c, registry), mode, pairedOutput);
	if ('errors' in plain) return `does not compile: ${plain.errors[0]}`;
	const failing = failingPaths(plain);
	const compiled =
		failing.length === 0
			? plain
			: compileForCheck(sources, instance, credentialsOf(c, registry), mode, pairedOutput, failing);
	if ('errors' in compiled) return `does not compile: ${compiled.errors[0]}`;
	const inEngine: EquivalenceCase =
		options.paired === true
			? { ...c, name: `${c.name} in the engine`, settings: { onError: 'stopWorkflow' } }
			: c;
	const asked: EquivalenceCase = compiled.storesResponses
		? { ...inEngine, responseBytes: true }
		: inEngine;
	const credentialType = c.credential?.type;
	const each = entriesOf(c, compiled);
	const plainSource =
		options.paired === true
			? pairedSourceOf(c, compiled.type, each)
			: options.eachItem === true
				? eachItemSourceOf(c, compiled.type, each)
				: workflowSourceOf(c, compiled.type, each ? { each } : {});
	const recordPlain = async (testCase: EquivalenceCase) =>
		await within(8000, options.cache === true ? recordV1Cached(testCase) : recordV1(testCase));
	const record = async (testCase: EquivalenceCase) =>
		READS_CLOCK.test(compiled.source)
			? await atFixedClock(
					async () => await recordPlain({ ...testCase, name: `${testCase.name} at ${V1_NOW}` }),
				)
			: await recordPlain(testCase);
	const minted =
		compiled.mints.length > 0 ? await recordWithMints(asked, compiled.mints, record) : undefined;
	if (typeof minted === 'string') return minted;
	const v1 = minted?.v1 ?? (await record(asked));
	if (v1.error?.includes(V1_REQUEST_LIMIT)) return `v1 has no result: ${v1.error.slice(0, 90)}`;
	const source = continues
		? continueWorkflow(compiled.type, c, credentialType, options.pairing ?? 'item', each)
		: plainSource;
	const given = minted
		? minted.testCase.responses.filter((_response, k) => !minted.exchanges.has(k))
		: c.responses;
	const responses =
		continues || options.eachItem === true
			? Array.from({ length: MAX_ANSWERS }, (_, k) => given[Math.min(k, given.length - 1)])
			: given;
	const flags = flagValues(compiled.flags, credentialData(c, registry));
	if (flags === undefined)
		return 'a condition on the credential has no value for the test credential';
	const fixture = {
		trigger: { body: {}, headers: {}, query: {} },
		now: V1_NOW,
		seed: 1,
		effects: effectsOf(responses),
		...(compiled.flags.length > 0 ? { credentialFlags: { c: flags } } : {}),
	};
	const runWith = async (seed: number) =>
		await runReference(
			source,
			{ ...fixture, seed },
			{ extraNodes: { [compiled.file]: compiled.source }, maxSteps: MAX_COMPILED_STEPS },
		);
	const out = await runWith(fixture.seed);

	const data: Record<string, unknown> = withDerivedValues(credentialType ?? '', {
		...(registry.get(credentialType ?? '')?.defaults ?? {}),
		...c.credential?.data,
		...v1.preAuthentication?.data,
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
	const inject = credentialType
		? deriveInject(registry, credentialType, data, { preAuthenticated: true }).inject
		: undefined;
	const renewsSession = (effect: (typeof out.effects)[number]) =>
		effect.kind === 'service' &&
		isRecord(effect.args) &&
		effect.args.service === 'credentials' &&
		effect.args.op === 'renew';
	const sessionRequests = (v1.preAuthentication?.requests ?? 1) - 1;
	const renewals = out.effects.filter(renewsSession).length;
	if (renewals !== sessionRequests)
		return `the requests for a new session token differ: ${renewals} / ${sessionRequests}`;
	const requestsOf = (run: typeof out) =>
		run.effects.filter((effect) => effect.kind !== 'wait' && !renewsSession(effect)).map(requestOf);
	const requestOf = (effect: (typeof out.effects)[number]) => {
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
		if (request.headers.accept === undefined)
			request.headers.accept = sentAccept(args.acceptAs, args.json);
		const type = request.headers['content-type'] ?? '';
		const fields = isRecord(request.body) ? request.body.$form : undefined;
		if (type.startsWith('application/x-www-form-urlencoded') && isRecord(fields)) {
			const { 'content-type': _type, ...headers } = request.headers;
			const sentFields: Record<string, string> = {};
			for (const [key, value] of Object.entries(fields))
				sentFields[key] = value === null ? '' : String(value);
			return { ...request, headers, body: { $form: sentFields } };
		}
		const text = request.body ?? '';
		if (type.startsWith('application/x-www-form-urlencoded') && typeof text === 'string') {
			const { 'content-type': _type, ...headers } = request.headers;
			return {
				...request,
				headers,
				body: { $form: Object.fromEntries(new URLSearchParams(text)) },
			};
		}
		return request;
	};
	const others = compiled.randoms.length > 0 ? await Promise.all(OTHER_SEEDS.map(runWith)) : [];
	const recorded = v1.requests.map((request, k) => {
		const added = v1.accepts?.[k];
		return request.headers.accept !== undefined || added === undefined || added === null
			? request
			: { ...request, headers: { ...request.headers, accept: added } };
	});
	const sent = minted ? recorded.filter((_request, k) => !minted.exchanges.has(k)) : recorded;
	const sentPlain = sent.map(({ qsFormat: _, ...r }) => {
		const emptyForm =
			r.body === undefined &&
			(r.headers['content-type'] ?? '').startsWith('application/x-www-form-urlencoded');
		const form = emptyForm ? {} : isRecord(r.body) ? r.body.$form : undefined;
		if (!isRecord(form)) return r;
		const text: Record<string, string> = {};
		for (const [key, value] of Object.entries(form)) {
			if (value !== undefined)
				text[key] = value === null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
		}
		const { 'content-type': _type, ...headers } = r.headers;
		return { ...r, headers, body: { $form: text } };
	});
	const requestPair = withoutRandomValues(
		requestsOf(out),
		sentPlain,
		others.map(requestsOf),
		compiled.randoms,
	);
	const requests = Array.isArray(requestPair.mine) ? requestPair.mine : [];
	const expected = Array.isArray(requestPair.theirs) ? requestPair.theirs : [];
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
		if (v1.error !== undefined) return `the v1 run fails: ${v1.error.slice(0, 90)}`;
		if (out.status !== 'ok')
			return `the compiled node fails: ${JSON.stringify(out.result).slice(0, 120)}`;
		const theirs = v1.outputs ?? [];
		if (theirs.length > (mode === 'continueErrorOutput' ? 2 : 1))
			return 'the v1 node has more than one output';
		const mine: unknown[] = Array.isArray(out.result) ? out.result : [];
		for (let k = 0; k < mine.length; k++) {
			const expected = JSON.stringify(comparableOutput(theirs[k] ?? []));
			const given = JSON.stringify(comparableOutput(mine[k]));
			if (given !== expected)
				return `output ${k} differs: ${given.slice(0, 70)} / ${expected.slice(0, 70)}`;
		}
		const pairing = errorPairingOfV1(v1);
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
	if (options.paired === true) {
		const mine = isRecord(out.result) ? out.result : {};
		const items = withoutRandomValues(
			mine.items,
			v1.outputs?.[0] ?? [],
			others.map((other) => (isRecord(other.result) ? other.result.items : undefined)),
			compiled.randoms,
		);
		if (
			JSON.stringify(comparableOutput(items.mine)) !==
			JSON.stringify(comparableOutput(items.theirs))
		)
			return 'the output differs from the run data of the engine';
		const lineage = JSON.stringify(mine.lineage);
		const expected = JSON.stringify(lineageOfV1(v1.paired?.[0] ?? []));
		return lineage === expected
			? undefined
			: `the paired items differ: ${lineage.slice(0, 60)} / ${expected.slice(0, 60)}`;
	}
	const results = withoutRandomValues(
		out.result,
		v1.output,
		others.map((other) => other.result),
		compiled.randoms,
	);
	return JSON.stringify(comparableOutput(results.mine)) ===
		JSON.stringify(comparableOutput(results.theirs))
		? undefined
		: 'the output differs';
}

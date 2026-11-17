import { spawn } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import {
	existsSync,
	linkSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashOfFile, NO_FILE } from '../src/nodes/__tests__/build-identity.ts';
import type { KeyInputs, Progress } from '../src/node-compile/__tests__/verify-cache.ts';
import {
	CaseStore,
	CLASS_READ,
	findResult,
	mergedList,
	nodeKeys,
	nodeTextOfProcess,
	pruneCache,
	readName,
	readNow,
	sharedParts,
	storeResult,
	subsetKey,
	writeStatus,
} from '../src/node-compile/__tests__/verify-cache.ts';

import { publicCredential } from '../src/credentials/public.ts';
import { loadCredentialTypes, registryOf } from '../src/credentials/types.ts';
import type { ContinueForm, ErrorPairing } from '../src/node-compile/__tests__/verify.ts';
import type { CaseCost } from '../src/node-compile/__tests__/verify.ts';
import {
	compileForCheck,
	credentialAsGiven,
	costOfCase,
	differenceFromV1,
	flagKeyOf,
	flagVariants,
	FAILING_VALUE,
	itemFailureExpression,
	itemFieldExpression,
	MINTED_TOKEN_RESPONSE,
} from '../src/node-compile/__tests__/verify.ts';
import { ACCEPTED_COST_RISES } from '../src/node-compile/cost-accepted.ts';
import { COST } from '../src/node-compile/cost.generated.ts';
import { VERIFIED } from '../src/node-compile/verified.generated.ts';
import type { ErrorMode, NodeSources } from '../src/node-compile/convert.ts';
import { evaluateInSandbox } from '../src/node-compile/evaluate-node.ts';
import type { Variant } from '../src/node-compile/variants.ts';
import { parameterVariants, withVariant } from '../src/node-compile/variants.ts';
import type { Json, WalkNode, WalkProperty as Property } from '../src/node-compile/walk.ts';
import {
	credentialOf,
	fakeCredentialData,
	operationsOf,
	requiredParameters,
	resolveParameters,
} from '../src/node-compile/walk.ts';
import {
	CONTINUE_MODES,
	CALL_FOR_EACH_ITEM,
	ERROR_ITEMS_BY_POSITION,
	ITEM_ERROR,
	ITEM_PARAMETER_PREFIX,
	PAIRED_ITEMS,
	itemErrorCondition,
	evaluatedCondition,
	evaluatedParameterNames,
	errorModeCondition,
	itemParameterCondition,
	oneCallCondition,
	authenticationCondition,
	verifiedKey,
} from '../src/node-compile/convert.ts';
import type { EquivalenceCase, NodeSettings } from '../src/nodes/__tests__/equivalence.ts';
import {
	disposeRecorder,
	FALLBACK_HOST_DIR,
	NODE_PACKAGES,
	recordV1,
	recordV1Cached,
	recorderAvailable,
	START_TYPE,
} from '../src/nodes/__tests__/v1-recorder.ts';

interface LoadedNode extends WalkNode {
	nodeVersions?: Record<string, LoadedNode>;
	constructor: { name: string };
}

const here = dirname(fileURLToPath(import.meta.url));
const base = join(here, '../../../nodes-base');
const PREFIX = 'n8n-nodes-base.';
const load = createRequire(join(base, 'package.json'));

const ACCEPT_RISE = '--accept-cost-rise';
const VALUE_FLAGS = ['--one', '--weights', '--status', '--case-store', '--part', ACCEPT_RISE];
const args = process.argv.slice(2);
const valueOf = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const DIST = args.includes('--dist');
const DETAIL = args.includes('--detail');
const CACHE = !args.includes('--no-cache');
const ALL_BLOCKERS = args.includes('--all-blockers');
const SHOW_COST = args.includes('--cost');
const CHECK_COST = args.includes('--check-cost');
const acceptedRises = new Set(args.filter((_arg, at) => at > 0 && args[at - 1] === ACCEPT_RISE));
const WRITE = args.includes('--write');
const one = valueOf('--one');
const weightsFile = valueOf('--weights');
const caseStoreFile = valueOf('--case-store');
const [PART, PARTS] = (valueOf('--part') ?? '0/1').split('/').map(Number);
const inPart = (at: number, total: number) => Math.floor((at * PARTS) / total) === PART;
const pattern = args.find((a, at) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[at - 1]));
const add = (into: Record<string, number>, from: Record<string, number> | undefined) => {
	for (const [key, count] of Object.entries(from ?? {})) into[key] = (into[key] ?? 0) + count;
};
const WHOLE = one === undefined && pattern === undefined && !DIST;
const WRITES = !DIST && one === undefined && (WHOLE || WRITE);
const MEASURE_COST = SHOW_COST || CHECK_COST || WHOLE || WRITE;
const filter = new RegExp(pattern ?? '.', 'i');
const PARALLEL = Number(process.env.VERIFY_PARALLEL) || 6;
const NODE_TIMEOUT_MS = Number(process.env.VERIFY_NODE_TIMEOUT_MS) || 2_700_000;
const CACHE_DIR = join(here, '../node_modules/.cache/verify-results');
const RESULTS_DIR = join(CACHE_DIR, 'nodes');
const CASES_DIR = join(CACHE_DIR, 'cases');
const statusFile = valueOf('--status') ?? join(CACHE_DIR, 'status.json');
const MAX_RESULT_FILES = 2000;
const MAX_CASE_FILES = 3000;
const SAVE_CASES_EVERY_MS = 120_000;
const TRANSIENT = /no result after \d+ ms/;
const MAX_SOURCE_TEXTS = 20_000;
const STALE_EXIT_CODE = 2;
const OPERATIONS_OF_A_PART = Number(process.env.VERIFY_PART_OPERATIONS) || 40;
const UPLOAD_ANSWER = {
	upload_url: 'https://files.example.com/upload/v1/abc',
	file_id: 'F1',
	file: { id: 'F1' },
	files: [{ id: 'F1' }],
};
const FILE_ITEMS = [
	{
		$binary: {
			data: {
				data: Buffer.from('hello bytes').toString('base64'),
				mimeType: 'text/plain',
				fileName: 'notes/hello.txt',
				fileExtension: 'txt',
				fileSize: '11 B',
				bytes: 11,
			},
		},
	},
];
const DOWNLOAD_ANSWER = {
	headers: { 'content-type': 'application/pdf' },
	body: {
		ok: true,
		id: 'r1',
		name: 'reports/summary.pdf',
		result: { id: 'r1', file_path: 'documents/file_7.pdf' },
		data: [{ id: 'r1' }],
	},
};
const DOWNLOAD_ANSWER_TYPED = {
	headers: { 'content-type': 'image/png; charset=binary' },
	body: {
		ok: true,
		id: 'r1',
		name: 'summary',
		result: { id: 'r1', file_path: 'photos/file_8.jpg' },
		data: [{ id: 'r1' }],
	},
};
const MAX_BLOCKERS = 20;
const MAX_EXPRESSIONS_ALONE = 4;

if (!recorderAvailable() || !existsSync(join(base, 'dist/known/nodes.json'))) {
	console.error('Build n8n-nodes-base and @n8n/workflow-fallback-host first.');
	process.exit(1);
}

const classFile = new Map<string, string>();
function findClasses(dir: string): void {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			if (!/^(test|__tests__|__schema__)$/.test(entry)) findClasses(path);
		} else if (entry.endsWith(DIST ? '.node.js' : '.node.ts')) {
			for (const m of readFileSync(path, 'utf8').matchAll(/^(?:export )?class (\w+)/gm))
				classFile.set(m[1], path);
		}
	}
}
findClasses(join(base, DIST ? 'dist/nodes' : 'nodes'));

const known: Record<string, { className: string; sourcePath: string }> = JSON.parse(
	readFileSync(join(base, 'dist/known/nodes.json'), 'utf8'),
);
const knownCredentials: Record<string, { className: string; sourcePath: string }> = JSON.parse(
	readFileSync(join(base, 'dist/known/credentials.json'), 'utf8'),
);
const loaded = new Map<string, LoadedNode | undefined>();
function nodeOf(type: string, version: number): LoadedNode | undefined {
	const key = `${type}@${version}`;
	if (loaded.has(key)) return loaded.get(key);
	let node: LoadedNode | undefined;
	try {
		const entry = known[type.slice(PREFIX.length)];
		const top: LoadedNode = new (load(join(base, entry.sourcePath))[entry.className])();
		node = top.nodeVersions ? top.nodeVersions[String(version)] : top;
	} catch {
		node = undefined;
	}
	loaded.set(key, node);
	return node;
}

const repoDir = join(here, '../../../..');
const reads: Record<string, string> = {};
const sourceTexts = new Map<string, string | undefined>();
const caseStore = caseStoreFile === undefined || !CACHE ? undefined : new CaseStore(caseStoreFile);
const sources: NodeSources = {
	entry: (type, version) => {
		const node = nodeOf(type, version);
		if (!node) return undefined;
		const file = classFile.get(node.constructor.name);
		reads[`${CLASS_READ}${node.constructor.name}`] = readNow(
			repoDir,
			(name) => classFile.get(name),
			`${CLASS_READ}${node.constructor.name}`,
		);
		return file;
	},
	readFile: (path) => {
		if (sourceTexts.has(path)) return sourceTexts.get(path);
		const text =
			existsSync(path) && statSync(path).isFile() ? readFileSync(path, 'utf8') : undefined;
		reads[readName(repoDir, path)] = text === undefined ? NO_FILE : hashOfFile(path);
		if (sourceTexts.size >= MAX_SOURCE_TEXTS) sourceTexts.clear();
		sourceTexts.set(path, text);
		return text;
	},
	...(caseStore === undefined
		? {}
		: {
				subsetChecks: {
					get: (type, version, source) => {
						const kept = caseStore.get(subsetKey(type, version, source));
						return Array.isArray(kept) && kept.every((error) => typeof error === 'string')
							? kept
							: undefined;
					},
					set: (type, version, source, errors) =>
						caseStore.set(subsetKey(type, version, source), errors),
				},
			}),
	description: (type, version) => nodeOf(type, version)?.description,
	aliases: { '@utils/': `${base}/utils/` },
	evaluate: evaluateInSandbox,
	credentialEntry: (type) => {
		const entry = knownCredentials[type];
		return entry ? join(base, entry.sourcePath) : undefined;
	},
};

const registry = registryOf(loadCredentialTypes().types);

function isJson(value: unknown): value is Json {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readWeights(file: string | undefined): Map<string, number> {
	const out = new Map<string, number>();
	if (file === undefined) return out;
	const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
	if (!isJson(parsed)) throw new Error(`The weights file ${file} must hold a JSON object.`);
	for (const [key, count] of Object.entries(parsed)) {
		if (typeof count === 'number' && Number.isFinite(count)) out.set(key, count);
	}
	return out;
}
const weights = readWeights(weightsFile);

function operationOf(type: string, parameters: Json): string {
	return `${type}:${String(parameters.resource ?? '')}.${String(parameters.operation ?? '')}`;
}

function weightOf(operation: string): number {
	return weights.get(operation) ?? weights.get(operation.slice(PREFIX.length)) ?? 0;
}

const SIGNING_KEY_FILE = join(here, '../node_modules/.cache/v1-recordings/test-signing-key.pem');
let signingKey: string | undefined;
function testSigningKey(): string {
	if (signingKey !== undefined) return signingKey;
	if (!existsSync(SIGNING_KEY_FILE)) {
		mkdirSync(dirname(SIGNING_KEY_FILE), { recursive: true });
		const { privateKey } = generateKeyPairSync('rsa', {
			modulusLength: 2048,
			privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
			publicKeyEncoding: { type: 'spki', format: 'pem' },
		});
		const partial = `${SIGNING_KEY_FILE}.${process.pid}.tmp`;
		writeFileSync(partial, privateKey, { mode: 0o600 });
		try {
			linkSync(partial, SIGNING_KEY_FILE);
		} catch {
			if (!existsSync(SIGNING_KEY_FILE)) throw new Error('The test signing key has no file.');
		} finally {
			rmSync(partial, { force: true });
		}
	}
	signingKey = readFileSync(SIGNING_KEY_FILE, 'utf8');
	return signingKey;
}

const MAX_AUTHENTICATIONS = 4;
function otherAuthentications(node: LoadedNode, version: number, start: Json): Json[] {
	const properties = node.description.properties as unknown as Property[];
	const usual = credentialOf(node, resolve(node, version, required(node, version, start)));
	const out: Json[] = [];
	const seen = new Set<unknown>();
	for (const property of properties) {
		if (property.name !== 'authentication' || property.type !== 'options') continue;
		for (const { value } of property.options ?? []) {
			if (typeof value !== 'string' || seen.has(value) || out.length >= MAX_AUTHENTICATIONS)
				continue;
			seen.add(value);
			const other = { ...start, authentication: value };
			const resolved = resolve(node, version, required(node, version, other));
			if (resolved.authentication !== value) continue;
			const credential = credentialOf(node, resolved);
			if (credential !== undefined && credential !== usual) out.push(other);
		}
	}
	return out;
}

const fakeCredential = (type: string): Json => fakeCredentialData(registry, type, testSigningKey);
const resolve = resolveParameters;
const required = requiredParameters;
const operations = operationsOf;

function withOptions(node: LoadedNode, version: number, start: Json): Json {
	const properties = node.description.properties as unknown as Property[];
	const out: Json = { ...start };
	for (const name of Object.keys(resolve(node, version, start))) {
		const property = properties.find((p) => p.name === name && p.type === 'collection');
		if (!property || name in out) continue;
		const members: Json = {};
		for (const option of (property.options ?? []).slice(0, 8)) {
			if (!option.name) continue;
			if (option.type === 'string') members[option.name] = 'v2';
			else if (option.type === 'number')
				members[option.name] = typeof option.default === 'number' ? option.default + 1 : 1;
			else if (option.type === 'boolean') members[option.name] = option.default !== true;
		}
		if (Object.keys(members).length > 0) out[name] = members;
	}
	return out;
}

interface ExpressionForm {
	name: string;
	value: unknown;
	fields: Record<string, unknown[]>;
}

function expressionForms(parameters: Json, fixed: Json): ExpressionForm[] {
	const forms: ExpressionForm[] = [];
	const fieldOf = (name: string) => name.replace(/\W/g, '_');
	const texts = (text: string) => [text, `${text}b`, `${text}c`];
	for (const [name, value] of Object.entries(parameters)) {
		if (name in fixed) continue;
		const field = fieldOf(name);
		if (typeof value === 'string' && value !== '' && value !== '{}' && !value.startsWith('=')) {
			forms.push({ name, value: itemFieldExpression(field), fields: { [field]: texts(value) } });
		} else if (typeof value === 'number') {
			forms.push({
				name,
				value: itemFieldExpression(field),
				fields: { [field]: [value, value + 1, value + 2] },
			});
		} else if (isJson(value) && value.__rl === true && typeof value.value === 'string') {
			forms.push({
				name,
				value: { ...value, value: itemFieldExpression(field) },
				fields: { [field]: texts(value.value) },
			});
		} else if (isJson(value)) {
			const members: Json = {};
			const fields: Record<string, unknown[]> = {};
			for (const [key, member] of Object.entries(value)) {
				const inner = fieldOf(`${name}_${key}`);
				if (typeof member === 'string' && member !== '' && !member.startsWith('=')) {
					members[key] = itemFieldExpression(inner);
					fields[inner] = texts(member);
				} else if (typeof member === 'number') {
					members[key] = itemFieldExpression(inner);
					fields[inner] = [member, member + 1, member + 2];
				} else members[key] = member;
			}
			if (Object.keys(fields).length > 0) forms.push({ name, value: members, fields });
		}
	}
	return forms;
}

const QUERY_JOB = { jobId: 'job1', location: 'EU' };
const QUERY_ROWS = {
	jobComplete: true,
	schema: {
		fields: [
			{ name: 'id', type: 'INTEGER', mode: 'NULLABLE' },
			{ name: 'tags', type: 'STRING', mode: 'REPEATED' },
			{ name: 'at', type: 'TIMESTAMP', mode: 'NULLABLE' },
			{ name: 'meta', type: 'JSON', mode: 'NULLABLE' },
			{
				name: 'owner',
				type: 'RECORD',
				mode: 'NULLABLE',
				fields: [{ name: 'name', type: 'STRING', mode: 'NULLABLE' }],
			},
		],
	},
	rows: [
		{
			f: [
				{ v: '1' },
				{ v: [{ v: 'a' }, { v: 'b' }] },
				{ v: '1705339800.5' },
				{ v: '{"k":1}' },
				{ v: { f: [{ v: 'Ada' }] } },
			],
		},
		{
			f: [
				{ v: '2' },
				{ v: [] },
				{ v: 'not a time' },
				{ v: 'not json' },
				{ v: { f: [{ v: null }] } },
			],
		},
	],
};
const QUERY_DONE = { jobReference: QUERY_JOB, status: { state: 'DONE' } };
const QUERY_RUNNING = { jobReference: QUERY_JOB, status: { state: 'RUNNING' } };

interface OperationAnswers {
	ok: Json;
	more: Array<{ label: string; bodies: Json[] }>;
}

const OPERATION_ANSWERS: Record<string, OperationAnswers> = {
	'n8n-nodes-base.googleBigQuery:database.executeQuery': {
		ok: { ...QUERY_DONE, ...QUERY_ROWS },
		more: [
			{
				label: 'the job is not done',
				bodies: [QUERY_RUNNING, { jobComplete: false }, { jobComplete: false }, QUERY_ROWS],
			},
			{
				label: 'the result has two pages',
				bodies: [QUERY_DONE, { ...QUERY_ROWS, pageToken: 'page2' }, QUERY_ROWS],
			},
			{
				label: 'the job that is not done has errors',
				bodies: [QUERY_RUNNING, { jobComplete: false, errors: [{ message: 'the query failed' }] }],
			},
			{ label: 'no job', bodies: [{ status: { state: 'DONE' } }] },
		],
	},
};

const EVALUATED_VALUES: unknown[][] = [
	['one', 7, 'a$&b'],
	[['p', 'q'], { k: 1 }, null],
];

function evaluatedForms(parameters: Json, fixed: Json): ExpressionForm[] {
	const forms: ExpressionForm[] = [];
	for (const [name, value] of Object.entries(parameters)) {
		if (name in fixed || typeof value !== 'string' || value.startsWith('=')) continue;
		const fields = EVALUATED_VALUES.map((_, k) => `${name.replace(/\W/g, '_')}_part${k}`);
		forms.push({
			name,
			value: [value, ...fields.map((field) => itemFieldExpression(field).slice(1))].join(' '),
			fields: Object.fromEntries(fields.map((field, k) => [field, EVALUATED_VALUES[k]])),
		});
	}
	return forms;
}

function failingEvaluatedForm(form: ExpressionForm, at: number): ExpressionForm {
	const field = `${form.name.replace(/\W/g, '_')}_failing`;
	return {
		name: form.name,
		value: `${String(form.value)} ${itemFailureExpression(field).slice(1)}`,
		fields: {
			...form.fields,
			[field]: [0, 1, 2].map((k) => (k === at ? FAILING_VALUE : `ok${k}`)),
		},
	};
}

const MAX_WIDER_FORMS = 6;
const MAX_VARIANT_FORMS_ALONE = 6;
const NOT_AN_EXPRESSION = new Set(['resource', 'operation', 'authentication']);

function widerExpressionForms(
	node: LoadedNode,
	version: number,
	parameters: Json,
	fixed: Json,
): ExpressionForm[] {
	const properties = node.description.properties as unknown as Property[];
	const forms: ExpressionForm[] = [];
	const fieldOf = (name: string) => name.replace(/\W/g, '_');
	for (const [name, value] of Object.entries(resolve(node, version, parameters))) {
		if (name in fixed || NOT_AN_EXPRESSION.has(name) || forms.length >= MAX_WIDER_FORMS) continue;
		const types = new Set(properties.filter((p) => p.name === name).map((p) => p.type));
		if (types.size !== 1) continue;
		const field = fieldOf(name);
		const form = (values: unknown[]) =>
			forms.push({ name, value: itemFieldExpression(field), fields: { [field]: values } });
		if (types.has('boolean') && typeof value === 'boolean') form([value, !value, value]);
		else if (types.has('json') && (value === '{}' || value === ''))
			form(['{"a":1}', '{"a":2,"b":"c"}', '{}']);
		else if (types.has('options') && typeof value === 'string' && !(name in parameters)) {
			const choices = [
				...new Set(
					properties
						.filter((p) => p.name === name)
						.flatMap((p) => p.options ?? [])
						.map((o) => o.value)
						.filter((v): v is string => typeof v === 'string' && v !== value),
				),
			];
			if (choices.length > 0) form([value, choices[0], choices[1] ?? value]);
		}
	}
	return forms;
}

const checking = { cache: CACHE, memo: caseStore };
const blocked: Array<{ operation: string; reasons: string[] }> = [];
const differences: Array<{ operation: string; reason: string }> = [];
const modeDifferences: Array<[ErrorMode, string]> = [];
const writes: Array<[key: string, other: boolean, conditions: string[]]> = [];
let transient = false;
const verified: Record<string, string[]> = {};
const reasons: Record<string, number> = {};
const modeReasons: Record<string, number> = {};
const manyItems: Record<string, number> = {};
const manyItemReasons: Record<string, number> = {};
const threeItemCost = { operations: 0, once: 0, each: 0 };
const expressionCost: Record<string, number> = {};
const continueCost: Record<string, number> = {};
const pairedReasons: Record<string, number> = {};
const failureReasons: Record<string, number> = {};
const widerReasons: Record<string, number> = {};
const aloneReasons: Record<string, number> = {};
const expressions: Record<string, number> = {};
const expressionReasons: Record<string, number> = {};
const alone: Record<string, number> = {};
const weighted: Record<string, number> = {};
let tried = 0;
let compiledCount = 0;
let mintedTried = 0;
let mintedVerified = 0;
const examples: string[] = [];
const costs: Record<string, CaseCost> = {};

interface NodeResult {
	verified: Record<string, string[]>;
	blocked: Array<{ operation: string; reasons: string[] }>;
	differences: Array<{ operation: string; reason: string }>;
	modeDifferences: Array<[ErrorMode, string]>;
	writes: Array<[key: string, other: boolean, conditions: string[]]>;
	reads: Record<string, string>;
	transient: boolean;
	manyItems?: Record<string, number>;
	manyItemReasons?: Record<string, number>;
	threeItemCost?: { operations: number; once: number; each: number };
	expressionCost?: Record<string, number>;
	continueCost?: Record<string, number>;
	pairedReasons?: Record<string, number>;
	failureReasons?: Record<string, number>;
	widerReasons?: Record<string, number>;
	aloneReasons?: Record<string, number>;
	expressions?: Record<string, number>;
	expressionReasons?: Record<string, number>;
	tried: number;
	compiled: number;
	examples?: string[];
	mintedTried?: number;
	mintedVerified?: number;
	costs?: Record<string, CaseCost>;
}

const requestPart = (reason: string) => /^v1: the requests differ: (\w+)/.exec(reason)?.[1];
const keyOf = (reason: string) => {
	if (DETAIL) return reason.slice(0, 110);
	const part = requestPart(reason);
	return part === undefined
		? reason.replace(/'[^']*'/g, "'…'").slice(0, 90)
		: `v1: the requests differ: ${part}`;
};
const operationsOfNode = (name: string): number => {
	let count = 0;
	try {
		const top: LoadedNode = new (load(join(base, known[name].sourcePath))[known[name].className])();
		const versions = top.nodeVersions
			? Object.keys(top.nodeVersions).map(Number)
			: [top.description.version].flat();
		for (const version of versions) {
			const node = nodeOf(`${PREFIX}${name}`, version);
			if (node && sources.entry(`${PREFIX}${name}`, version) !== undefined)
				count += operations(node).length;
		}
	} catch {
		return 0;
	}
	return count;
};
function isNodeResult(value: unknown): value is NodeResult {
	return (
		isJson(value) &&
		isJson(value.verified) &&
		isJson(value.reads) &&
		Array.isArray(value.blocked) &&
		Array.isArray(value.differences) &&
		Array.isArray(value.modeDifferences) &&
		Array.isArray(value.writes) &&
		typeof value.transient === 'boolean' &&
		typeof value.tried === 'number' &&
		typeof value.compiled === 'number'
	);
}

const MAX_ERROR_TAIL = 2000;

async function checkInProcess(
	name: string,
	storeFile: string | undefined,
	part: string | undefined,
	at: (operations: string) => void,
): Promise<NodeResult | string> {
	return await new Promise((resolve) => {
		const child = spawn(
			process.execPath,
			[
				fileURLToPath(import.meta.url),
				...(DIST ? ['--dist'] : []),
				...(CACHE ? [] : ['--no-cache']),
				...(storeFile === undefined ? [] : ['--case-store', storeFile]),
				...(part === undefined ? [] : ['--part', part]),
				'--cost',
				'--one',
				name,
			],
			{
				stdio: ['ignore', 'pipe', 'pipe'],
			},
		);
		let pending = '';
		let found: string | undefined;
		let errors = '';
		let late = false;
		child.stdout.on('data', (chunk: Buffer) => {
			pending += chunk.toString();
			for (let end = pending.indexOf('\n'); end >= 0; end = pending.indexOf('\n')) {
				const line = pending.slice(0, end);
				pending = pending.slice(end + 1);
				if (line.startsWith('RESULT ')) found = line.slice('RESULT '.length);
				const progress = /^AT (\d+) (\d+)$/.exec(line);
				if (progress) at(`${progress[1]}/${progress[2]}`);
			}
		});
		child.stderr.on('data', (chunk: Buffer) => {
			errors = (errors + chunk.toString()).slice(-MAX_ERROR_TAIL);
		});

		const timer = setTimeout(() => {
			late = true;
			child.kill('SIGKILL');
		}, NODE_TIMEOUT_MS);
		child.on('close', (code) => {
			clearTimeout(timer);
			if (late) {
				resolve(`no result in the time limit of ${Math.round(NODE_TIMEOUT_MS / 1000)} s`);
				return;
			}
			let parsed: unknown;
			try {
				parsed = found === undefined ? undefined : JSON.parse(found);
			} catch {
				parsed = undefined;
			}
			if (isNodeResult(parsed)) {
				resolve(parsed);
				return;
			}
			const last = errors.trim().split('\n').at(-1) ?? '';
			resolve(`the check stopped with no result (exit code ${code}): ${last.slice(0, 200)}`);
		});
	});
}

const nodeOfKey = (key: string) => key.slice(PREFIX.length, key.indexOf('@'));
const COST_EXAMPLE = / ops in one call; \d+ ops in a call for each item$/;
const STATUS_EVERY_MS = 15_000;
const MAX_LOST_SHOWN = 60;
const stale: Array<{ name: string; why: string; kept: number }> = [];
const checkedNames: string[] = [];
const lostKeys: string[] = [];

const countReason = (reason: string, weight: number, only: boolean) => {
	const key = keyOf(reason);
	reasons[key] = (reasons[key] ?? 0) + 1;
	if (only) alone[key] = (alone[key] ?? 0) + 1;
	if (weight !== 0) weighted[key] = (weighted[key] ?? 0) + weight;
};

function withWrite(existing: string[] | undefined, other: boolean, stated: string[]): string[] {
	return [...new Set(other ? [...(existing ?? []), ...stated] : stated)].sort();
}

function joinedResult(parts: NodeResult[]): NodeResult {
	const [first] = parts;
	if (parts.length === 1) return { ...first, writes: [] };
	const sum = (pick: (part: NodeResult) => Record<string, number> | undefined) => {
		const out: Record<string, number> = {};
		for (const part of parts) add(out, pick(part));
		return out;
	};
	const total = (pick: (part: NodeResult) => number | undefined) =>
		parts.reduce((all, part) => all + (pick(part) ?? 0), 0);
	const verifiedOf: Record<string, string[]> = {};
	const costsOf: Record<string, CaseCost> = {};
	const readsOf: Record<string, string> = {};
	for (const part of parts) {
		for (const [key, other, stated] of part.writes)
			verifiedOf[key] = withWrite(verifiedOf[key], other, stated);
		Object.assign(costsOf, part.costs);
		Object.assign(readsOf, part.reads);
	}
	return {
		verified: verifiedOf,
		blocked: parts.flatMap((part) => part.blocked),
		differences: parts.flatMap((part) => part.differences),
		modeDifferences: parts.flatMap((part) => part.modeDifferences),
		writes: [],
		reads: readsOf,
		transient: parts.some((part) => part.transient),
		manyItems: sum((part) => part.manyItems),
		manyItemReasons: sum((part) => part.manyItemReasons),
		threeItemCost: {
			operations: total((part) => part.threeItemCost?.operations),
			once: total((part) => part.threeItemCost?.once),
			each: total((part) => part.threeItemCost?.each),
		},
		expressionCost: sum((part) => part.expressionCost),
		continueCost: sum((part) => part.continueCost),
		pairedReasons: sum((part) => part.pairedReasons),
		failureReasons: sum((part) => part.failureReasons),
		widerReasons: sum((part) => part.widerReasons),
		aloneReasons: sum((part) => part.aloneReasons),
		expressions: sum((part) => part.expressions),
		expressionReasons: sum((part) => part.expressionReasons),
		tried: total((part) => part.tried),
		compiled: total((part) => part.compiled),
		examples: parts.flatMap((part) => part.examples ?? []).slice(0, 400),
		mintedTried: total((part) => part.mintedTried),
		mintedVerified: total((part) => part.mintedVerified),
		costs: costsOf,
	};
}

function mergeResult(name: string, result: NodeResult): void {
	Object.assign(verified, result.verified);
	for (const { operation, reasons: all } of result.blocked) {
		const blockers = new Map<string, string>();
		for (const reason of all.slice(0, ALL_BLOCKERS ? MAX_BLOCKERS : 1)) {
			if (!blockers.has(keyOf(reason))) blockers.set(keyOf(reason), reason);
		}
		for (const reason of blockers.values())
			countReason(reason, weightOf(operation), blockers.size === 1);
	}
	for (const { operation, reason } of result.differences)
		countReason(reason, weightOf(operation), true);
	for (const [mode, reason] of result.modeDifferences) {
		const key = `${mode}: ${DETAIL ? reason.slice(0, 110) : reason.replace(/'[^']*'/g, "'…'").slice(0, 90)}`;
		modeReasons[key] = (modeReasons[key] ?? 0) + 1;
	}
	if (MEASURE_COST) {
		Object.assign(costs, result.costs);
		add(threeItemCost, result.threeItemCost);
		add(expressionCost, result.expressionCost);
		add(continueCost, result.continueCost);
	}
	add(manyItems, result.manyItems);
	add(manyItemReasons, result.manyItemReasons);
	add(pairedReasons, result.pairedReasons);
	add(failureReasons, result.failureReasons);
	add(widerReasons, result.widerReasons);
	add(aloneReasons, result.aloneReasons);
	add(expressions, result.expressions);
	add(expressionReasons, result.expressionReasons);
	for (const example of result.examples ?? []) {
		if (!MEASURE_COST && COST_EXAMPLE.test(example)) continue;
		if (examples.length < 400) examples.push(`${name}: ${example}`);
	}
	tried += result.tried;
	compiledCount += result.compiled;
	mintedTried += result.mintedTried ?? 0;
	mintedVerified += result.mintedVerified ?? 0;
}

if (one === undefined) {
	const names = Object.keys(known)
		.sort()
		.filter((name) => filter.test(name) && !/Trigger$/.test(name));
	checkedNames.push(...names);
	testSigningKey();
	const inputs: KeyInputs = {
		packageDir: join(here, '..'),
		repoDir,
		script: fileURLToPath(import.meta.url),
		converter: join(here, '../src/node-compile/convert.ts'),
		hostDir: FALLBACK_HOST_DIR,
		nodePackages: NODE_PACKAGES,
		nodePrefix: PREFIX,
		alwaysTypes: [START_TYPE],
		credentialPackages: Object.values(NODE_PACKAGES),
		signingKey: SIGNING_KEY_FILE,
		dist: DIST,
		environment: process.env,
		nodeText: nodeTextOfProcess(),
	};
	const shared = CACHE ? sharedParts(inputs) : undefined;
	if (CACHE) {
		pruneCache(RESULTS_DIR, MAX_RESULT_FILES);
		pruneCache(CASES_DIR, MAX_CASE_FILES);
	}
	const committed = new Map<string, string[]>();
	for (const key of Object.keys(VERIFIED))
		committed.set(nodeOfKey(key), [...(committed.get(nodeOfKey(key)) ?? []), key]);
	const results = new Map<string, NodeResult>();
	const running = new Map<string, { since: number; operations: string }>();
	const started = new Date();
	const totals = { done: 0, fromCache: 0, ran: 0, operations: 0, verified: 0 };
	const status = (finished = false) => {
		const progress: Progress = {
			pid: process.pid,
			started: started.toISOString(),
			updated: new Date().toISOString(),
			finished,
			nodeTypes: names.length,
			done: totals.done,
			fromCache: totals.fromCache,
			ran: totals.ran,
			operations: totals.operations,
			verified: totals.verified,
			lost: lostKeys.length,
			stale: stale.map((entry) => entry.name),
			running: [...running].map(([name, state]) => ({
				name,
				seconds: Math.round((Date.now() - state.since) / 1000),
				operations: state.operations,
			})),
		};
		writeStatus(statusFile, progress);
	};
	const say = (text: string) => process.stderr.write(`${text}\n`);
	const finish = (name: string, result: NodeResult, how: string) => {
		results.set(name, result);
		const lost = (committed.get(name) ?? []).filter((key) => !(key in result.verified));
		lostKeys.push(...lost);
		totals.done++;
		totals.operations += result.tried;
		totals.verified += Object.keys(result.verified).length;
		say(
			`[${totals.done}/${names.length}] end ${name}: operations ${result.tried}; verified ${Object.keys(result.verified).length}; lost ${lost.length} against the committed list; ${how}; total: operations ${totals.operations}; verified ${totals.verified}; lost ${lostKeys.length}`,
		);
		status();
	};
	const keysOf = new Map<string, { result: string; cases: string }>();
	const queue: Array<{ name: string; part: number; parts: number; operations: number }> = [];
	const wholes = new Map<
		string,
		{ since: number; left: number; results: Array<NodeResult | string | undefined> }
	>();
	const isClassFile = (name: string) => classFile.get(name);
	const split = (name: string) => {
		const count = operationsOfNode(name);
		const parts = Math.min(PARALLEL, Math.max(1, Math.ceil(count / OPERATIONS_OF_A_PART)));
		for (let part = 0; part < parts; part++)
			queue.push({ name, part, parts, operations: count / parts });
		wholes.set(name, {
			since: 0,
			left: parts,
			results: Array.from({ length: parts }, () => undefined),
		});
	};
	for (const name of names) {
		if (shared === undefined) {
			split(name);
			continue;
		}
		const keys = nodeKeys(inputs, name, shared);
		keysOf.set(name, keys);
		const kept = findResult(RESULTS_DIR, name, keys.result, (read) =>
			readNow(repoDir, isClassFile, read),
		);
		if (kept !== undefined && isNodeResult(kept.result)) {
			totals.fromCache++;
			finish(name, kept.result, `cache hit (the run took ${kept.seconds} s)`);
			continue;
		}
		split(name);
	}
	queue.sort((a, b) => b.operations - a.operations);
	const worker = async () => {
		for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
			const { name, part, parts } = next;
			const whole = wholes.get(name);
			if (whole === undefined) continue;
			const label = parts === 1 ? name : `${name} (part ${part + 1} of ${parts})`;
			const state = { since: Date.now(), operations: '' };
			if (whole.since === 0) whole.since = state.since;
			running.set(label, state);
			say(`[${totals.done}/${names.length}] start ${label}`);
			status();
			const keys = keysOf.get(name);
			whole.results[part] = await checkInProcess(
				name,
				keys === undefined
					? undefined
					: join(CASES_DIR, `${name}.${keys.cases.slice(0, 16)}.${part}-${parts}.json.gz`),
				parts === 1 ? undefined : `${part}/${parts}`,
				(operations) => {
					state.operations = operations;
				},
			);
			running.delete(label);
			whole.left--;
			if (whole.left > 0) {
				status();
				continue;
			}
			const seconds = Math.round((Date.now() - whole.since) / 1000);
			const done = whole.results.filter(isNodeResult);
			const failed = whole.results.find((result) => typeof result === 'string');
			if (done.length !== parts) {
				const kept = committed.get(name)?.length ?? 0;
				const why = typeof failed === 'string' ? failed : 'a part gave no result';
				stale.push({ name, why, kept });
				totals.done++;
				say(
					`[${totals.done}/${names.length}] STALE ${name}: ${why}; ${seconds} s; ${kept} entries of the committed list stay and are not checked`,
				);
				status();
				continue;
			}
			const result = joinedResult(done);
			totals.ran++;
			if (keys !== undefined && !result.transient)
				storeResult(RESULTS_DIR, name, { key: keys.result, reads: result.reads, result, seconds });
			finish(
				name,
				result,
				`run of ${seconds} s${parts === 1 ? '' : ` in ${parts} parts`}${result.transient ? ', not kept' : ''}`,
			);
		}
	};
	const timer = setInterval(status, STATUS_EVERY_MS);
	await Promise.all(Array.from({ length: PARALLEL }, worker));
	clearInterval(timer);
	status(true);
	for (const name of names) {
		const result = results.get(name);
		if (result !== undefined) mergeResult(name, result);
	}
	say(
		`node types ${names.length}: ${totals.fromCache} from the cache, ${totals.ran} ran, ${stale.length} stale`,
	);
	if (lostKeys.length > 0)
		say(
			`lost against the committed list: ${lostKeys.length} operation(s): ${lostKeys.sort().slice(0, MAX_LOST_SHOWN).join(', ')}`,
		);
	stale.sort((a, b) => (a.name < b.name ? -1 : 1));
	if (stale.length > 0)
		console.log(
			`stale: ${stale.length} node type(s) gave no result; their entries in the committed list stay as they are and are not checked: ${stale.map((entry) => `${entry.name} (${entry.why}; ${entry.kept} entries)`).join('; ')}`,
		);
}

const why = (reason: string, operation: string) => {
	if (requestPart(reason) !== undefined && examples.length < 60)
		examples.push(reason.slice(0, 200));
	differences.push({ operation, reason });
};

const whyMode = (mode: ErrorMode, reason: string) => {
	modeDifferences.push([mode, reason]);
};

let casesSaved = Date.now();
const operationsOfOne = one === undefined || !(one in known) ? 0 : operationsOfNode(one);
const operationsToCheck = Array.from({ length: operationsOfOne }, (_, at) => at).filter((at) =>
	inPart(at, operationsOfOne),
).length;
let operationsSeen = 0;
let operationsChecked = 0;
const reportProgress = () => {
	if (one !== undefined) process.stdout.write(`AT ${operationsChecked} ${operationsToCheck}\n`);
};
reportProgress();

for (const name of one === undefined || !(one in known) ? [] : [one]) {
	if (/Trigger$/.test(name)) continue;
	const type = `${PREFIX}${name}`;
	let top: LoadedNode;
	try {
		top = new (load(join(base, known[name].sourcePath))[known[name].className])();
	} catch {
		continue;
	}
	const versions = top.nodeVersions
		? Object.keys(top.nodeVersions).map(Number)
		: [top.description.version].flat();
	for (const version of versions) {
		for (const { name: credential } of nodeOf(type, version)?.description.credentials ?? [])
			credentialAsGiven(credential, fakeCredential(credential));
	}
	for (const version of versions) {
		const node = nodeOf(type, version);
		if (!node || sources.entry(type, version) === undefined) continue;
		for (const usual of operations(node)) {
			if (!inPart(operationsSeen++, operationsOfOne)) continue;
			operationsChecked++;
			reportProgress();
			if (caseStore !== undefined && Date.now() - casesSaved > SAVE_CASES_EVERY_MS) {
				caseStore.save();
				casesSaved = Date.now();
			}
			for (const start of [usual, ...otherAuthentications(node, version, usual)]) {
				const other = start !== usual;
				if (!other) tried++;
				const parameters = required(node, version, start);
				const credential = credentialOf(node, resolve(node, version, parameters));
				const weight = operationOf(type, parameters);
				const instance = { type, version, parameters };
				const fields = credential
					? {
							[credential]: publicCredential(
								registry.get(credential),
								credentialAsGiven(credential, fakeCredential(credential)),
							),
						}
					: {};
				const compiled = compileForCheck(sources, instance, fields);
				if (other && 'errors' in compiled) continue;
				if (other && !('errors' in compiled) && compiled.mints.length > 0) mintedTried++;
				if ('errors' in compiled) {
					blocked.push({
						operation: weight,
						reasons: compiled.errors
							.slice(0, MAX_BLOCKERS)
							.map((error) => error.slice(error.indexOf(': ') + 2)),
					});
					continue;
				}
				if (!other) compiledCount++;
				const readsFiles = /__(binaryOf|inputBytes)\(__items/.test(compiled.source);
				const token = compiled.mints.length > 0 ? [MINTED_TOKEN_RESPONSE] : [];
				const make = (
					label: string,
					p: Json,
					responses: EquivalenceCase['responses'],
					items: EquivalenceCase['items'] = readsFiles ? FILE_ITEMS : undefined,
					data: Json | undefined = credential ? fakeCredential(credential) : undefined,
				): EquivalenceCase => ({
					name: `${type}@${version} ${label}`,
					type,
					typeVersion: version,
					parameters: p,
					...(items ? { items } : {}),
					...(credential && data ? { credential: { type: credential, data } } : {}),
					responses,
				});
				const makesFiles = compiled.source.includes('__prepareBinary(');
				const answers =
					OPERATION_ANSWERS[
						`${type}:${String(compiled.resolved.resource ?? '')}.${String(compiled.resolved.operation ?? '')}`
					];
				const plain = answers?.ok ?? {
					ok: true,
					id: 'r1',
					result: { id: 'r1' },
					data: [{ id: 'r1' }],
				};
				const ok = makesFiles
					? [...token, DOWNLOAD_ANSWER]
					: [...token, { body: readsFiles ? { ...plain, ...UPLOAD_ANSWER } : plain }];
				const bad = [...token, { status: 400, body: { message: 'bad request' } }];
				const missing = [
					...token,
					{ status: 404, body: { error: { message: 'no such thing' }, code: 7 } },
				];
				try {
					const difference =
						(await differenceFromV1(make('ok', parameters, ok), sources, registry, checking)) ??
						(await differenceFromV1(make('error', parameters, bad), sources, registry, checking));
					if (difference !== undefined) {
						if (!other) why(`v1: ${difference}`, weight);
						else if (examples.length < 400)
							examples.push(
								`${verifiedKey(type, version, compiled.resolved)} with another authentication: ${difference.slice(0, 200)}`,
							);
						continue;
					}
					let shaped: string | undefined;
					for (const { label, bodies } of answers?.more ?? []) {
						const responses = [...token, ...bodies.map((body) => ({ body }))];
						const found = await differenceFromV1(
							make(label, parameters, responses),
							sources,
							registry,
							checking,
						);
						if (found !== undefined) shaped ??= `v1: ${label}: ${found}`;
					}
					if (shaped !== undefined) {
						if (!other) why(shaped, weight);
						continue;
					}
					const first = readsFiles ? FILE_ITEMS[0] : {};
					const several = (count: number) =>
						Array.from({ length: count }, (_, k) => ({ ...first, position: k + 1 }));
					const three = make('three items', parameters, ok, several(3));
					const withThree = await differenceFromV1(three, sources, registry, checking);
					if (withThree !== undefined) {
						if (!other) why(`v1: three items: ${withThree}`, weight);
						continue;
					}
					const eachItem = await differenceFromV1(three, sources, registry, {
						...checking,
						eachItem: true,
					});
					if (eachItem !== undefined) {
						manyItems[type] = (manyItems[type] ?? 0) + 1;
						const reason = `three items, one call for each item: ${eachItem}`;
						manyItemReasons[reason.slice(0, 110)] =
							(manyItemReasons[reason.slice(0, 110)] ?? 0) + 1;
					}
					if (SHOW_COST && !other) {
						const once = costOfCase(three, sources, registry, false, undefined, caseStore);
						const each = costOfCase(three, sources, registry, true, undefined, caseStore);
						if (once && each) {
							threeItemCost.operations++;
							threeItemCost.once += once.ops;
							threeItemCost.each += each.ops;
						}
					}
					if (makesFiles) {
						const unnamed = await differenceFromV1(
							make('file without an extension', parameters, [...token, DOWNLOAD_ANSWER_TYPED]),
							sources,
							registry,
							checking,
						);
						if (unnamed !== undefined) {
							why(`v1: a file without an extension: ${unnamed}`, weight);
							continue;
						}
					}
					if (readsFiles) {
						const withFile = await (CACHE ? recordV1Cached : recordV1)(make('ok', parameters, ok));
						if (withFile.error !== undefined) {
							why(`v1: the case with a file fails: ${withFile.error}`, weight);
							continue;
						}
						const withoutFile = await differenceFromV1(
							make('no file', parameters, ok, [{}]),
							sources,
							registry,
							checking,
						);
						if (withoutFile !== undefined) {
							why(`v1: without a file: ${withoutFile}`, weight);
							continue;
						}
					}
					let names = compiled.changed;

					const more = withOptions(node, version, parameters);
					const wider = compileForCheck(sources, { type, version, parameters: more }, fields);
					if (
						!('errors' in wider) &&
						(await differenceFromV1(make('options', more, ok), sources, registry, checking)) ===
							undefined
					) {
						names = wider.changed;
					}
					const widerAgrees = names !== compiled.changed;
					const settled = parameters;
					const agreesWith = async (label: string, p: Json): Promise<string[] | string> => {
						const c = compileForCheck(sources, { type, version, parameters: p }, fields);
						if ('errors' in c) return `does not compile: ${c.errors[0]}`;
						if (c.mints.length !== compiled.mints.length)
							return 'the tokens of the credential differ';
						if (
							/__(binaryOf|inputBytes)\(__items/.test(c.source) !== readsFiles ||
							c.source.includes('__prepareBinary(') !== makesFiles
						)
							return 'the use of files differs from the usual case';
						const difference = await differenceFromV1(
							make(label, p, ok, several(3)),
							sources,
							registry,
							checking,
						);
						return difference ?? c.changed;
					};
					const variants = parameterVariants(
						node,
						version,
						settled,
						start,
						names,
						itemFieldExpression,
					);
					const agreed: Variant[] = [];
					const added: string[] = [];
					for (const variant of variants) {
						const changed: string[] = [];
						let all = true;
						for (const [at, value] of variant.values.entries()) {
							const found = await agreesWith(
								`alone ${variant.condition} ${at}`,
								required(node, version, withVariant(settled, variant, value)),
							);
							if (typeof found === 'string') {
								all = false;
								if (!other) {
									const text = found.slice(0, 110);
									aloneReasons[text] = (aloneReasons[text] ?? 0) + 1;
									if (examples.length < 400)
										examples.push(
											`${verifiedKey(type, version, compiled.resolved)} with ${variant.condition}: ${found.slice(0, 200)}`,
										);
								}
								break;
							}
							changed.push(...found);
						}
						if (!all) continue;
						agreed.push(variant);
						added.push(variant.condition, ...changed.filter((name) => name !== variant.name));
					}
					let together = settled;
					for (const variant of agreed)
						together = withVariant(together, variant, variant.values[0]);
					together = required(node, version, together);
					const combined =
						agreed.length < 2 ||
						typeof (await agreesWith('alone, together', together)) !== 'string';
					if (combined) names = [...new Set([...names, ...added])];
					const variantForms = combined ? agreed.filter((variant) => variant.form) : [];
					if (!other) {
						add(expressions, {
							'alone tried': variants.length,
							'alone proven': combined ? agreed.length : 0,
							...(combined ? {} : { 'alone together differs': 1 }),
						});
					}
					const key = verifiedKey(type, version, compiled.resolved);
					const flagKeys: string[] = [];
					if (compiled.flags.length > 0) {
						const usual = make('ok', parameters, ok);
						const usualKey = flagKeyOf(usual, compiled.flags, registry);
						if (usualKey !== undefined) flagKeys.push(usualKey);
						for (const variant of flagVariants(usual, compiled.flags, registry)) {
							const difference =
								(await differenceFromV1(
									make('ok', parameters, ok, undefined, variant.data),
									sources,
									registry,
									checking,
								)) ??
								(await differenceFromV1(
									make('error', parameters, bad, undefined, variant.data),
									sources,
									registry,
									checking,
								));
							if (difference === undefined) flagKeys.push(variant.key);
							else if (examples.length < 60)
								examples.push(`${key} with ${variant.key}: ${difference.slice(0, 160)}`);
						}
					}
					const list = [{ id: 'r1' }, { id: 'r2' }];
					const severalResults = {
						...plain,
						result: list,
						data: list,
						items: list,
						results: list,
						records: list,
						messages: list,
						members: list,
						channels: list,
					};
					let pairedReason: string | undefined;
					for (const pairedCase of [
						make('ok', parameters, ok),
						three,
						...(makesFiles || readsFiles
							? []
							: [
									make(
										'three items, several results',
										parameters,
										[...token, { body: severalResults }],
										several(3),
									),
								]),
					]) {
						pairedReason = await differenceFromV1(pairedCase, sources, registry, {
							...checking,
							paired: true,
						});
						if (pairedReason !== undefined) {
							pairedReason = `${pairedCase.name.slice(pairedCase.name.indexOf(' ') + 1)}: ${pairedReason}`;
							break;
						}
					}
					if (pairedReason !== undefined && !other) {
						const text = pairedReason.slice(0, 110);
						pairedReasons[text] = (pairedReasons[text] ?? 0) + 1;
					}
					const [badAnswer] = bad.slice(-1);
					const [okAnswer] = ok.slice(-1);
					const proven: string[] = [];
					const formOf = new Map<ErrorMode, ContinueForm>();
					const continueCases = new Map<ErrorMode, EquivalenceCase>();
					for (const mode of CONTINUE_MODES) {
						const under = (c: EquivalenceCase, more: NodeSettings = {}): EquivalenceCase => ({
							...c,
							name: `${c.name} ${mode}`,
							settings: { onError: mode, ...more },
						});
						const cases = [
							under(make('ok', parameters, ok)),
							under(make('two errors', parameters, bad, several(2))),
							under(make('nested error', parameters, missing)),
							under(make('first fails', parameters, [...bad, okAnswer], several(3))),
							under(make('first works', parameters, [...ok, badAnswer], several(3))),
							under(make('retry', parameters, [...bad, okAnswer]), {
								retryOnFail: true,
								maxTries: 2,
								waitBetweenTries: 1,
							}),
						];
						continueCases.set(mode, under(three));
						const differenceWith = async (pairing: ContinueForm) => {
							const pairings = new Set<ErrorPairing>();
							for (const testCase of cases) {
								const difference = await differenceFromV1(testCase, sources, registry, {
									...checking,
									pairing,
									pairings,
								});
								if (difference !== undefined)
									return `${testCase.name.slice(testCase.name.indexOf(' ') + 1)}: ${difference}`;
							}
							if (
								pairing !== 'once' &&
								mode === 'continueErrorOutput' &&
								[...pairings].some((found) => found !== pairing)
							)
								return `v1 does not pair its error items by ${pairing}`;
							return undefined;
						};
						const once = await differenceWith('once');
						if (once === undefined) {
							proven.push(...errorModeCondition(mode), oneCallCondition(mode));
							formOf.set(mode, 'once');
							continue;
						}
						whyMode(mode, `one call: ${once}`);
						continueCases.delete(mode);
						const byItem = await differenceWith('item');
						if (byItem === undefined) {
							proven.push(...errorModeCondition(mode));
							formOf.set(mode, 'item');
							continue;
						}
						if (
							mode === 'continueErrorOutput' &&
							(await differenceWith('position')) === undefined
						) {
							proven.push(...errorModeCondition(mode), ERROR_ITEMS_BY_POSITION);
							formOf.set(mode, 'position');
							continue;
						}
						whyMode(mode, byItem);
					}
					for (const [mode, measured] of SHOW_COST && !other ? continueCases : []) {
						if (formOf.get(mode) !== 'once') continue;
						const once = costOfCase(measured, sources, registry, false, 'once', caseStore);
						const each = costOfCase(measured, sources, registry, false, 'item', caseStore);
						if (once && each) {
							const node = `${type.slice(PREFIX.length)} ${mode}`;
							add(continueCost, {
								[`${node} operations`]: 1,
								[`${node} once`]: once.ops,
								[`${node} each`]: each.ops,
								...(once.ops > each.ops ? { [`${node} higher`]: 1 } : {}),
							});
							if (once.ops > each.ops && examples.length < 400)
								examples.push(
									`${verifiedKey(type, version, compiled.resolved)} ${mode}, three items: ${once.ops} ops in one call; ${each.ops} ops in a call for each item`,
								);
						}
					}
					const provenEach: string[] = [];
					const forms = expressionForms(widerAgrees ? more : parameters, start);
					const widerForms = widerExpressionForms(
						node,
						version,
						widerAgrees ? more : parameters,
						start,
					);
					const expressionCase = (
						label: string,
						chosen: ExpressionForm[],
						missing: boolean,
						mode?: ErrorMode,
						from: Json = widerAgrees ? more : parameters,
					): EquivalenceCase => ({
						...(mode === undefined ? {} : { settings: { onError: mode } }),
						...make(
							mode === undefined ? label : `${label} ${mode}`,
							{
								...from,
								...Object.fromEntries(chosen.map((form) => [form.name, form.value])),
							},
							ok,
							[0, 1, 2].map((k) => ({
								...first,
								position: k + 1,
								...(missing && k === 1
									? {}
									: Object.fromEntries(
											chosen.flatMap((form) =>
												Object.entries(form.fields).map(([field, values]) => [field, values[k]]),
											),
										)),
							})),
						),
					});
					const expressionDifference = async (
						chosen: ExpressionForm[],
						mode?: ErrorMode,
						from?: Json,
					) => {
						const label = `expressions ${chosen.map((form) => form.name).join(',')}`;
						const how = { ...checking, pairing: mode === undefined ? undefined : formOf.get(mode) };
						return (
							(await differenceFromV1(
								expressionCase(label, chosen, false, mode, from),
								sources,
								registry,
								how,
							)) ??
							(await differenceFromV1(
								expressionCase(`${label}, a field is missing`, chosen, true, mode, from),
								sources,
								registry,
								how,
							))
						);
					};
					if (forms.length > 0 && !other)
						expressions.operations = (expressions.operations ?? 0) + 1;
					if (forms.length > 0) {
						const together = await expressionDifference(forms);
						if (together === undefined) provenEach.push(...forms.map((form) => form.name));
						else {
							let reason = together;
							for (const form of forms.length > 1 ? forms.slice(0, MAX_EXPRESSIONS_ALONE) : []) {
								const single = await expressionDifference([form]);
								if (single === undefined) provenEach.push(form.name);
								else reason = single;
							}
							const text = reason.slice(0, 110);
							if (!other) expressionReasons[text] = (expressionReasons[text] ?? 0) + 1;
							if (examples.length < 60)
								examples.push(`${key} with expressions: ${reason.slice(0, 160)}`);
						}
						if (!other && provenEach.length > 0) expressions.proven = (expressions.proven ?? 0) + 1;
						if (!other && provenEach.length === forms.length)
							expressions.all = (expressions.all ?? 0) + 1;
						if (SHOW_COST && !other && provenEach.length > 0) {
							const chosen = forms.filter((form) => provenEach.includes(form.name));
							const measured = expressionCase('expressions', chosen, false);
							const once = costOfCase(measured, sources, registry, false, undefined, caseStore);
							const each = costOfCase(measured, sources, registry, true, undefined, caseStore);
							if (once && each) {
								const node = type.slice(PREFIX.length);
								add(expressionCost, {
									[`${node} operations`]: 1,
									[`${node} once`]: once.ops,
									[`${node} each`]: each.ops,
								});
							}
						}
					}
					const widerUnder = async (mode?: ErrorMode) => {
						if (widerForms.length === 0) return [];
						if ((await expressionDifference(widerForms, mode)) === undefined)
							return widerForms.map((form) => form.name);
						const agreed: string[] = [];
						for (const form of widerForms.length > 1 ? widerForms : []) {
							const single = await expressionDifference([form], mode);
							if (single === undefined) agreed.push(form.name);
							else if (!other) {
								const text = `${mode ?? 'stopWorkflow'}: ${single}`.slice(0, 110);
								widerReasons[text] = (widerReasons[text] ?? 0) + 1;
							}
						}
						return agreed;
					};
					const widerProven = await widerUnder();
					provenEach.push(...widerProven);
					if (!other) {
						expressions['wider tried'] = (expressions['wider tried'] ?? 0) + widerForms.length;
						expressions['wider proven'] = (expressions['wider proven'] ?? 0) + widerProven.length;
					}
					const provenUnder: string[] = [];
					const formsOfVariants = (chosen: Variant[]): ExpressionForm[] => {
						let p = together;
						const itemFields: Record<string, unknown[]> = {};
						for (const variant of chosen) {
							if (!variant.form) continue;
							p = withVariant(p, variant, variant.form.value);
							Object.assign(itemFields, variant.form.fields);
						}
						return [...new Set(chosen.map((variant) => variant.name))].map((name, at) => ({
							name,
							value: p[name],
							fields: at === 0 ? itemFields : {},
						}));
					};
					const variantEach = async (mode?: ErrorMode): Promise<string[]> => {
						if (variantForms.length === 0) return [];
						const all = await expressionDifference(formsOfVariants(variantForms), mode, together);
						if (all === undefined) return variantForms.map((variant) => variant.condition);
						const singly: string[] = [];
						const tried =
							variantForms.length > 1 ? variantForms.slice(0, MAX_VARIANT_FORMS_ALONE) : [];
						for (const variant of tried) {
							const single = await expressionDifference(formsOfVariants([variant]), mode, together);
							if (single === undefined) singly.push(variant.condition);
						}
						return singly;
					};
					const variantProven = await variantEach();
					provenEach.push(...variantProven);
					if (!other) {
						add(expressions, {
							'alone as expression tried': variantForms.length,
							'alone as expression proven': variantProven.length,
						});
					}
					for (const [mode] of variantProven.length > 0 ? formOf : []) {
						const under = (await variantEach(mode)).filter((name) => variantProven.includes(name));
						provenUnder.push(...under.map((name) => itemParameterCondition(name, mode)));
					}
					for (const [mode] of widerProven.length > 0 ? formOf : []) {
						const agreed = (await widerUnder(mode)).filter((name) => widerProven.includes(name));
						provenUnder.push(...agreed.map((name) => itemParameterCondition(name, mode)));
					}
					for (const [mode] of forms.length > 0 ? formOf : []) {
						const together = await expressionDifference(forms, mode);
						const agreed: string[] = [];
						if (together === undefined) agreed.push(...forms.map((form) => form.name));
						else {
							let reason = together;
							for (const form of forms.length > 1 ? forms.slice(0, MAX_EXPRESSIONS_ALONE) : []) {
								const single = await expressionDifference([form], mode);
								if (single === undefined) agreed.push(form.name);
								else reason = single;
							}
							const text = `${mode}: ${reason}`.slice(0, 110);
							if (!other) expressionReasons[text] = (expressionReasons[text] ?? 0) + 1;
							if (examples.length < 60)
								examples.push(`${key} with expressions, ${mode}: ${reason.slice(0, 160)}`);
						}
						if (!other) {
							expressions[`${mode} operations`] = (expressions[`${mode} operations`] ?? 0) + 1;
							if (agreed.length > 0)
								expressions[`${mode} proven`] = (expressions[`${mode} proven`] ?? 0) + 1;
							if (agreed.length === forms.length)
								expressions[`${mode} all`] = (expressions[`${mode} all`] ?? 0) + 1;
						}
						provenUnder.push(...agreed.map((name) => itemParameterCondition(name, mode)));
					}
					const failingForm = forms.find(
						(form) => provenEach.includes(form.name) && typeof form.value === 'string',
					);
					const failureCase = (form: ExpressionForm, at: number, mode?: ErrorMode) => {
						const [field] = Object.keys(form.fields);
						const failing: ExpressionForm = {
							name: form.name,
							value: itemFailureExpression(field),
							fields: {
								[field]: form.fields[field].map((value, k) =>
									k === at ? FAILING_VALUE : String(value),
								),
							},
						};
						return expressionCase(
							`the expression of ${form.name} fails for item ${at}`,
							[failing],
							false,
							mode,
						);
					};
					const failureDifference = async (form: ExpressionForm, mode?: ErrorMode) => {
						const how = { ...checking, pairing: mode === undefined ? undefined : formOf.get(mode) };
						return (
							(await differenceFromV1(failureCase(form, 1, mode), sources, registry, how)) ??
							(await differenceFromV1(failureCase(form, 0, mode), sources, registry, how))
						);
					};
					const provenErrors: string[] = [];
					for (const mode of failingForm ? [undefined, ...formOf.keys()] : []) {
						if (!failingForm) break;
						if (
							mode !== undefined &&
							!provenUnder.includes(itemParameterCondition(failingForm.name, mode))
						)
							continue;
						const difference = await failureDifference(failingForm, mode);
						if (difference === undefined) provenErrors.push(itemErrorCondition(mode));
						else if (!other) {
							const text = `${mode ?? 'stopWorkflow'}: ${difference}`.slice(0, 110);
							failureReasons[text] = (failureReasons[text] ?? 0) + 1;
						}
					}
					const provenEvaluated: string[] = [];
					const evaluatedFrom: Json = widerAgrees ? more : parameters;
					for (const form of /\bgetResolvables\(/.test(compiled.source)
						? evaluatedForms(evaluatedFrom, start)
						: []) {
						const probe = compileForCheck(
							sources,
							{ type, version, parameters: { ...evaluatedFrom, [form.name]: form.value } },
							fields,
						);
						if ('errors' in probe || !evaluatedParameterNames(probe).includes(form.name)) continue;
						for (const mode of [undefined, ...formOf.keys()]) {
							const how = {
								...checking,
								pairing: mode === undefined ? undefined : formOf.get(mode),
							};
							const label = `expressions in the text of ${form.name}`;
							const cases = [
								expressionCase(label, [form], false, mode),
								expressionCase(`${label}, a field is missing`, [form], true, mode),
								expressionCase(
									`${label}, one fails for item 1`,
									[failingEvaluatedForm(form, 1)],
									false,
									mode,
								),
								expressionCase(
									`${label}, one fails for item 0`,
									[failingEvaluatedForm(form, 0)],
									false,
									mode,
								),
							];
							let difference: string | undefined;
							for (const tested of cases)
								difference ??= await differenceFromV1(tested, sources, registry, how);
							if (difference === undefined)
								provenEvaluated.push(evaluatedCondition(form.name, mode));
							else if (!other) {
								const text = `${mode ?? 'stopWorkflow'}: ${label}: ${difference}`.slice(0, 110);
								failureReasons[text] = (failureReasons[text] ?? 0) + 1;
							}
						}
					}
					if (failingForm && !other) expressions.failing = (expressions.failing ?? 0) + 1;
					const rejectedEach = new Set<string>();
					for (const variant of combined ? agreed : []) {
						if (!variant.rejected) continue;
						const tested: ExpressionForm = {
							name: variant.name,
							value: withVariant(together, variant, variant.rejected.value)[variant.name],
							fields: variant.rejected.fields,
						};
						const difference = await differenceFromV1(
							expressionCase(
								`a value of ${variant.condition} that v1 rejects`,
								[tested],
								false,
								undefined,
								together,
							),
							sources,
							registry,
							checking,
						);
						if (difference === undefined) continue;
						rejectedEach.add(variant.condition);
						rejectedEach.add(variant.name);
						if (!other) {
							const text = `validation of ${variant.condition}: ${difference}`.slice(0, 110);
							failureReasons[text] = (failureReasons[text] ?? 0) + 1;
						}
					}
					const checkedEach = (condition: string) => {
						if (!condition.startsWith(ITEM_PARAMETER_PREFIX)) return true;
						const name = condition.slice(ITEM_PARAMETER_PREFIX.length).split('@')[0];
						return !rejectedEach.has(name);
					};
					const keptModes = CONTINUE_MODES.filter((mode) =>
						errorModeCondition(mode).every((m) => proven.includes(m)),
					);
					const ofKeptMode = (condition: string) =>
						keptModes.some(
							(mode) =>
								condition.endsWith(`@${mode}`) ||
								condition === oneCallCondition(mode) ||
								errorModeCondition(mode).includes(condition),
						) ||
						(condition === ERROR_ITEMS_BY_POSITION && keptModes.includes('continueErrorOutput'));
					const eachConditions = [
						...provenEach.map((name) => itemParameterCondition(name)),
						...provenUnder.filter(ofKeptMode),
						...provenErrors.filter((name) => name === ITEM_ERROR || ofKeptMode(name)),
						...provenEvaluated.filter(
							(name) =>
								!CONTINUE_MODES.some((mode) => name.endsWith(`@${mode}`)) || ofKeptMode(name),
						),
					].filter(checkedEach);
					const modes = proven.filter(ofKeptMode);
					const conditions = [
						...names,
						...flagKeys,
						...modes,
						...eachConditions,
						...(pairedReason === undefined ? [PAIRED_ITEMS] : []),
						...(eachItem === undefined ? [CALL_FOR_EACH_ITEM] : []),
					];
					const authentication = String(parameters.authentication);
					const stated = other
						? conditions.map((condition) => authenticationCondition(authentication, condition))
						: conditions;
					writes.push([key, other, stated]);
					verified[key] = withWrite(verified[key], other, stated);
					if (other) add(expressions, { 'other authentication': 1 });
					if (MEASURE_COST && !other) {
						const cost = costOfCase(
							make('ok', parameters, ok),
							sources,
							registry,
							false,
							undefined,
							caseStore,
						);
						if (cost) costs[key] = cost;
					}
					if (compiled.mints.length > 0) mintedVerified++;
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					if (TRANSIENT.test(message)) transient = true;
					why(`check failed: ${message}`, weight);
				}
			}
		}
	}
}
await disposeRecorder();
if (one !== undefined) {
	caseStore?.save();
	const result: NodeResult = {
		verified,
		blocked,
		differences,
		modeDifferences,
		writes,
		reads,
		transient,
		manyItems,
		manyItemReasons,
		threeItemCost,
		expressionCost,
		continueCost,
		pairedReasons,
		failureReasons,
		widerReasons,
		aloneReasons,
		expressions,
		expressionReasons,
		tried,
		compiled: compiledCount,
		examples,
		mintedTried,
		mintedVerified,
		costs,
	};
	const line = `RESULT ${JSON.stringify(result)}\n`;
	await new Promise((written) => process.stdout.write(line, written));
	process.exit(0);
}

const lines = Object.keys(verified)
	.sort()
	.map((key) => `\t${JSON.stringify(key)}: ${JSON.stringify(verified[key])},`);
const ranNodes = new Set(checkedNames);
const staleNodes = new Set(stale.map((entry) => entry.name));
if (WRITES) {
	const list = mergedList(VERIFIED, ranNodes, staleNodes, verified, WHOLE, nodeOfKey);
	writeFileSync(
		join(here, '../src/node-compile/verified.generated.ts'),
		`export const VERIFIED: Record<string, string[]> = {
${Object.entries(list)
	.map(([key, names]) => `\t${JSON.stringify(key)}: ${JSON.stringify(names)},`)
	.join('\n')}
};
`,
	);
}
const costKeys = Object.keys(costs).sort();
const higher = costKeys.filter((key) => COST[key] !== undefined && costs[key].ops > COST[key][0]);
const listedFor = (key: string) =>
	ACCEPTED_COST_RISES.find((entry) => entry.key === key) ??
	ACCEPTED_COST_RISES.find(
		(entry) => entry.key.endsWith('*') && key.startsWith(entry.key.slice(0, -1)),
	);
const riseOf = (key: string) => costs[key].ops - COST[key][0];
const isAccepted = (key: string) =>
	acceptedRises.has(key) || riseOf(key) <= (listedFor(key)?.rise ?? 0);
const risen = higher.filter((key) => !isAccepted(key));
const acceptedNow = higher.filter(isAccepted);
const idleListed = ACCEPTED_COST_RISES.filter(
	(entry) =>
		costKeys.some((key) => listedFor(key) === entry) &&
		!higher.some((key) => listedFor(key) === entry),
).map((entry) => entry.key);
const idleAccepts = [...[...acceptedRises].filter((key) => !higher.includes(key)), ...idleListed];
const recordOf = (key: string): [number, number] =>
	risen.includes(key) ? COST[key] : [costs[key].ops, costs[key].allocations];
if (WRITES) {
	const measured: Record<string, [number, number]> = {};
	for (const key of costKeys) measured[key] = recordOf(key);
	const list = mergedList(COST, ranNodes, staleNodes, measured, WHOLE, nodeOfKey);
	writeFileSync(
		join(here, '../src/node-compile/cost.generated.ts'),
		`export const COST: Record<string, [ops: number, allocations: number]> = {
${Object.entries(list)
	.map(([key, record]) => `\t${JSON.stringify(key)}: [${record.join(', ')}],`)
	.join('\n')}
};
`,
	);
}
const quantile = (sorted: number[], q: number) =>
	sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const spread = (values: number[]) => {
	const sorted = [...values].sort((a, b) => a - b);
	return `p50 ${quantile(sorted, 0.5)}; p90 ${quantile(sorted, 0.9)}; max ${sorted.at(-1) ?? 0}`;
};
if (SHOW_COST) {
	const rows = costKeys.map((key) => costs[key]);
	console.log(`cost of ${rows.length} verified operations, the 'ok' case, in bytecode`);
	console.log(`ops: ${spread(rows.map((r) => r.ops))}`);
	console.log(`allocations: ${spread(rows.map((r) => r.allocations))}`);
	console.log('node\toperations\tops\tallocations');
	for (const node of [...new Set(costKeys.map(nodeOfKey))]) {
		const mine = costKeys.filter((key) => nodeOfKey(key) === node).map((key) => costs[key]);
		console.log(
			[
				node,
				mine.length,
				spread(mine.map((r) => r.ops)),
				spread(mine.map((r) => r.allocations)),
			].join('\t'),
		);
	}
	console.log('the 30 most expensive operations');
	console.log('ops\tallocations\tcalls\treads\twrites\tbranches\tconcats\trequests\toperation');
	for (const key of [...costKeys].sort((a, b) => costs[b].ops - costs[a].ops).slice(0, 30)) {
		const r = costs[key];
		console.log(
			[
				r.ops,
				r.allocations,
				r.calls,
				r.reads,
				r.writes,
				r.branches,
				r.concats,
				r.effects,
				key,
			].join('\t'),
		);
	}
	const paired = costKeys.filter((key) => costs[key].handWrittenOps !== undefined);
	if (paired.length > 0) {
		console.log('compiled / hand-written, same case');
		console.log(
			'ops ratio\tops\thand-written ops\tallocations\thand-written allocations\toperation',
		);
		for (const key of paired) {
			const r = costs[key];
			const theirs = r.handWrittenOps ?? 1;
			console.log(
				[
					(r.ops / theirs).toFixed(2),
					r.ops,
					theirs,
					r.allocations,
					r.handWrittenAllocations ?? 0,
					key,
				].join('\t'),
			);
		}
	}
}
if (CHECK_COST || higher.length > 0 || idleAccepts.length > 0) {
	for (const key of risen)
		console.log(`cost rose: ${key}: ${COST[key][0]} ops recorded, ${costs[key].ops} ops now`);
	for (const key of acceptedNow)
		console.log(
			`cost rise accepted: ${key}: ${COST[key][0]} ops recorded, ${costs[key].ops} ops now`,
		);
	for (const key of risen) {
		const listed = listedFor(key);
		if (listed)
			console.log(
				`cost rose more than cost-accepted.ts allows: ${key}: ${riseOf(key)} ops, accepted ${listed.rise}`,
			);
	}
	for (const key of idleAccepts)
		console.log(
			`accepted rise of ${key}: this operation did not rise or was not measured; remove it from cost-accepted.ts`,
		);
	console.log(
		risen.length === 0
			? `cost check: no operation of ${costKeys.length} costs more ops than its record`
			: `cost check: ${risen.length} operation(s) cost more ops than their record; lower the cost, or add a rise that correctness needs to src/node-compile/cost-accepted.ts with its reason (or give \`${ACCEPT_RISE} <key>\`)`,
	);
	if (CHECK_COST && risen.length > 0) process.exitCode = 1;
}
console.log(`operations ${tried}; compiled ${compiledCount}; verified against v1 ${lines.length}`);
const manyItemNodes = Object.entries(manyItems).sort((a, b) => b[1] - a[1]);
if (manyItemNodes.length > 0)
	console.log(
		`agree with v1 for three items only in one call for all items: ${manyItemNodes.reduce((sum, [, count]) => sum + count, 0)} (${manyItemNodes.map(([node, count]) => `${node.slice(PREFIX.length)} ${count}`).join(', ')})`,
	);
for (const [reason, count] of Object.entries(manyItemReasons).sort((a, b) => b[1] - a[1]))
	console.log(`${count}\t${reason}`);
if (threeItemCost.operations > 0)
	console.log(
		`three items, ${threeItemCost.operations} operations: ${Math.round(threeItemCost.once / threeItemCost.operations / 3)} ops for each item in one call; ${Math.round(threeItemCost.each / threeItemCost.operations / 3)} ops for each item in a call for each item`,
	);
if ((expressions.operations ?? 0) > 0) {
	console.log(
		`a parameter as an expression for each item, one call for all items: operations tried ${expressions.operations}; with a parameter that agrees with v1 ${expressions.proven ?? 0}; with all tried parameters ${expressions.all ?? 0}`,
	);
	for (const [reason, count] of Object.entries(expressionReasons).sort((a, b) => b[1] - a[1]))
		console.log(`${count}\t${reason}`);
}
for (const node of Object.keys(expressionCost)
	.filter((name) => name.endsWith(' operations'))
	.map((name) => name.slice(0, -' operations'.length))) {
	const count = expressionCost[`${node} operations`];
	console.log(
		`three items with expressions, ${node}, ${count} operations: ${Math.round(expressionCost[`${node} once`] / count / 3)} ops for each item in one call; ${Math.round(expressionCost[`${node} each`] / count / 3)} ops for each item in a call for each item`,
	);
}
if ((expressions['alone tried'] ?? 0) > 0) {
	console.log(
		`a parameter or a member of a collection with its own value: tried ${expressions['alone tried']}; agree with v1 ${expressions['alone proven'] ?? 0}; operations where they differ together ${expressions['alone together differs'] ?? 0}; as an expression for each item: tried ${expressions['alone as expression tried'] ?? 0}; agree with v1 ${expressions['alone as expression proven'] ?? 0}`,
	);
	console.log(
		`operation forms with another authentication that agree with v1: ${expressions['other authentication'] ?? 0}`,
	);
	for (const [reason, count] of Object.entries(aloneReasons).sort((a, b) => b[1] - a[1]))
		console.log(`${count}\t${reason}`);
}
if ((expressions['wider tried'] ?? 0) > 0) {
	console.log(
		`a boolean, options or json parameter as an expression for each item: tried ${expressions['wider tried']}; agree with v1 ${expressions['wider proven'] ?? 0}`,
	);
	for (const [reason, count] of Object.entries(widerReasons).sort((a, b) => b[1] - a[1]))
		console.log(`${count}\t${reason}`);
}
if ((expressions.failing ?? 0) > 0) {
	const count = (condition: string) =>
		Object.values(verified).filter((names) => names.includes(condition)).length;
	console.log(
		`an expression that fails for an item, operations tried ${expressions.failing}: agree with v1 ${count(ITEM_ERROR)}; ${CONTINUE_MODES.map((mode) => `under ${mode} ${count(itemErrorCondition(mode))}`).join('; ')}`,
	);
	for (const [reason, count] of Object.entries(failureReasons).sort((a, b) => b[1] - a[1]))
		console.log(`${count}\t${reason}`);
}
const pairedCount = Object.values(verified).filter((names) => names.includes(PAIRED_ITEMS)).length;
console.log(`the paired items of the output agree with the run data of v1: ${pairedCount}`);
for (const [reason, count] of Object.entries(pairedReasons).sort((a, b) => b[1] - a[1]))
	console.log(`${count}\t${reason}`);
for (const node of Object.keys(continueCost)
	.filter((name) => name.endsWith(' operations'))
	.map((name) => name.slice(0, -' operations'.length))) {
	const count = continueCost[`${node} operations`];
	console.log(
		`three items, ${node}, ${count} operations: ${Math.round(continueCost[`${node} once`] / count / 3)} ops for each item in one call; ${Math.round(continueCost[`${node} each`] / count / 3)} ops for each item in a call for each item; operations that cost more in one call: ${continueCost[`${node} higher`] ?? 0}`,
	);
}
for (const mode of CONTINUE_MODES) {
	const [condition] = errorModeCondition(mode);
	const under = Object.entries(verified).filter(([, names]) => names.includes(condition));
	const once = under.filter(([, names]) => names.includes(oneCallCondition(mode)));
	const byNode: Record<string, [number, number]> = {};
	for (const [key, names] of under) {
		const node = key.slice(PREFIX.length, key.indexOf('@'));
		const [all, one] = byNode[node] ?? [0, 0];
		byNode[node] = [all + 1, one + (names.includes(oneCallCondition(mode)) ? 1 : 0)];
	}
	console.log(
		`verified against v1 under ${mode}: ${under.length}; in one call for all items: ${once.length}${
			DETAIL
				? ` (${Object.entries(byNode)
						.map(([node, [all, one]]) => `${node} ${one} of ${all}`)
						.join(', ')})`
				: ''
		}`,
	);
	if ((expressions[`${mode} operations`] ?? 0) > 0)
		console.log(
			`a parameter as an expression for each item under ${mode}: operations tried ${expressions[`${mode} operations`]}; with a parameter that agrees with v1 ${expressions[`${mode} proven`] ?? 0}; with all tried parameters ${expressions[`${mode} all`] ?? 0}`,
		);
}
const modeLines = Object.entries(modeReasons)
	.sort((a, b) => b[1] - a[1])
	.slice(0, DETAIL ? 70 : 40)
	.map(([reason, count]) => `${count}\t${reason}`);
if (modeLines.length > 0)
	console.log(`not verified under an error setting:\n${modeLines.join('\n')}`);
if (mintedVerified > 0 || mintedTried > 0)
	console.log(
		`operation forms verified with a token that n8n mints: ${mintedVerified} (other authentications tried: ${mintedTried})`,
	);
const weightIn = (reason: string) => weighted[reason] ?? 0;
if (ALL_BLOCKERS) console.log('operations blocked\toperations with no other blocker\tblocker');
if (weights.size > 0) console.log('the first column is the weighted count');
console.log(
	Object.entries(reasons)
		.sort((a, b) => weightIn(b[0]) - weightIn(a[0]) || b[1] - a[1])
		.slice(0, DETAIL ? 70 : 40)
		.map(([reason, count]) =>
			[
				...(weights.size > 0 ? [weightIn(reason)] : []),
				count,
				...(ALL_BLOCKERS ? [alone[reason] ?? 0] : []),
				reason,
			].join('\t'),
		)
		.join('\n'),
);
if (args.includes('--examples')) console.log(examples.join('\n'));
if (pattern !== undefined && !args.includes('--examples')) console.log(lines.join('\n'));
if (stale.length > 0) process.exitCode = STALE_EXIT_CODE;

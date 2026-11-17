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

import type { NodeDescription } from '../src/convert/node-parameters.ts';
import { getNodeParameters } from '../src/convert/node-parameters.ts';
import { publicCredential } from '../src/credentials/public.ts';
import { loadCredentialTypes, registryOf } from '../src/credentials/types.ts';
import type { ContinueForm, ErrorPairing } from '../src/node-compile/__tests__/verify.ts';
import type { CaseCost } from '../src/node-compile/__tests__/verify.ts';
import {
	compileForCheck,
	costOfCase,
	differenceFromV1,
	flagKeyOf,
	flagVariants,
	FAILING_VALUE,
	itemFailureExpression,
	itemFieldExpression,
	MINTED_TOKEN_RESPONSE,
} from '../src/node-compile/__tests__/verify.ts';
import { COST } from '../src/node-compile/cost.generated.ts';
import type { ErrorMode, NodeSources } from '../src/node-compile/convert.ts';
import { evaluateInSandbox } from '../src/node-compile/evaluate-node.ts';
import {
	CONTINUE_MODES,
	CALL_FOR_EACH_ITEM,
	ERROR_ITEMS_BY_POSITION,
	ITEM_PARAMETER_PREFIX,
	ITEM_ERROR,
	ONE_CALL_PREFIX,
	PAIRED_ITEMS,
	itemErrorCondition,
	errorModeCondition,
	itemParameterCondition,
	oneCallCondition,
	verifiedKey,
} from '../src/node-compile/convert.ts';
import type { EquivalenceCase, NodeSettings } from '../src/nodes/__tests__/equivalence.ts';
import {
	disposeRecorder,
	recordV1,
	recordV1Cached,
	recorderAvailable,
} from '../src/nodes/__tests__/v1-recorder.ts';

type Json = Record<string, unknown>;
interface Member {
	name?: string;
	value?: unknown;
	type?: string;
	default?: unknown;
	options?: Member[];
	values?: Member[];
	typeOptions?: { multipleValues?: boolean };
}
interface Property {
	name: string;
	type: string;
	default?: unknown;
	options?: Member[];
	displayOptions?: { show?: Record<string, unknown[]> };
	typeOptions?: { multipleValues?: boolean };
}
interface LoadedNode {
	description: NodeDescription & {
		version: number | number[];
		credentials?: Array<{ name: string; displayOptions?: { show?: Record<string, unknown[]> } }>;
	};
	nodeVersions?: Record<string, LoadedNode>;
	constructor: { name: string };
}

const here = dirname(fileURLToPath(import.meta.url));
const base = join(here, '../../../nodes-base');
const PREFIX = 'n8n-nodes-base.';
const load = createRequire(join(base, 'package.json'));

const ACCEPT_RISE = '--accept-cost-rise';
const VALUE_FLAGS = ['--one', '--weights', ACCEPT_RISE];
const args = process.argv.slice(2);
const valueOf = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const DIST = args.includes('--dist');
const DETAIL = args.includes('--detail');
const CACHE = !args.includes('--no-cache');
const ALL_BLOCKERS = args.includes('--all-blockers');
const SHOW_COST = args.includes('--cost');
const CHECK_COST = args.includes('--check-cost');
const acceptedRises = new Set(args.filter((_arg, at) => at > 0 && args[at - 1] === ACCEPT_RISE));
const one = valueOf('--one');
const weightsFile = valueOf('--weights');
const pattern = args.find((a, at) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[at - 1]));
const add = (into: Record<string, number>, from: Record<string, number> | undefined) => {
	for (const [key, count] of Object.entries(from ?? {})) into[key] = (into[key] ?? 0) + count;
};
const MEASURE_COST =
	SHOW_COST || CHECK_COST || (one === undefined && pattern === undefined && !DIST);
const filter = new RegExp(one === undefined ? (pattern ?? '.') : `^${one}$`, 'i');
const PARALLEL = 6;
const NODE_TIMEOUT_MS = 2_700_000;
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

const sources: NodeSources = {
	entry: (type, version) => {
		const node = nodeOf(type, version);
		return node ? classFile.get(node.constructor.name) : undefined;
	},
	readFile: (path) =>
		existsSync(path) && statSync(path).isFile() ? readFileSync(path, 'utf8') : undefined,
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

function weightOf(type: string, parameters: Json): number {
	const operation = `${String(parameters.resource ?? '')}.${String(parameters.operation ?? '')}`;
	return (
		weights.get(`${type}:${operation}`) ??
		weights.get(`${type.slice(PREFIX.length)}:${operation}`) ??
		0
	);
}

function credentialOf(node: LoadedNode, resolved: Json): string | undefined {
	const all = node.description.credentials ?? [];
	const shown = all.find((c) =>
		Object.entries(c.displayOptions?.show ?? {}).every(
			([name, allowed]) => name.startsWith('@') || allowed.includes(resolved[name]),
		),
	);
	return (shown ?? all[0])?.name;
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

function fakeCredential(type: string): Json {
	const data: Json = {};
	for (const [key, value] of Object.entries(registry.get(type)?.defaults ?? {})) {
		const address = /url|host|domain|server|endpoint/i.test(key);
		data[key] = value === '' ? (address ? 'https://api.example.test' : `fake-${key}`) : value;
	}
	if (type === 'googleApi') data.privateKey = testSigningKey();
	if (/oauth2/i.test(type)) {
		data.oauthTokenData = {
			access_token: 'fake-token',
			instance_url: 'https://instance.example.test',
			api_domain: 'https://api.example.test',
			...(type === 'quickBooksOAuth2Api' ? { callbackQueryString: { realmId: 'fake-realm' } } : {}),
		};
	}
	return data;
}

function resolve(node: LoadedNode, version: number, parameters: Json): Json {
	const d = node.description;
	return getNodeParameters(d.properties, parameters, true, false, version, d) ?? {};
}

function required(node: LoadedNode, version: number, start: Json): Json {
	const properties = node.description.properties as unknown as Property[];
	const out: Json = { ...start };
	for (const [name, value] of Object.entries(resolve(node, version, start))) {
		const type = properties.find((p) => p.name === name)?.type;
		if (name in out) continue;
		if (type === 'string' && value === '') out[name] = 'v1';
		else if (type === 'json' && value === '') out[name] = '{}';
		else if (type === 'number' && value === undefined) out[name] = 1;
		else if (type === 'resourceLocator') out[name] = { __rl: true, mode: 'id', value: 'id1' };
	}
	return out;
}

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

const MAX_WIDER_FORMS = 6;
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

interface Variant {
	condition: string;
	name: string;
	member?: string;
	values: unknown[];
	form?: { value: unknown; fields: Record<string, unknown[]> };
}

const MAX_CHOICES = 12;
const MAX_GROUP_CASES = 16;
const MAX_VARIANT_CASES = 60;
const MAX_VARIANT_FORMS_ALONE = 6;
const DATES = ['2024-01-10T10:00:00.000Z', '2024-02-11T11:00:00.000Z', '2024-03-12T12:00:00.000Z'];

const fieldNameOf = (name: string) => name.replace(/\W/g, '_');

function choicesOf(member: Member): unknown[] {
	return (member.options ?? [])
		.map((o) => o.value)
		.filter((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean');
}

function samplesOf(member: Member, current: unknown): unknown[] {
	const choices = choicesOf(member);
	if (member.type === 'string') return [current === 'v5' ? 'v6' : 'v5'];
	if (member.type === 'number') return [typeof current === 'number' ? current + 1 : 1];
	if (member.type === 'boolean') return [current !== true];
	if (member.type === 'dateTime') return [DATES[0]];
	if (member.type === 'json') return ['{"a":1}'];
	if (member.type === 'options') {
		if (choices.length === 0) return ['v1'];
		const others = choices.filter((choice) => choice !== current);
		return others.length <= MAX_CHOICES ? others : [];
	}
	if (member.type === 'multiOptions') {
		if (choices.length === 0) return [['v1', 'v2']];
		return choices.length <= MAX_CHOICES ? [choices, [choices[0]]] : [];
	}
	return [];
}

function itemValuesOf(member: Member, sample: unknown): unknown[] | undefined {
	const free =
		member.type === 'string' || (member.type === 'options' && choicesOf(member).length === 0);
	if (free && typeof sample === 'string') return [sample, `${sample}b`, `${sample}c`];
	if (member.type === 'number' && typeof sample === 'number')
		return [sample, sample + 1, sample + 2];
	if (member.type === 'dateTime') return DATES;
	return undefined;
}

function groupVariant(property: Property, group: Member): Variant | undefined {
	if (!group.name) return undefined;
	const entry: Json = {};
	const second: Json = {};
	const withItems: Json = {};
	const fields: Record<string, unknown[]> = {};
	const others: Json[] = [];
	for (const field of group.values ?? []) {
		if (!field.name || field.type === 'notice') continue;
		const choices = choicesOf(field);
		const all =
			field.type === 'options' && choices.length > 0 ? choices : samplesOf(field, field.default);
		if (all.length === 0 || all.length > MAX_CHOICES) return undefined;
		entry[field.name] = all[0];
		second[field.name] =
			typeof all[0] === 'string' && field.type === 'string' ? `${all[0]}2` : all[0];
		const itemValues = itemValuesOf(field, all[0]);
		if (itemValues !== undefined) {
			const itemField = fieldNameOf(`${property.name}_${group.name}_${field.name}`);
			withItems[field.name] = itemFieldExpression(itemField);
			fields[itemField] = itemValues;
		}
		for (const other of all.slice(1)) others.push({ [field.name]: other });
	}
	if (Object.keys(entry).length === 0 || others.length >= MAX_GROUP_CASES) return undefined;
	const multiple = property.typeOptions?.multipleValues === true;
	const valueOf = (first: Json, more: Json[]) => (multiple ? [first, ...more] : first);
	return {
		condition: `${property.name}.${group.name}`,
		name: property.name,
		member: group.name,
		values: [
			valueOf(entry, [second]),
			...others.map((other) => valueOf({ ...entry, ...other }, [])),
		],
		...(Object.keys(fields).length > 0
			? { form: { value: valueOf({ ...entry, ...withItems }, [second]), fields } }
			: {}),
	};
}

function shownProperty(
	node: LoadedNode,
	version: number,
	parameters: Json,
	name: string,
): Property | undefined {
	const d = node.description;
	const properties = d.properties as unknown as Property[];
	const places = properties.flatMap((p, at) => (p.name === name ? [at] : []));
	if (places.length === 1) return properties[places[0]];
	const shown = places.filter((place) => {
		const rest = d.properties.filter((p, at) => p.name !== name || at === place);
		return name in (getNodeParameters(rest, parameters, true, false, version, d) ?? {});
	});
	return shown.length === 1 ? properties[shown[0]] : undefined;
}

function parameterVariants(
	node: LoadedNode,
	version: number,
	parameters: Json,
	fixed: Json,
	listed: string[],
): Variant[] {
	const variants: Variant[] = [];
	let cases = 0;
	const take = (variant: Variant | undefined) => {
		if (!variant || variant.values.length === 0) return;
		if (cases + variant.values.length > MAX_VARIANT_CASES) return;
		cases += variant.values.length;
		variants.push(variant);
	};
	for (const [name, value] of Object.entries(resolve(node, version, parameters))) {
		if (name in fixed || name in parameters || NOT_AN_EXPRESSION.has(name) || listed.includes(name))
			continue;
		const property = shownProperty(node, version, parameters, name);
		if (!property) continue;
		if (property.type === 'collection') {
			for (const member of property.options ?? []) {
				if (!member.name) continue;
				const values = samplesOf(member, member.default);
				const itemValues = itemValuesOf(member, values[0]);
				const field = fieldNameOf(`${name}_${member.name}`);
				take({
					condition: `${name}.${member.name}`,
					name,
					member: member.name,
					values,
					...(itemValues === undefined
						? {}
						: { form: { value: itemFieldExpression(field), fields: { [field]: itemValues } } }),
				});
			}
		} else if (property.type === 'fixedCollection') {
			for (const group of property.options ?? []) take(groupVariant(property, group));
		} else {
			const values = samplesOf(property, value);
			const itemValues = itemValuesOf(property, values[0]);
			const field = fieldNameOf(name);
			take({
				condition: name,
				name,
				values,
				...(itemValues === undefined
					? {}
					: { form: { value: itemFieldExpression(field), fields: { [field]: itemValues } } }),
			});
		}
	}
	return variants;
}

function withVariant(parameters: Json, variant: Variant, value: unknown): Json {
	if (variant.member === undefined) return { ...parameters, [variant.name]: value };
	const current = parameters[variant.name];
	return {
		...parameters,
		[variant.name]: { ...(isJson(current) ? current : {}), [variant.member]: value },
	};
}

function operations(node: LoadedNode): Json[] {
	const properties = node.description.properties as unknown as Property[];
	const values = (p: Property) =>
		(p.options ?? []).map((o) => o.value).filter((v) => typeof v === 'string');
	const resources = properties.filter((p) => p.name === 'resource').flatMap(values);
	const out: Json[] = [];
	for (const resource of resources.length > 0 ? resources : [undefined]) {
		const shown = properties.filter(
			(p) =>
				p.name === 'operation' &&
				(resource === undefined ||
					!p.displayOptions?.show?.resource ||
					p.displayOptions.show.resource.includes(resource)),
		);
		const names = [...new Set(shown.flatMap(values))];
		for (const operation of names.length > 0 ? names : [undefined]) {
			out.push({
				...(resource === undefined ? {} : { resource }),
				...(operation === undefined ? {} : { operation }),
			});
		}
	}
	return out;
}

const checking = { cache: CACHE };
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
const aloneNames = new Map<string, string[]>();
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
	reasons: Record<string, number>;
	modeReasons?: Record<string, number>;
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
	alone?: Record<string, number>;
	weighted?: Record<string, number>;
	tried: number;
	compiled: number;
	examples?: string[];
	mintedTried?: number;
	mintedVerified?: number;
	costs?: Record<string, CaseCost>;
}

async function checkInProcess(name: string): Promise<NodeResult | undefined> {
	return await new Promise((resolve) => {
		const child = spawn(
			process.execPath,
			[
				fileURLToPath(import.meta.url),
				...(DIST ? ['--dist'] : []),
				...(DETAIL ? ['--detail'] : []),
				...(CACHE ? [] : ['--no-cache']),
				...(ALL_BLOCKERS ? ['--all-blockers'] : []),
				...(MEASURE_COST ? ['--cost'] : []),
				...(weightsFile === undefined ? [] : ['--weights', weightsFile]),
				'--one',
				name,
			],
			{
				stdio: ['ignore', 'pipe', 'ignore'],
			},
		);
		let out = '';
		child.stdout.on('data', (chunk: Buffer) => {
			out += chunk.toString();
		});

		const timer = setTimeout(() => child.kill('SIGKILL'), NODE_TIMEOUT_MS);
		child.on('close', () => {
			clearTimeout(timer);
			const line = out.split('\n').find((l) => l.startsWith('RESULT '));
			resolve(line ? (JSON.parse(line.slice('RESULT '.length)) as NodeResult) : undefined);
		});
	});
}

if (one === undefined) {
	const names = Object.keys(known)
		.sort()
		.filter((name) => filter.test(name) && !/Trigger$/.test(name));
	let next = 0;
	let lost = 0;
	const worker = async () => {
		while (next < names.length) {
			const name = names[next++];
			const result = await checkInProcess(name);
			if (!result) {
				lost++;
				continue;
			}
			Object.assign(verified, result.verified);
			Object.assign(costs, result.costs);
			add(reasons, result.reasons);
			add(modeReasons, result.modeReasons);
			add(manyItems, result.manyItems);
			add(manyItemReasons, result.manyItemReasons);
			add(threeItemCost, result.threeItemCost);
			add(expressionCost, result.expressionCost);
			add(continueCost, result.continueCost);
			add(pairedReasons, result.pairedReasons);
			add(failureReasons, result.failureReasons);
			add(widerReasons, result.widerReasons);
			add(aloneReasons, result.aloneReasons);
			add(expressions, result.expressions);
			add(expressionReasons, result.expressionReasons);
			add(alone, result.alone);
			add(weighted, result.weighted);
			for (const example of result.examples ?? [])
				if (examples.length < 400) examples.push(`${name}: ${example}`);
			tried += result.tried;
			compiledCount += result.compiled;
			mintedTried += result.mintedTried ?? 0;
			mintedVerified += result.mintedVerified ?? 0;
		}
	};
	await Promise.all(Array.from({ length: PARALLEL }, worker));
	if (lost > 0)
		console.log(`${lost} node(s) gave no result (a crash or more than forty-five minutes)`);
}

const requestPart = (reason: string) => /^v1: the requests differ: (\w+)/.exec(reason)?.[1];
const keyOf = (reason: string) => {
	if (DETAIL) return reason.slice(0, 110);
	const part = requestPart(reason);
	return part === undefined
		? reason.replace(/'[^']*'/g, "'…'").slice(0, 90)
		: `v1: the requests differ: ${part}`;
};
const why = (reason: string, weight: number, only = true) => {
	if (requestPart(reason) !== undefined && examples.length < 60)
		examples.push(reason.slice(0, 200));
	const key = keyOf(reason);
	reasons[key] = (reasons[key] ?? 0) + 1;
	if (only) alone[key] = (alone[key] ?? 0) + 1;
	if (weight !== 0) weighted[key] = (weighted[key] ?? 0) + weight;
};

const whyMode = (mode: ErrorMode, reason: string) => {
	const key = `${mode}: ${DETAIL ? reason.slice(0, 110) : reason.replace(/'[^']*'/g, "'…'").slice(0, 90)}`;
	modeReasons[key] = (modeReasons[key] ?? 0) + 1;
};

for (const name of one === undefined ? [] : Object.keys(known).sort()) {
	if (!filter.test(name) || /Trigger$/.test(name)) continue;
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
		const node = nodeOf(type, version);
		if (!node || sources.entry(type, version) === undefined) continue;
		for (const usual of operations(node)) {
			for (const start of [usual, ...otherAuthentications(node, version, usual)]) {
				const other = start !== usual;
				if (!other) tried++;
				const parameters = required(node, version, start);
				const credential = credentialOf(node, resolve(node, version, parameters));
				const weight = weightOf(type, parameters);
				const instance = { type, version, parameters };
				const fields = credential
					? {
							[credential]: publicCredential(registry.get(credential), fakeCredential(credential)),
						}
					: {};
				const compiled = compileForCheck(sources, instance, fields);
				if (other && 'errors' in compiled) continue;
				const light = other && !('errors' in compiled) && compiled.mints.length === 0;
				if (other && !light) mintedTried++;
				if ('errors' in compiled) {
					const blockers = new Map<string, string>();
					for (const error of compiled.errors.slice(0, ALL_BLOCKERS ? MAX_BLOCKERS : 1)) {
						const reason = error.slice(error.indexOf(': ') + 2);
						if (!blockers.has(keyOf(reason))) blockers.set(keyOf(reason), reason);
					}
					for (const reason of blockers.values()) why(reason, weight, blockers.size === 1);
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
				const plain = { ok: true, id: 'r1', result: { id: 'r1' }, data: [{ id: 'r1' }] };
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
						if (!light) why(`v1: ${difference}`, weight);
						continue;
					}
					const first = readsFiles ? FILE_ITEMS[0] : {};
					const several = (count: number) =>
						Array.from({ length: count }, (_, k) => ({ ...first, position: k + 1 }));
					const three = make('three items', parameters, ok, several(3));
					const withThree = await differenceFromV1(three, sources, registry, checking);
					if (withThree !== undefined) {
						if (!light) why(`v1: three items: ${withThree}`, weight);
						continue;
					}
					if (light) {
						const usualKey = verifiedKey(type, version, compiled.resolved);
						const usualNames = verified[usualKey];
						if (usualNames === undefined) continue;
						const flagKey =
							compiled.flags.length > 0
								? flagKeyOf(make('ok', parameters, ok), compiled.flags, registry)
								: undefined;
						verified[usualKey] = [
							...new Set([
								...usualNames,
								...compiled.changed,
								...(flagKey === undefined ? [] : [flagKey]),
							]),
						].sort();
						add(expressions, { 'other authentication': 1 });
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
						const once = costOfCase(three, sources, registry);
						const each = costOfCase(three, sources, registry, true);
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
					const settled = names === compiled.changed ? parameters : more;
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
					const variants = parameterVariants(node, version, settled, start, names);
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
					const usualNames = names;
					if (combined) names = [...new Set([...names, ...added])];
					const ownKey = verifiedKey(type, version, compiled.resolved);
					if (!other)
						aloneNames.set(
							ownKey,
							names.filter((name) => !usualNames.includes(name)),
						);
					const onlyUsual = (name: string) =>
						other && !names.includes(name) && aloneNames.get(ownKey)?.includes(name) === true;
					const variantForms = combined ? agreed.filter((variant) => variant.form) : [];
					if (!other) {
						add(expressions, {
							'alone tried': variants.length,
							'alone proven': combined ? agreed.length : 0,
							...(combined ? {} : { 'alone together differs': 1 }),
						});
					}
					const key = verifiedKey(type, version, compiled.resolved);
					const before = other ? verified[key] : undefined;
					if (
						before?.some(
							(name) => !name.startsWith('@') && !names.includes(name) && !onlyUsual(name),
						)
					) {
						why('v1: the other authentication agrees with v1 for fewer parameters', weight);
						continue;
					}
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
						const once = costOfCase(measured, sources, registry, false, 'once');
						const each = costOfCase(measured, sources, registry, false, 'item');
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
					const widerAgrees = settled === more;
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
							const once = costOfCase(measured, sources, registry);
							const each = costOfCase(measured, sources, registry, true);
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
					if (failingForm && !other) expressions.failing = (expressions.failing ?? 0) + 1;
					const sameForm = (mode: ErrorMode) =>
						before === undefined ||
						(before.includes(oneCallCondition(mode)) === proven.includes(oneCallCondition(mode)) &&
							(mode !== 'continueErrorOutput' ||
								before.includes(ERROR_ITEMS_BY_POSITION) ===
									proven.includes(ERROR_ITEMS_BY_POSITION)));
					const keptModes = CONTINUE_MODES.filter(
						(mode) =>
							sameForm(mode) &&
							errorModeCondition(mode).every(
								(m) => proven.includes(m) && (before === undefined || before.includes(m)),
							),
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
					].filter((condition) => before === undefined || before.includes(condition));
					const isMode = (name: string) =>
						name.startsWith(ITEM_PARAMETER_PREFIX) ||
						name.startsWith(ONE_CALL_PREFIX) ||
						name === PAIRED_ITEMS ||
						name.startsWith(ITEM_ERROR) ||
						name.startsWith('@onError=') ||
						name === ERROR_ITEMS_BY_POSITION ||
						name === CALL_FOR_EACH_ITEM;
					const modes = proven.filter(ofKeptMode);
					verified[key] = [
						...new Set([
							...(before ?? []).filter((name) => !isMode(name) && !onlyUsual(name)),
							...names,
							...flagKeys,
							...modes,
							...eachConditions,
							...(pairedReason === undefined &&
							(before === undefined || before.includes(PAIRED_ITEMS))
								? [PAIRED_ITEMS]
								: []),
							...(eachItem === undefined &&
							(before === undefined || before.includes(CALL_FOR_EACH_ITEM))
								? [CALL_FOR_EACH_ITEM]
								: []),
						]),
					].sort();
					if (MEASURE_COST && !other) {
						const cost = costOfCase(make('ok', parameters, ok), sources, registry);
						if (cost) costs[key] = cost;
					}
					if (compiled.mints.length > 0) mintedVerified++;
				} catch (error) {
					why(`check failed: ${error instanceof Error ? error.message : String(error)}`, weight);
				}
			}
		}
	}
}
await disposeRecorder();
if (one !== undefined) {
	const line = `RESULT ${JSON.stringify({ verified, reasons, modeReasons, manyItems, manyItemReasons, threeItemCost, expressionCost, continueCost, pairedReasons, failureReasons, widerReasons, aloneReasons, expressions, expressionReasons, alone, weighted, tried, compiled: compiledCount, examples, mintedTried, mintedVerified, costs })}\n`;
	await new Promise((written) => process.stdout.write(line, written));
	process.exit(0);
}

const lines = Object.keys(verified)
	.sort()
	.map((key) => `\t${JSON.stringify(key)}: ${JSON.stringify(verified[key])},`);
if (pattern === undefined && !DIST) {
	writeFileSync(
		join(here, '../src/node-compile/verified.generated.ts'),
		`export const VERIFIED: Record<string, string[]> = {
${lines.join('\n')}
};
`,
	);
}
const costKeys = Object.keys(costs).sort();
const higher = costKeys.filter((key) => COST[key] !== undefined && costs[key].ops > COST[key][0]);
const risen = higher.filter((key) => !acceptedRises.has(key));
const acceptedNow = higher.filter((key) => acceptedRises.has(key));
const idleAccepts = [...acceptedRises].filter((key) => !higher.includes(key));
const recordOf = (key: string): [number, number] =>
	risen.includes(key) ? COST[key] : [costs[key].ops, costs[key].allocations];
if (pattern === undefined && !DIST) {
	writeFileSync(
		join(here, '../src/node-compile/cost.generated.ts'),
		`export const COST: Record<string, [ops: number, allocations: number]> = {
${costKeys.map((key) => `\t${JSON.stringify(key)}: [${recordOf(key).join(', ')}],`).join('\n')}
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
const nodeOfKey = (key: string) => key.slice(PREFIX.length, key.indexOf('@'));
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
	for (const key of idleAccepts)
		console.log(`${ACCEPT_RISE} ${key}: this operation did not rise or was not measured`);
	console.log(
		risen.length === 0
			? `cost check: no operation of ${costKeys.length} costs more ops than its record`
			: `cost check: ${risen.length} operation(s) cost more ops than their record; lower the cost, or give \`${ACCEPT_RISE} <key>\` for a rise that correctness needs`,
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

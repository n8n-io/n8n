/**
 * Compares the `inject` that this tool derives for a credential type (spec
 * section 7) with what n8n v1 does to the same request: it runs the real
 * `authenticate` of the n8n credential type, and applies the derived inject
 * as the runtime does. `scripts/credential-audit.ts` writes the result to
 * `docs/credential-audit.md`.
 */
import { fillTemplate } from './expression.ts';
import type { Inject, InjectKind } from './inject.ts';
import { deriveInject } from './inject.ts';
import type {
	CredentialTypeInfo,
	CredentialTypeRegistry,
	GenericAuthenticate,
	LoadedCredentialType,
} from './types.ts';
import { loadCredentialClasses, parentTypes, registryOf } from './types.ts';

/** What a credential adds to a request. Both sides use this shape. */
export interface AuditedRequest {
	/** Header lines, with the case of the name that sets them. */
	headers: Record<string, string>;
	/** Query parameters. */
	qs: Record<string, string>;
	/** Fields that the credential adds to a JSON object body, as JSON text. */
	body: Record<string, string>;
	/** A body that is not a JSON object, as text. */
	bodyText?: string;
}

/** The request that both sides get: no headers, no query, a GET. */
export function emptyRequest(): AuditedRequest {
	return { headers: {}, qs: {}, body: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function lower(name: string): string {
	return name.toLowerCase();
}

function base64(text: string): string {
	return Buffer.from(text, 'utf8').toString('base64');
}

/** Set a header, replacing a header of the same name in another case. */
function setHeader(headers: Record<string, string>, name: string, value: string): void {
	for (const key of Object.keys(headers)) {
		if (lower(key) === lower(name)) delete headers[key];
	}
	headers[name] = value;
}

/** True when `headers` has a header named `name`, ignoring case. */
function hasHeader(headers: Record<string, string>, name: string): boolean {
	return Object.keys(headers).some((key) => lower(key) === lower(name));
}

function fill(template: string, data: Record<string, unknown>): string {
	const value = fillTemplate(template, data);
	if (value === undefined) throw new Error(`the credential data has no value at "${template}"`);
	return value;
}

/**
 * Applies an `inject` to a request as the runtime does (spec section 7):
 * `headers` win over a header of the same name in another case,
 * `defaultHeaders` apply only when the request has none of that name,
 * `qs` set query parameters, `basicAuth` sets the `Authorization` header and
 * `body` adds fields to a JSON object body.
 */
export function applyInject(
	inject: Inject | undefined,
	data: Record<string, unknown>,
	request: AuditedRequest = emptyRequest(),
): AuditedRequest {
	const out: AuditedRequest = {
		headers: { ...request.headers },
		qs: { ...request.qs },
		body: { ...request.body },
		...(request.bodyText === undefined ? {} : { bodyText: request.bodyText }),
	};
	if (!inject) return out;
	for (const [name, value] of Object.entries(inject.headers ?? {})) {
		setHeader(out.headers, name, fill(value, data));
	}
	for (const [name, value] of Object.entries(inject.defaultHeaders ?? {})) {
		if (hasHeader(out.headers, name)) continue;
		setHeader(out.headers, name, fill(value, data));
	}
	for (const [name, value] of Object.entries(inject.qs ?? {})) {
		out.qs[name] = fill(value, data);
	}
	if (inject.basicAuth) {
		const user = fill(inject.basicAuth.user, data);
		const password = fill(inject.basicAuth.password, data);
		setHeader(out.headers, 'Authorization', `Basic ${base64(`${user}:${password}`)}`);
	}
	for (const [name, value] of Object.entries(inject.body ?? {})) {
		out.body[name] = JSON.stringify(fill(value, data));
	}
	return out;
}

// ---- the v1 side ------------------------------------------------------------

/** Evaluates the code of one n8n expression, which uses `$credentials`. */
function evaluate(code: string, data: Record<string, unknown>): unknown {
	// n8n evaluates expressions as JavaScript. This is what makes the audit an
	// oracle: the expression runs as n8n runs it. V8 compiles and caches the
	// code, so the many small expressions of the audit are cheap.
	// oxlint-disable-next-line typescript/no-implied-eval
	const fn: unknown = new Function('$credentials', `"use strict"; return (${code});`);
	if (typeof fn !== 'function') throw new Error(`the expression "${code}" is not valid JavaScript`);
	const value: unknown = Reflect.apply(fn, undefined, [data]);
	return value;
}

/**
 * Resolves one value of a generic `authenticate` as n8n-core does: text with
 * no leading `=` is a literal, and `{{ ... }}` parts of an expression are
 * evaluated with `$credentials`.
 */
function resolveValue(value: unknown, data: Record<string, unknown>): unknown {
	if (typeof value !== 'string' || !value.startsWith('=')) return value;
	const expression = value.slice(1);
	// A lone "{{ ... }}" keeps the type of the value; text around it joins.
	const lone = /^\s*\{\{([\s\S]*)\}\}\s*$/.exec(expression);
	if (lone?.[1] !== undefined) return evaluate(lone[1], data);
	let out = '';
	let rest = expression;
	while (rest.length > 0) {
		const start = rest.indexOf('{{');
		if (start < 0) {
			out += rest;
			break;
		}
		const end = rest.indexOf('}}', start + 2);
		if (end < 0) throw new Error(`the expression "${value}" has no closing "}}"`);
		out += rest.slice(0, start);
		out += String(evaluate(rest.slice(start + 2, end), data));
		rest = rest.slice(end + 2);
	}
	return out;
}

/** Applies a generic `authenticate` as n8n-core's `CredentialsHelper` does. */
function applyGeneric(auth: GenericAuthenticate, data: Record<string, unknown>): AuditedRequest {
	const out = emptyRequest();
	// n8n sets `requestOptions.auth = { username, password }`; the request
	// library writes the Basic header from it.
	const basic: Record<string, string> = {};
	for (const [outerKey, entries] of Object.entries(auth.properties)) {
		if (!isRecord(entries)) continue;
		for (const [key, value] of Object.entries(entries)) {
			const name = String(resolveValue(key, data));
			const resolved = resolveValue(value, data);
			if (outerKey === 'auth') basic[name] = String(resolved);
			else if (outerKey === 'headers') setHeader(out.headers, name, String(resolved));
			else if (outerKey === 'qs') out.qs[name] = String(resolved);
			else if (outerKey === 'body') out.body[name] = JSON.stringify(resolved);
		}
	}
	if (Object.keys(basic).length > 0) {
		setHeader(
			out.headers,
			'Authorization',
			`Basic ${base64(`${basic.username ?? ''}:${basic.password ?? ''}`)}`,
		);
	}
	return out;
}

/** The options that the v1 code gives to `authenticate`. */
interface V1Options {
	url: string;
	method: string;
	headers: Record<string, unknown>;
	qs: Record<string, unknown>;
	body?: unknown;
	auth?: unknown;
}

/** The text of a header or query value, as the request library writes it. */
function text(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(value) ?? '';
}

/** Reads what a v1 `authenticate` did to the request options. */
function normalizeOptions(options: V1Options): AuditedRequest {
	const out = emptyRequest();
	for (const [name, value] of Object.entries(options.headers ?? {})) {
		if (value === undefined || value === null) continue;
		setHeader(out.headers, name, text(value));
	}
	for (const [name, value] of Object.entries(options.qs ?? {})) {
		if (value === undefined || value === null) continue;
		out.qs[name] = text(value);
	}
	if (isRecord(options.auth)) {
		const user = text(options.auth.username ?? '');
		const password = text(options.auth.password ?? '');
		setHeader(out.headers, 'Authorization', `Basic ${base64(`${user}:${password}`)}`);
	}
	const body = options.body;
	if (body !== undefined && body !== null) {
		if (isRecord(body)) {
			for (const [name, value] of Object.entries(body)) out.body[name] = JSON.stringify(value);
		} else {
			out.bodyText = typeof body === 'string' ? body : JSON.stringify(body);
		}
	}
	return out;
}

/**
 * Runs the real `authenticate` of a credential type, or applies a generic
 * `authenticate` as n8n-core does. Throws with a reason when v1 needs a
 * request first (`preAuthentication`) or when its code fails.
 */
async function v1Request(
	instance: unknown,
	info: CredentialTypeInfo,
	data: Record<string, unknown>,
): Promise<AuditedRequest> {
	// n8n calls the `authenticate` of the credential type instance.
	const auth: unknown =
		typeof instance === 'object' && instance !== null
			? Reflect.get(instance, 'authenticate')
			: undefined;
	if (typeof auth === 'function') {
		const options: V1Options = {
			url: 'https://example.test/x',
			method: 'GET',
			headers: {},
			qs: {},
		};
		const returned: unknown = await Reflect.apply(auth, instance, [data, options]);
		const done = isRecord(returned) ? returned : options;
		return normalizeOptions({
			url: 'https://example.test/x',
			method: 'GET',
			headers: isRecord(done.headers) ? done.headers : {},
			qs: isRecord(done.qs) ? done.qs : {},
			body: done.body,
			auth: done.auth,
		});
	}
	if (info.authenticate === 'function')
		throw new Error('the instance has no authenticate function');
	if (info.authenticate === undefined) return emptyRequest();
	return applyGeneric(info.authenticate, data);
}

// ---- the comparison ---------------------------------------------------------

/** Every difference between an inject request and the v1 request. */
export function compareRequests(ours: AuditedRequest, v1: AuditedRequest, values = true): string[] {
	const diffs: string[] = [];
	const set = (what: string, name: string, a: string | undefined, b: string | undefined) => {
		if (a !== undefined && b === undefined) {
			diffs.push(
				values
					? `${what} "${name}": v1 sets "${a}", the inject sets none`
					: `${what} "${name}": v1 sets it, the inject does not`,
			);
		} else if (a === undefined && b !== undefined) {
			diffs.push(
				values
					? `${what} "${name}": the inject sets "${b}", v1 sets none`
					: `${what} "${name}": the inject sets it, v1 does not`,
			);
		} else if (a !== b) {
			diffs.push(
				values
					? `${what} "${name}": v1 sets "${a}", the inject sets "${b}"`
					: `${what} "${name}": the values differ`,
			);
		}
	};
	const v1Headers = new Map(Object.entries(v1.headers).map(([n, v]) => [lower(n), { n, v }]));
	const mineHeaders = new Map(Object.entries(ours.headers).map(([n, v]) => [lower(n), { n, v }]));
	for (const key of new Set([...v1Headers.keys(), ...mineHeaders.keys()])) {
		const a = v1Headers.get(key);
		const b = mineHeaders.get(key);
		set('header', a?.n ?? b?.n ?? key, a?.v, b?.v);
	}
	for (const key of new Set([...Object.keys(v1.qs), ...Object.keys(ours.qs)])) {
		set('query', key, v1.qs[key], ours.qs[key]);
	}
	for (const key of new Set([...Object.keys(v1.body), ...Object.keys(ours.body)])) {
		set('body field', key, v1.body[key], ours.body[key]);
	}
	if (v1.bodyText !== ours.bodyText) {
		diffs.push(
			values
				? `body text: v1 sets ${JSON.stringify(v1.bodyText)}, the inject sets ${JSON.stringify(ours.bodyText)}`
				: 'body text: the values differ',
		);
	}
	return diffs;
}

// ---- the audit --------------------------------------------------------------

/** One credential data set that the audit gives to both sides. */
export interface DataVariant {
	name: string;
	data: Record<string, unknown>;
}

function fakeValue(property: Record<string, unknown>): unknown {
	const name = typeof property.name === 'string' ? property.name : 'value';
	const type = property.type;
	if (type === 'boolean') return property.default === true;
	if (type === 'number') return typeof property.default === 'number' ? property.default : 1;
	if (type === 'json' || type === 'fixedCollection' || type === 'collection') return {};
	if (type === 'options' || type === 'multiOptions') return property.default ?? [];
	const value = property.default;
	if (typeof value === 'string' && value !== '' && !value.startsWith('=')) return value;
	return `test-${name}`;
}

/** The credential data sets that the audit gives to both sides. */
export function dataVariants(info: CredentialTypeInfo, instance: unknown): DataVariant[] {
	const properties: unknown = isRecord(instance) ? Reflect.get(instance, 'properties') : undefined;
	const defaults: Record<string, unknown> = { ...info.defaults };
	const filled: Record<string, unknown> = {};
	const toggled: Record<string, unknown> = {};
	if (Array.isArray(properties)) {
		for (const property of properties) {
			if (!isRecord(property) || typeof property.name !== 'string') continue;
			const name = property.name;
			filled[name] = fakeValue(property);
			toggled[name] = property.type === 'boolean' ? property.default !== true : filled[name];
		}
	}
	return [
		{ name: 'defaults', data: defaults },
		{ name: 'filled', data: filled },
		{ name: 'toggled', data: toggled },
	];
}

/** The result of the audit for one credential type. */
export interface AuditEntry {
	type: string;
	kind: InjectKind;
	/** Every difference, from the variant that showed it first. */
	differences: string[];
	/** Why the tool does not convert the type. */
	reasons: string[];
	/** The data variant of the differences. */
	variant?: string;
	/** Why the audit did not compare this type. */
	skipped?: string;
}

/** True when the inject kind is one that the runtime applies. */
function isApplied(kind: InjectKind): boolean {
	return kind === 'generic' || kind === 'oauth2' || kind === 'manual';
}

/**
 * The types whose inject differs from v1 and that stay different, with the
 * reason. The unit test allows these and no other difference.
 */
export const KNOWN_DIFFERENCES: Readonly<Record<string, string>> = {
	openAiApi:
		'v1 sends `OpenAI-Organization` as an empty header when the field is empty. The empty header carries no data, so the rule leaves it out.',
	recordedFutureApi:
		'`RecordedFutureApi.authenticate` reads `$credentials.accessToken`, but the type has a field `apiKey`. v1 sends no header; the rule cannot read a field that does not exist. The fix is in the credential type of n8n-nodes-base.',
};

/**
 * Audits one credential type. The audit compares the derived inject with v1
 * for each data variant. A type that v1 needs a request first for, or whose
 * code fails on the fake data, has a `skipped` reason.
 */
export async function auditCredential(
	registry: CredentialTypeRegistry,
	loaded: LoadedCredentialType,
): Promise<AuditEntry> {
	const { info, instance } = loaded;
	const derived = deriveInject(registry, info.name);
	const parents = parentTypes(registry, info.name);
	const entry: AuditEntry = {
		type: info.name,
		kind: derived.kind,
		differences: [],
		reasons: derived.reasons,
	};
	if (derived.kind === 'none') {
		entry.skipped = 'no authenticate: the node code applies the credential';
		return entry;
	}
	if (derived.kind === 'oauth2') {
		entry.skipped = 'v1 signs it with requestOAuth2, not with authenticate';
		return entry;
	}
	if (info.authenticate === undefined) {
		// The HTTP Request node applies these generic types (`httpBasicAuth`,
		// `httpQueryAuth`, `httpCustomAuth`) in its own code.
		entry.skipped = 'no authenticate: the node code applies the credential';
		return entry;
	}
	if (parents.includes('oAuth1Api') || info.name === 'oAuth1Api') {
		entry.skipped = 'OAuth1 signs each request';
		return entry;
	}
	if (info.preAuthentication) {
		entry.skipped = 'preAuthentication: v1 gets a token with a request first';
		return entry;
	}
	const errors: string[] = [];
	for (const variant of dataVariants(info, instance)) {
		const local = deriveInject(registry, info.name, variant.data);
		let v1: AuditedRequest;
		try {
			v1 = await v1Request(instance, info, variant.data);
		} catch (error) {
			errors.push(`${variant.name}: ${error instanceof Error ? error.message : String(error)}`);
			continue;
		}
		let ours: AuditedRequest;
		try {
			ours = applyInject(local.inject, variant.data);
		} catch (error) {
			const reason = `the inject fails: ${error instanceof Error ? error.message : String(error)}`;
			if (!entry.differences.includes(reason)) {
				entry.differences.push(reason);
				entry.variant ??= variant.name;
			}
			continue;
		}
		// A difference matters most for a type that the runtime applies. For the
		// other types, names are enough: a signed value changes with the clock.
		const diffs = compareRequests(ours, v1, isApplied(derived.kind));
		if (diffs.length > 0) {
			entry.differences.push(...diffs.filter((d) => !entry.differences.includes(d)));
			entry.variant ??= variant.name;
		}
	}
	if (entry.differences.length === 0 && errors.length > 0) {
		entry.skipped = `v1 failed on the fake data (${errors.join('; ')})`;
	}
	return entry;
}

export interface AuditResult {
	entries: AuditEntry[];
	/** Credential types that the node packages failed to load. */
	failures: Array<{ name: string; error: string }>;
	/** Types whose inject the runtime applies and that differ from v1. */
	appliedDiffs: AuditEntry[];
	/** Types that are not injectable and differ from v1. */
	fallbackDiffs: AuditEntry[];
}

/** Audits every credential type of the built node packages. */
export async function auditAll(packageDirs?: string[]): Promise<AuditResult> {
	const { types, failures } = loadCredentialClasses(packageDirs);
	const registry = registryOf(types.map((t) => t.info));
	const entries: AuditEntry[] = [];
	for (const loaded of types) entries.push(await auditCredential(registry, loaded));
	const differs = entries.filter((e) => e.differences.length > 0);
	return {
		entries,
		failures,
		appliedDiffs: differs.filter((e) => isApplied(e.kind)),
		fallbackDiffs: differs.filter((e) => !isApplied(e.kind)),
	};
}

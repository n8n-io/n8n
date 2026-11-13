import { ALWAYS_SENSITIVE_HEADERS } from '@n8n/utils/redaction/sensitive-headers';
import { isSensitiveKey } from '@n8n/utils/redaction/sensitive-key';
import { isRecord } from '@n8n/utils/is-record';
import type { ICredentialsHelper } from 'n8n-workflow';

import type { OutboundRequest } from './tool-simulation.contracts';

const PLACEHOLDER = '[REDACTED]';
// Shorter values would match ordinary text; erring long only blurs the simulated reply.
const MIN_SECRET_LENGTH = 4;
// A value under a name that does not look secret is still a secret in generic credentials
// (`httpHeaderAuth.value`, `httpQueryAuth.value`). Those are collected from this length on.
const MIN_UNNAMED_SECRET_LENGTH = 8;
// Credential fields that name the service rather than unlock it. The simulator needs them to
// recognise the request, so they stay. Everything else in a credential counts as secret.
const NON_SECRET_CREDENTIAL_KEYS: ReadonlySet<string> = new Set([
	'name',
	'authentication',
	'sendin',
	'granttype',
	'tokentype',
	'token_type',
	'scope',
	'version',
	'apiversion',
]);
const NON_SECRET_CREDENTIAL_KEY_PATTERN =
	/(url|uri|host|hostname|domain|subdomain|server|endpoint|region|environment|alloweddomains|allowedhttprequestdomains)$/i;
const SENSITIVE_HEADERS = new Set(ALWAYS_SENSITIVE_HEADERS);

/**
 * Keeps real credentials out of requests sent to a simulation backend. It records the values
 * that tools decrypt, except the service address and settings, and removes them wherever a node
 * put them (headers, URL path, query, body). Nodes that apply generic auth themselves put the
 * secret under a header or query name that need not look secret, so names are not trusted.
 */
export class OutboundRedactor {
	private readonly secrets = new Set<string>();

	/** Wraps a credentials helper so every decrypted secret is recorded. */
	wrap(helper: ICredentialsHelper): ICredentialsHelper {
		return new Proxy(helper, {
			get: (target, property, receiver) => {
				const value: unknown = Reflect.get(target, property, receiver);
				if (property !== 'getDecrypted' || typeof value !== 'function') {
					return typeof value === 'function' ? value.bind(target) : value;
				}
				return async (...args: unknown[]) => {
					const decrypted: unknown = await Reflect.apply(value, target, args);
					this.collect(decrypted);
					return decrypted;
				};
			},
		});
	}

	redact(request: OutboundRequest): OutboundRequest {
		const headers: Record<string, string> = {};
		for (const [name, value] of Object.entries(request.headers ?? {})) {
			if (SENSITIVE_HEADERS.has(name.toLowerCase()) || isSensitiveKey(name)) continue;
			headers[name] = this.scrub(value);
		}
		return {
			...request,
			url: this.redactUrl(request.url),
			headers,
			...(request.body === undefined ? {} : { body: this.redactValue(request.body) }),
		};
	}

	private collect(value: unknown, key?: string): void {
		if (typeof value === 'string') {
			this.collectString(value, key);
			return;
		}
		if (Array.isArray(value)) {
			for (const item of value) this.collect(item, key);
		} else if (isRecord(value)) {
			for (const [childKey, child] of Object.entries(value)) this.collect(child, childKey);
		}
	}

	private collectString(value: string, key: string | undefined): void {
		if (key && isSensitiveKey(key)) {
			if (value.length >= MIN_SECRET_LENGTH) this.secrets.add(value);
			return;
		}
		if (key && isNonSecretCredentialKey(key)) return;
		// `httpCustomAuth.json` holds the headers and query values as a JSON string.
		const parsed = parseJsonObject(value);
		if (parsed !== undefined) {
			this.collect(parsed);
			return;
		}
		if (value.length >= MIN_UNNAMED_SECRET_LENGTH && !/\s/.test(value)) this.secrets.add(value);
	}

	private redactUrl(url: string): string {
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			return this.scrub(url);
		}
		parsed.username = '';
		parsed.password = '';
		for (const name of [...parsed.searchParams.keys()]) {
			if (isSensitiveKey(name)) parsed.searchParams.set(name, PLACEHOLDER);
		}
		return this.scrub(parsed.toString());
	}

	private redactValue(value: unknown, key?: string): unknown {
		if (key && isSensitiveKey(key)) return PLACEHOLDER;
		if (typeof value === 'string') return this.scrub(value);
		if (Array.isArray(value)) return value.map((item) => this.redactValue(item));
		// Uploads and streams are not JSON: walking them would turn bytes into numbered keys.
		if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
			return `[binary body, ${value.byteLength} bytes]`;
		}
		if (value instanceof URLSearchParams) return this.scrub(value.toString());
		if (isRecord(value) && !isPlainObject(value)) {
			return `[${value.constructor?.name ?? 'non-JSON'} body]`;
		}
		if (isRecord(value)) {
			return Object.fromEntries(
				Object.entries(value).map(([childKey, child]) => [
					childKey,
					this.redactValue(child, childKey),
				]),
			);
		}
		return value;
	}

	private scrub(text: string): string {
		let out = text;
		for (const secret of this.secrets) {
			// Raw, URL-encoded, and form-encoded (spaces as `+`, as URLSearchParams writes them).
			const formEncoded = new URLSearchParams({ v: secret }).toString().slice(2);
			for (const form of new Set([secret, encodeURIComponent(secret), formEncoded])) {
				out = out.split(form).join(PLACEHOLDER);
			}
		}
		return out;
	}
}

function isNonSecretCredentialKey(key: string): boolean {
	return (
		NON_SECRET_CREDENTIAL_KEYS.has(key.toLowerCase()) || NON_SECRET_CREDENTIAL_KEY_PATTERN.test(key)
	);
}

function parseJsonObject(text: string): unknown {
	const trimmed = text.trim();
	if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;
	try {
		const parsed: unknown = JSON.parse(trimmed);
		return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
	} catch {
		return undefined;
	}
}

const REDACTED_MCP_URL = '[REDACTED MCP URL]';

/**
 * An MCP server URL with its user info and every query value removed. MCP servers that take
 * a key in the URL use any parameter name (`?key=`, `?apiKey=`), and their credential is never
 * decrypted where the redactor sees it. The path stays, so the simulator can tell servers apart.
 */
export function redactMcpUrl(url: string): string {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		// Without a parsed URL its user info cannot be told apart, so nothing of it is kept.
		return REDACTED_MCP_URL;
	}
	// Other schemes (`user:pw@host`) parse as opaque URLs that keep their user info.
	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return REDACTED_MCP_URL;
	parsed.username = '';
	parsed.password = '';
	for (const name of new Set(parsed.searchParams.keys()))
		parsed.searchParams.set(name, PLACEHOLDER);
	return parsed.toString();
}

function isPlainObject(value: object): boolean {
	const prototype: unknown = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

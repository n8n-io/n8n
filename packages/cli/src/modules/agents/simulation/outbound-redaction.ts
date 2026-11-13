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
// Path segments of a credential URL this long are tokens, not route words.
const MIN_URL_TOKEN_LENGTH = 16;
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
// Where generic header and query auth keep the secret, whatever it looks like.
const GENERIC_AUTH_SECRET_KEYS: ReadonlySet<string> = new Set(['value']);
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

	/** `known` marks values that are secret whatever their key: generic auth values and JSON. */
	private collect(value: unknown, key?: string, known = false): void {
		if (typeof value === 'string') {
			this.collectString(value, key, known);
			return;
		}
		// A numeric secret (a PIN in custom auth JSON) goes out as its string form.
		if (typeof value === 'number' || typeof value === 'bigint') {
			if (
				known ||
				(key !== undefined && (isSensitiveKey(key) || GENERIC_AUTH_SECRET_KEYS.has(key)))
			) {
				const text = String(value);
				if (text.length >= MIN_SECRET_LENGTH) this.secrets.add(text);
			}
			return;
		}
		if (Array.isArray(value)) {
			for (const item of value) this.collect(item, key, known);
		} else if (isRecord(value)) {
			for (const [childKey, child] of Object.entries(value)) this.collect(child, childKey, known);
		}
	}

	private collectString(value: string, key: string | undefined, known: boolean): void {
		const secret =
			known || (key !== undefined && (isSensitiveKey(key) || GENERIC_AUTH_SECRET_KEYS.has(key)));
		if (secret) {
			if (value.length >= MIN_SECRET_LENGTH) this.secrets.add(value);
			return;
		}
		if (key && isNonSecretCredentialKey(key)) {
			this.collectUrlSecrets(value);
			return;
		}
		// `httpCustomAuth.json` holds the headers and query values as a JSON string: all secret.
		const parsed = parseJsonObject(value);
		if (parsed !== undefined) {
			this.collect(parsed, undefined, true);
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

	/**
	 * A service address stays, but a URL can carry its credential: a webhook URL's path
	 * (`/services/T/B/<token>`) or a query value. Long path segments and query values count.
	 */
	private collectUrlSecrets(value: string): void {
		let parsed: URL;
		try {
			parsed = new URL(value);
		} catch {
			return;
		}
		for (const segment of parsed.pathname.split('/')) {
			if (segment.length >= MIN_URL_TOKEN_LENGTH) this.secrets.add(safeDecode(segment));
		}
		for (const queryValue of parsed.searchParams.values()) {
			if (queryValue.length >= MIN_SECRET_LENGTH) this.secrets.add(queryValue);
		}
		if (parsed.password.length >= MIN_SECRET_LENGTH) {
			this.secrets.add(safeDecode(parsed.password));
		}
	}

	private redactValue(value: unknown, key?: string): unknown {
		if (key && isSensitiveKey(key)) return PLACEHOLDER;
		if (typeof value === 'string') return this.scrub(value);
		// A numeric secret (a PIN) sent as a JSON number.
		if (
			(typeof value === 'number' || typeof value === 'bigint') &&
			this.secrets.has(String(value))
		) {
			return PLACEHOLDER;
		}
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
			// Raw, URL-encoded, form-encoded (spaces as `+`), and JSON-escaped inside a JSON string.
			const formEncoded = new URLSearchParams({ v: secret }).toString().slice(2);
			const jsonEscaped = JSON.stringify(secret).slice(1, -1);
			for (const form of new Set([secret, encodeURIComponent(secret), formEncoded, jsonEscaped])) {
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

// Path segments that are plain structure. Anything else, such as the token in
// `/api/mcp/s/<token>/mcp`, may be a credential, however word-like it looks.
const STRUCTURAL_MCP_PATH_SEGMENTS: ReadonlySet<string> = new Set([
	'api',
	'mcp',
	'sse',
	'stream',
	'streamable',
	'http',
	'message',
	'messages',
	'rpc',
	'jsonrpc',
	'server',
	'servers',
	'remote',
	'public',
]);
const SHORT_MCP_PATH_SEGMENT = /^(?:[a-z]|v\d{1,2})$/;

/** Structural words, single letters, versions, and labels of the URL's own host stay. */
function isSafeMcpPathSegment(segment: string, hostLabels: ReadonlySet<string>): boolean {
	const lower = segment.toLowerCase();
	return (
		STRUCTURAL_MCP_PATH_SEGMENTS.has(lower) ||
		SHORT_MCP_PATH_SEGMENT.test(lower) ||
		hostLabels.has(lower)
	);
}

/**
 * An MCP server URL with its user info, fragment, query and every path segment that is not
 * plain structure removed. MCP servers take a key in the query (`?key=`, `?apiKey=`)
 * or the path (`/s/<token>/mcp`), and their credential is never decrypted where the redactor
 * sees it. The host and plain segments stay, so the simulator can tell servers apart.
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
	parsed.hash = '';
	// The whole query goes: a parameter name can be the token too (`?secret-access-token`).
	parsed.search = '';
	const hostLabels = new Set(parsed.hostname.toLowerCase().split('.'));
	parsed.pathname = parsed.pathname
		.split('/')
		.map((segment) =>
			segment === '' || isSafeMcpPathSegment(segment, hostLabels) ? segment : PLACEHOLDER,
		)
		.join('/');
	return parsed.toString();
}

function isPlainObject(value: object): boolean {
	const prototype: unknown = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

/**
 * The URL the simulator sees for each MCP server, by server name. Servers whose redacted URLs
 * are the same (one endpoint, two keys) get the server name added, so their requests stay apart.
 */
export function simulatorMcpUrls(
	servers: Array<{ name: string; url: string }>,
): Map<string, string> {
	const redacted = servers.map((server) => ({ ...server, redacted: redactMcpUrl(server.url) }));
	const counts = new Map<string, number>();
	for (const { redacted: url } of redacted) counts.set(url, (counts.get(url) ?? 0) + 1);
	return new Map(
		redacted.map(({ name, redacted: url }) => [
			name,
			(counts.get(url) ?? 0) > 1 ? withServerName(url, name) : url,
		]),
	);
}

function withServerName(url: string, name: string): string {
	if (url === REDACTED_MCP_URL) return `mcp-server://${encodeURIComponent(name)}`;
	const parsed = new URL(url);
	parsed.searchParams.set('n8n_mcp_server', name);
	return parsed.toString();
}

function safeDecode(text: string): string {
	try {
		return decodeURIComponent(text);
	} catch {
		return text;
	}
}

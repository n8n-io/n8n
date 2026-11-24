import type { WorkflowNodeResponse } from '../../clients/n8n-client';
import type { BinaryCheck } from '../types';
import { HTTP_REQUEST_TOOL_TYPE, HTTP_REQUEST_TYPE, LANGCHAIN_HTTP_TOOL_TYPE } from '../utils';

const HTTP_NODE_TYPES = new Set<string>([
	HTTP_REQUEST_TYPE,
	HTTP_REQUEST_TOOL_TYPE,
	LANGCHAIN_HTTP_TOOL_TYPE,
]);

/** Placeholder marker produced by the SDK's `placeholder()` helper — the "ask the user at setup" shape. */
const PLACEHOLDER_RE = /<__PLACEHOLDER_VALUE__([\s\S]*?)__>/;
const PLACEHOLDER_GLOBAL_RE = /<__PLACEHOLDER_VALUE__([\s\S]*?)__>/g;

/** Parameter names that carry secret material wherever they appear. */
const SECRET_NAME_PATTERNS = [
	/api[_-]?key/i,
	/access[_-]?(?:key|token)/i,
	/auth[_-]?(?:key|token)/i,
	/bearer[_-]?token/i,
	/secret[_-]?key/i,
	/private[_-]?key/i,
	/client[_-]?secret/i,
	/subscription[_-]?key/i,
	/password/i,
	// Whole word only: `credentialId` references a credential, it doesn't hold one.
	/(^|[_-])credentials?([_-]|$)/i,
	/^token$/i,
	/^secret$/i,
	/^auth$/i,
];

/**
 * Bare `key`/`apikey` only read as secret in a query string, where `?key=` is a
 * real convention (Google). In a body they are overwhelmingly the key half of a
 * `{"key": …, "value": …}` pair, and in a header the `apikey` spelling is already
 * covered by SENSITIVE_HEADERS.
 */
const QUERY_ONLY_SECRET_NAME_PATTERNS = [/^key$/i, /^apikey$/i];

/**
 * Placeholder labels that read as secret material. Deliberately narrower than the
 * name patterns: a bare "Key" label is too weak a signal on its own (sort key,
 * partition key), so secret-ness must come from the surrounding word.
 */
const SECRET_LABEL_PATTERNS = [
	/api[\s_-]?(?:key|token)/i,
	/access[\s_-]?(?:key|token)/i,
	/auth(?:orization)?[\s_-]?(?:key|token)/i,
	/\bbearer\b/i,
	/\bsecret\b/i,
	/\bpassword\b/i,
	/\bcredentials?\b/i,
	/private[\s_-]?key/i,
	/subscription[\s_-]?key/i,
	/licen[cs]e[\s_-]?key/i,
	// Anchored like the name patterns: a bare "Token" label is a secret, but
	// "Page Token" is pagination state and "Sort Key" is not a secret at all.
	/^\s*token\s*$/i,
];

const SENSITIVE_HEADERS = new Set([
	'authorization',
	'x-api-key',
	'x-auth-token',
	'x-access-token',
	'api-key',
	'apikey',
]);

interface ParameterEntry {
	name?: string;
	value?: unknown;
}

/** The two node families store their entries under different keys. */
interface ParameterCollection {
	/** nodes-base HTTP Request / HTTP Request Tool */
	parameters?: ParameterEntry[];
	/** LangChain HTTP tool */
	values?: ParameterEntry[];
}

/** Where a parameter rides. Some name patterns only read as secret in one of them. */
type Location = 'query' | 'header' | 'body';

const LOCATION_LABEL: Record<Location, string> = {
	query: 'query param',
	header: 'header',
	body: 'body param',
};

const PARAMETER_COLLECTIONS = [
	{ field: 'queryParameters', location: 'query' },
	{ field: 'headerParameters', location: 'header' },
	{ field: 'bodyParameters', location: 'body' },
	{ field: 'parametersQuery', location: 'query' },
	{ field: 'parametersHeaders', location: 'header' },
	{ field: 'parametersBody', location: 'body' },
] as const satisfies ReadonlyArray<{ field: string; location: Location }>;

/**
 * `specifyQuery/Body/Headers: 'json'` replaces the keypair collection with one raw
 * JSON string, so the same secret hides in a string instead of an entry. Field names
 * are shared by both node families.
 */
const JSON_STRING_FIELDS = [
	{ field: 'jsonQuery', location: 'query' },
	{ field: 'jsonHeaders', location: 'header' },
	{ field: 'jsonBody', location: 'body' },
] as const satisfies ReadonlyArray<{ field: string; location: Location }>;

/** `"name": "value"` pairs. Regex, not JSON.parse — these strings are routinely
 *  n8n expressions (`={"k": "{{ $json.x }}"}`) that aren't valid JSON. */
const QUOTED_PAIR_RE = /"([^"\\]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;

function getPlaceholderLabel(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	return PLACEHOLDER_RE.exec(value)?.[1];
}

/**
 * A literal the user or agent typed. An expression — whether the whole value (`=…`)
 * or an interpolation inside a JSON string (`{{ … }}`) — resolves at runtime and so
 * isn't secret material stored in the workflow.
 */
function isLiteralValue(value: unknown): boolean {
	return (
		typeof value === 'string' && value.length > 0 && !value.startsWith('=') && !value.includes('{{')
	);
}

function hasAttachedCredential(node: WorkflowNodeResponse): boolean {
	return Object.keys(node.credentials ?? {}).length > 0;
}

function isSecretLabel(label: string): boolean {
	return SECRET_LABEL_PATTERNS.some((p) => p.test(label));
}

function isSecretName(name: string, location: Location): boolean {
	if (SECRET_NAME_PATTERNS.some((p) => p.test(name))) return true;
	if (location === 'query' && QUERY_ONLY_SECRET_NAME_PATTERNS.some((p) => p.test(name)))
		return true;
	return location === 'header' && SENSITIVE_HEADERS.has(name.toLowerCase());
}

/**
 * Two independent signals, either is enough:
 * - the placeholder label reads secret-like, whatever the parameter is called
 *   (the INS-633 shape: a "Google Custom Search API Key" placeholder in a param named `key`);
 * - the parameter name reads secret-like and the value is a literal or placeholder.
 *
 * `skipPlaceholders` mutes only the first signal. A hardcoded literal is a secret
 * sitting in the workflow JSON however the node authenticates, so that signal always
 * runs; an unfilled placeholder alongside an attached credential is merely vestigial.
 */
function findSecretReason(
	entry: ParameterEntry,
	location: Location,
	skipPlaceholders: boolean,
): string | undefined {
	const label = getPlaceholderLabel(entry.value);
	if (!skipPlaceholders && label !== undefined && isSecretLabel(label)) {
		return `asks the user to paste "${label.trim()}"`;
	}

	const name = typeof entry.name === 'string' ? entry.name : '';
	if (!name || !isLiteralValue(entry.value)) return undefined;
	if (label !== undefined && skipPlaceholders) return undefined;
	if (!isSecretName(name, location)) return undefined;

	return label !== undefined ? 'asks the user to paste a secret' : 'carries a hardcoded secret';
}

/**
 * Scan one raw-JSON field. Reads `"name": "value"` pairs through the same two
 * signals as the keypair form; falls back to a bare placeholder scan so an
 * unquoted `{"key": <__PLACEHOLDER_VALUE__API Key__>}` still trips it.
 */
function collectJsonFieldIssues(
	node: WorkflowNodeResponse,
	field: string,
	location: Location,
	skipPlaceholders: boolean,
): string[] {
	const raw = node.parameters?.[field];
	if (typeof raw !== 'string' || raw.length === 0) return [];

	const kind = LOCATION_LABEL[location];
	const issues: string[] = [];
	const reported = new Set<string>();

	for (const [, name, value] of raw.matchAll(QUOTED_PAIR_RE)) {
		const reason = findSecretReason({ name, value }, location, skipPlaceholders);
		if (reason && !reported.has(name)) {
			reported.add(name);
			issues.push(`"${node.name}" ${kind} "${name}" ${reason}`);
		}
	}
	if (issues.length > 0 || skipPlaceholders) return issues;

	// Every unquoted placeholder, not just the first — a non-secret one (a
	// spreadsheet ID) routinely precedes the secret.
	for (const [, label] of raw.matchAll(PLACEHOLDER_GLOBAL_RE)) {
		if (isSecretLabel(label)) {
			issues.push(`"${node.name}" ${kind} JSON asks the user to paste "${label.trim()}"`);
		}
	}
	return issues;
}

/**
 * `sendQuery` / `sendHeaders` / `sendBody` are deliberately ignored. They gate
 * whether the node *transmits* a collection, not whether the value is stored:
 * a key left behind in a disabled collection still sits in plaintext in the
 * workflow JSON and still travels with exports.
 */
function collectNodeIssues(node: WorkflowNodeResponse): string[] {
	const skipPlaceholders = hasAttachedCredential(node);
	const issues: string[] = [];

	for (const { field, location } of PARAMETER_COLLECTIONS) {
		const collection = node.parameters?.[field] as ParameterCollection | undefined;
		const entries = collection?.parameters ?? collection?.values;
		if (!Array.isArray(entries)) continue;

		for (const entry of entries) {
			const reason = findSecretReason(entry, location, skipPlaceholders);
			if (reason) {
				issues.push(`"${node.name}" ${LOCATION_LABEL[location]} "${entry.name ?? ''}" ${reason}`);
			}
		}
	}
	for (const { field, location } of JSON_STRING_FIELDS) {
		issues.push(...collectJsonFieldIssues(node, field, location, skipPlaceholders));
	}
	return issues;
}

/**
 * Secrets belong in credentials, not node parameters (TRUST-228, from INS-633).
 * A key pasted into a parameter sits in plaintext in the workflow JSON — readable
 * by anyone with workflow access, and carried into exports and version history —
 * whereas credentials are encrypted and access-scoped. HTTP Request nodes have a
 * generic credential for exactly this (`httpQueryAuth` for key-as-query-param
 * APIs, `httpHeaderAuth` / bearer for header APIs).
 *
 * Attaching a credential is not a blanket exemption: it mutes only the
 * ask-the-user placeholder signal. A hardcoded literal always fails, since the
 * secret is in the JSON regardless of how the node authenticates. Nor does
 * declaring `authentication: genericCredentialType` exempt a node — at build
 * time no credential is attached yet, which is exactly when a stray key
 * placeholder needs catching.
 */
export const secretsUseCredentialsNotParameters: BinaryCheck = {
	name: 'secrets_use_credentials_not_parameters',
	description:
		'HTTP Request nodes route API keys and tokens through a credential instead of hardcoding them, or asking the user to paste them, into query/header/body parameters',
	kind: 'deterministic',
	dimension: 'security',
	run(workflow) {
		const httpNodes = (workflow.nodes ?? []).filter((n) => HTTP_NODE_TYPES.has(n.type));
		if (httpNodes.length === 0) return { pass: true, applicable: false };

		const issues = httpNodes.flatMap(collectNodeIssues);

		return {
			pass: issues.length === 0,
			...(issues.length > 0
				? {
						comment: `Secret material in node parameters instead of a credential: ${issues.join('; ')}`,
					}
				: {}),
		};
	},
};

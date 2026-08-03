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

/** Parameter names that carry secret material. Bare `key`/`apikey` included — Google's param is literally `key`. */
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
	/credentials?/i,
	/^key$/i,
	/^apikey$/i,
	/^token$/i,
	/^secret$/i,
	/^auth$/i,
];

/**
 * Placeholder labels that read as secret material. Deliberately narrower than the
 * name patterns: a bare "Key" label is too weak a signal on its own (sort key,
 * partition key), so secret-ness must come from the surrounding word.
 */
const SECRET_LABEL_PATTERNS = [
	/api[\s_-]?key/i,
	/access[\s_-]?(?:key|token)/i,
	/auth(?:orization)?[\s_-]?(?:key|token)/i,
	/\bbearer\b/i,
	/\bsecret\b/i,
	/\btoken\b/i,
	/\bpassword\b/i,
	/\bcredentials?\b/i,
	/private[\s_-]?key/i,
	/subscription[\s_-]?key/i,
	/licen[cs]e[\s_-]?key/i,
];

const SENSITIVE_HEADERS = new Set([
	'authorization',
	'x-api-key',
	'x-auth-token',
	'x-access-token',
	'api-key',
	'apikey',
]);

/** Node-level auth that routes the secret through an encrypted credential. */
const CREDENTIAL_AUTH_MODES = new Set(['genericCredentialType', 'predefinedCredentialType']);

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

const PARAMETER_COLLECTIONS = [
	{ field: 'queryParameters', label: 'query param' },
	{ field: 'headerParameters', label: 'header' },
	{ field: 'bodyParameters', label: 'body param' },
	{ field: 'parametersQuery', label: 'query param' },
	{ field: 'parametersHeaders', label: 'header' },
	{ field: 'parametersBody', label: 'body param' },
] as const;

const HEADER_FIELDS = new Set(['headerParameters', 'parametersHeaders']);

/**
 * `specifyQuery/Body/Headers: 'json'` replaces the keypair collection with one raw
 * JSON string, so the same secret hides in a string instead of an entry. Field names
 * are shared by both node families.
 */
const JSON_STRING_FIELDS = [
	{ field: 'jsonQuery', label: 'query param' },
	{ field: 'jsonHeaders', label: 'header' },
	{ field: 'jsonBody', label: 'body param' },
] as const;

const JSON_HEADER_FIELDS = new Set(['jsonHeaders']);

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

function usesCredential(node: WorkflowNodeResponse): boolean {
	const authentication = node.parameters?.authentication;
	if (typeof authentication === 'string' && CREDENTIAL_AUTH_MODES.has(authentication)) return true;
	return Object.keys(node.credentials ?? {}).length > 0;
}

/**
 * Two independent signals, either is enough:
 * - the placeholder label reads secret-like, whatever the parameter is called
 *   (the INS-633 shape: a "Google Custom Search API Key" placeholder in a param named `key`);
 * - the parameter name reads secret-like and the value is a literal or placeholder.
 */
function findSecretReason(entry: ParameterEntry, isHeader: boolean): string | undefined {
	const label = getPlaceholderLabel(entry.value);
	if (label !== undefined && SECRET_LABEL_PATTERNS.some((p) => p.test(label))) {
		return `asks the user to paste "${label.trim()}"`;
	}

	const name = typeof entry.name === 'string' ? entry.name : '';
	if (!name || !isLiteralValue(entry.value)) return undefined;

	const nameIsSecret =
		SECRET_NAME_PATTERNS.some((p) => p.test(name)) ||
		(isHeader && SENSITIVE_HEADERS.has(name.toLowerCase()));
	if (!nameIsSecret) return undefined;

	return label !== undefined ? 'asks the user to paste a secret' : 'carries a hardcoded secret';
}

/**
 * Scan one raw-JSON field. Reads `"name": "value"` pairs through the same two
 * signals as the keypair form; falls back to a bare placeholder scan so an
 * unquoted `{"key": <__PLACEHOLDER_VALUE__API Key__>}` still trips it.
 */
function collectJsonFieldIssues(node: WorkflowNodeResponse, field: string, kind: string): string[] {
	const raw = node.parameters?.[field];
	if (typeof raw !== 'string' || raw.length === 0) return [];

	const isHeader = JSON_HEADER_FIELDS.has(field);
	const issues: string[] = [];
	const reported = new Set<string>();

	for (const [, name, value] of raw.matchAll(QUOTED_PAIR_RE)) {
		const reason = findSecretReason({ name, value }, isHeader);
		if (reason && !reported.has(name)) {
			reported.add(name);
			issues.push(`"${node.name}" ${kind} "${name}" ${reason}`);
		}
	}
	if (issues.length > 0) return issues;

	const label = getPlaceholderLabel(raw);
	if (label !== undefined && SECRET_LABEL_PATTERNS.some((p) => p.test(label))) {
		issues.push(`"${node.name}" ${kind} JSON asks the user to paste "${label.trim()}"`);
	}
	return issues;
}

function collectNodeIssues(node: WorkflowNodeResponse): string[] {
	const issues: string[] = [];
	for (const { field, label: kind } of PARAMETER_COLLECTIONS) {
		const collection = node.parameters?.[field] as ParameterCollection | undefined;
		const entries = collection?.parameters ?? collection?.values;
		if (!Array.isArray(entries)) continue;

		for (const entry of entries) {
			const reason = findSecretReason(entry, HEADER_FIELDS.has(field));
			if (reason) {
				issues.push(`"${node.name}" ${kind} "${entry.name ?? ''}" ${reason}`);
			}
		}
	}
	for (const { field, label: kind } of JSON_STRING_FIELDS) {
		issues.push(...collectJsonFieldIssues(node, field, kind));
	}
	return issues;
}

/**
 * Secrets belong in credentials, not node parameters (TRUST-228, from INS-633).
 * A key pasted into a parameter sits in plaintext in the workflow JSON — readable
 * by anyone with workflow access, and carried into exports and version history —
 * whereas credentials are encrypted and access-scoped. HTTP Request nodes have a
 * generic credential for exactly this (`httpQueryAuth` for key-as-query-param
 * APIs, `httpHeaderAuth` / bearer for header APIs), so a node with any credential
 * auth configured is out of scope here.
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

		const issues = httpNodes.filter((n) => !usesCredential(n)).flatMap(collectNodeIssues);

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

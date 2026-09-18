import type {
	CustomNodeAuth,
	CustomOperationDefinition,
	CustomOperationHttpMethod,
	CustomOperationInputType,
	CustomOperationVersionContent,
} from '@n8n/api-types';
import type { INodeParameters, INodeTypeDescription } from 'n8n-workflow';

/**
 * Editable, flat representation of a custom operation used by the wizard.
 * Every header, query parameter, body leaf and URL placeholder is one entry
 * that the user marks as fixed, required input or optional input.
 */

export type DraftEntryTarget = 'header' | 'query' | 'body' | 'url';
export type DraftEntryMode = 'fixed' | 'required' | 'optional';

export interface DraftEntry {
	id: string;
	target: DraftEntryTarget;
	/** Header name, query key, body path (`line_items[0].price`) or URL placeholder name. */
	key: string;
	/** Fixed value, or the default value of the input. */
	value: string;
	mode: DraftEntryMode;
	name: string;
	displayName: string;
	description: string;
	type: CustomOperationInputType;
	/** Comma-separated `Label=value` pairs for `options` inputs. */
	optionsText: string;
}

export interface CustomNodeDraft {
	mode: 'operation' | 'node';
	/** Set when the wizard edits an existing operation (creates a new version). */
	editingOperationId?: string;
	parentNodeType: string | null;
	operationName: string;
	operationDescription: string;
	nodeName: string;
	nodeDisplayName: string;
	nodeDescription: string;
	baseUrl: string;
	iconDataUri?: string;
	auth: CustomNodeAuth;
	method: CustomOperationHttpMethod;
	url: string;
	bodyType: CustomOperationVersionContent['request']['bodyType'];
	entries: DraftEntry[];
	changelog: string;
}

let entryCounter = 0;
const nextId = () => `entry-${++entryCounter}-${Date.now().toString(36)}`;

const EXPRESSION_REGEX = /\{\{([\s\S]*?)\}\}/g;
const METHODS: CustomOperationHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function createEmptyDraft(): CustomNodeDraft {
	return {
		mode: 'operation',
		parentNodeType: null,
		operationName: '',
		operationDescription: '',
		nodeName: '',
		nodeDisplayName: '',
		nodeDescription: '',
		baseUrl: '',
		auth: { kind: 'none' },
		method: 'GET',
		url: '',
		bodyType: 'none',
		entries: [],
		changelog: '',
	};
}

export function createEntry(partial: Partial<DraftEntry> & Pick<DraftEntry, 'target'>): DraftEntry {
	const key = partial.key ?? '';
	const name = partial.name ?? toIdentifier(key);
	return {
		id: nextId(),
		key,
		value: '',
		mode: 'fixed',
		name,
		displayName: partial.displayName ?? toDisplayName(key),
		description: '',
		type: 'string',
		optionsText: '',
		...partial,
	};
}

/** `line_items[0].price` → `lineItems0Price`, `X-Api-Version` → `xApiVersion`. */
export function toIdentifier(key: string): string {
	const parts = key.split(/[^A-Za-z0-9]+/).filter(Boolean);
	if (parts.length === 0) return 'value';
	const [first, ...rest] = parts;
	const camel =
		first.charAt(0).toLowerCase() +
		first.slice(1) +
		rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
	return /^[A-Za-z_]/.test(camel) ? camel : `field${camel}`;
}

export function toDisplayName(key: string): string {
	const last =
		key
			.split(/[.[\]]+/)
			.filter(Boolean)
			.pop() ?? key;
	const words = last
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.split(/[^A-Za-z0-9]+/)
		.filter(Boolean);
	return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Value';
}

/** Turns nested body JSON into `path → leaf value` pairs. */
export function flattenBody(value: unknown, prefix = ''): Array<{ path: string; value: string }> {
	if (Array.isArray(value)) {
		return value.flatMap((item, index) => flattenBody(item, `${prefix}[${index}]`));
	}
	if (value && typeof value === 'object') {
		return Object.entries(value).flatMap(([key, item]) =>
			flattenBody(item, prefix ? `${prefix}.${key}` : key),
		);
	}
	return [{ path: prefix, value: value === undefined || value === null ? '' : String(value) }];
}

/**
 * A value that is an expression (`={{ $json.x }}`) most likely varies per
 * execution, so it becomes a required input. Literal values stay fixed.
 */
function classifyValue(key: string, raw: unknown): Pick<DraftEntry, 'value' | 'mode' | 'name'> {
	const value = raw === undefined || raw === null ? '' : String(raw);
	if (value.startsWith('=') && value.includes('{{')) {
		return { value: '', mode: 'required', name: nameFromExpression(value) ?? toIdentifier(key) };
	}
	return { value, mode: 'fixed', name: toIdentifier(key) };
}

function nameFromExpression(expression: string): string | undefined {
	const match =
		/\$(?:json|parameter|vars|input\.item\.json)(?:\.|\[["'])([A-Za-z_][A-Za-z0-9_]*)/.exec(
			expression,
		);
	return match?.[1];
}

function readParametersList(
	params: INodeParameters,
	path: string,
): Array<{ name: string; value: unknown }> {
	const container = params[path];
	if (!container || typeof container !== 'object') return [];
	const list = (container as { parameters?: unknown }).parameters;
	if (!Array.isArray(list)) return [];
	return list
		.filter((item): item is { name: string; value: unknown } => !!item && typeof item === 'object')
		.map((item) => ({ name: String(item.name ?? ''), value: item.value }));
}

function parseJsonParameter(raw: unknown): unknown {
	if (typeof raw !== 'string') return raw;
	const text = raw.startsWith('=') ? raw.slice(1) : raw;
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

/**
 * Rewrites `{{ $json.foo }}` segments in the URL into `{{ $parameter.foo }}`
 * placeholders and returns one URL entry per placeholder.
 */
function extractUrlPlaceholders(rawUrl: string): { url: string; entries: DraftEntry[] } {
	const url = rawUrl.startsWith('=') ? rawUrl.slice(1) : rawUrl;
	const entries: DraftEntry[] = [];
	const used = new Set<string>();
	const rewritten = url.replace(EXPRESSION_REGEX, (segment, inner: string) => {
		const existing = /^\s*\$parameter\.([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(inner);
		let name =
			existing?.[1] ?? nameFromExpression(`{{${inner}}}`) ?? `urlParam${entries.length + 1}`;
		while (used.has(name)) name = `${name}2`;
		used.add(name);
		entries.push(
			createEntry({
				target: 'url',
				key: name,
				name,
				mode: 'required',
				displayName: toDisplayName(name),
			}),
		);
		return existing ? segment : `{{ $parameter.${name} }}`;
	});
	return { url: rewritten, entries };
}

/**
 * Pre-fills a draft from an HTTP Request node's parameters. This is the
 * "Save as custom operation" entry point in the NDV.
 */
export function draftFromHttpRequestParameters(params: INodeParameters): Partial<CustomNodeDraft> {
	const draft: Partial<CustomNodeDraft> = {};
	const method = String(params.method ?? 'GET').toUpperCase();
	draft.method = METHODS.includes(method as CustomOperationHttpMethod)
		? (method as CustomOperationHttpMethod)
		: 'GET';

	const { url, entries } = extractUrlPlaceholders(String(params.url ?? ''));
	draft.url = url;

	if (params.sendHeaders) {
		if (params.specifyHeaders === 'json') {
			const parsed = parseJsonParameter(params.jsonHeaders);
			if (parsed && typeof parsed === 'object') {
				for (const [key, value] of Object.entries(parsed)) {
					entries.push(createEntry({ target: 'header', key, ...classifyValue(key, value) }));
				}
			}
		} else {
			for (const { name, value } of readParametersList(params, 'headerParameters')) {
				if (name)
					entries.push(createEntry({ target: 'header', key: name, ...classifyValue(name, value) }));
			}
		}
	}

	if (params.sendQuery) {
		if (params.specifyQuery === 'json') {
			const parsed = parseJsonParameter(params.jsonQuery);
			if (parsed && typeof parsed === 'object') {
				for (const [key, value] of Object.entries(parsed)) {
					entries.push(createEntry({ target: 'query', key, ...classifyValue(key, value) }));
				}
			}
		} else {
			for (const { name, value } of readParametersList(params, 'queryParameters')) {
				if (name)
					entries.push(createEntry({ target: 'query', key: name, ...classifyValue(name, value) }));
			}
		}
	}

	draft.bodyType = 'none';
	if (params.sendBody) {
		const contentType = String(params.contentType ?? 'json');
		draft.bodyType = contentType === 'form-urlencoded' ? 'form' : 'json';
		if (params.specifyBody === 'json') {
			const parsed = parseJsonParameter(params.jsonBody);
			for (const { path, value } of flattenBody(parsed)) {
				if (path)
					entries.push(createEntry({ target: 'body', key: path, ...classifyValue(path, value) }));
			}
		} else {
			for (const { name, value } of readParametersList(params, 'bodyParameters')) {
				if (name)
					entries.push(createEntry({ target: 'body', key: name, ...classifyValue(name, value) }));
			}
		}
	}

	if (
		params.authentication === 'predefinedCredentialType' &&
		typeof params.nodeCredentialType === 'string'
	) {
		draft.auth = { kind: 'predefined', credentialType: params.nodeCredentialType };
	} else if (
		params.authentication === 'genericCredentialType' &&
		typeof params.genericAuthType === 'string'
	) {
		const type = params.genericAuthType;
		if (
			type === 'httpHeaderAuth' ||
			type === 'httpBasicAuth' ||
			type === 'httpBearerAuth' ||
			type === 'httpQueryAuth'
		) {
			draft.auth = { kind: 'generic', type };
		}
	}

	draft.entries = entries;
	return draft;
}

/** Loads the active version of a stored operation into the wizard for editing. */
export function draftFromOperation(
	definition: CustomOperationDefinition,
): Partial<CustomNodeDraft> {
	const version =
		definition.versions.find((v) => v.version === definition.activeVersion) ??
		definition.versions[definition.versions.length - 1];
	const entries: DraftEntry[] = [];

	for (const [key, value] of Object.entries(version.request.headers)) {
		entries.push(createEntry({ target: 'header', key, value, mode: 'fixed' }));
	}
	for (const [key, value] of Object.entries(version.request.query)) {
		entries.push(createEntry({ target: 'query', key, value, mode: 'fixed' }));
	}
	for (const { path, value } of flattenBody(parseJsonParameter(version.request.body))) {
		if (path) entries.push(createEntry({ target: 'body', key: path, value, mode: 'fixed' }));
	}
	for (const fixed of version.fixedData) {
		entries.push(
			createEntry({ target: fixed.target, key: fixed.key, value: fixed.value, mode: 'fixed' }),
		);
	}
	for (const input of version.inputs) {
		entries.push(
			createEntry({
				target: input.target,
				key: input.key,
				name: input.name,
				displayName: input.displayName,
				description: input.description ?? '',
				type: input.type,
				value: input.default === undefined ? '' : String(input.default),
				mode: input.required ? 'required' : 'optional',
				optionsText: (input.options ?? []).map((o) => `${o.name}=${o.value}`).join(', '),
			}),
		);
	}

	return {
		mode: 'operation',
		editingOperationId: definition.id,
		parentNodeType: definition.parentNodeType,
		operationName: definition.name,
		operationDescription: definition.description ?? '',
		auth: version.request.auth,
		method: version.request.method,
		url: version.request.url,
		bodyType: version.request.bodyType,
		entries,
		changelog: '',
	};
}

function parseOptions(text: string) {
	return text
		.split(',')
		.map((pair) => pair.trim())
		.filter(Boolean)
		.map((pair) => {
			const [name, value] = pair.split('=').map((part) => part.trim());
			return { name, value: value ?? name };
		});
}

function coerceDefault(entry: DraftEntry): unknown {
	if (entry.value === '')
		return entry.type === 'boolean' ? false : entry.type === 'number' ? 0 : '';
	if (entry.type === 'number') return Number(entry.value);
	if (entry.type === 'boolean') return entry.value === 'true';
	return entry.value;
}

/** Turns the flat draft into the stored version content. */
export function draftToVersionContent(draft: CustomNodeDraft): CustomOperationVersionContent {
	const inputs: CustomOperationVersionContent['inputs'] = [];
	const fixedData: CustomOperationVersionContent['fixedData'] = [];

	for (const entry of draft.entries) {
		if (!entry.key) continue;
		if (entry.mode === 'fixed') {
			if (entry.target === 'url') continue;
			fixedData.push({ target: entry.target, key: entry.key, value: entry.value });
			continue;
		}
		inputs.push({
			name: entry.name || toIdentifier(entry.key),
			displayName: entry.displayName || toDisplayName(entry.key),
			description: entry.description || undefined,
			type: entry.type,
			options: entry.type === 'options' ? parseOptions(entry.optionsText) : undefined,
			required: entry.mode === 'required',
			default: coerceDefault(entry),
			target: entry.target,
			key: entry.key,
		});
	}

	return {
		changelog: draft.changelog || undefined,
		request: {
			method: draft.method,
			url: draft.url,
			headers: {},
			query: {},
			bodyType: draft.bodyType,
			auth: draft.auth,
		},
		fixedData,
		inputs,
	};
}

/** Picks the credential type a custom operation for `parent` should reuse. */
export function authFromParentDescription(parent: INodeTypeDescription | null): CustomNodeAuth {
	const credential = parent?.credentials?.[0];
	return credential ? { kind: 'predefined', credentialType: credential.name } : { kind: 'none' };
}

export async function readImageFileAsDataUri(file: File): Promise<string> {
	if (!['image/svg+xml', 'image/png'].includes(file.type) || file.size > 256 * 1024) {
		throw new Error('Unsupported image');
	}
	return await new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

import type { CustomActionInput, CustomActionRequest, CustomNodeAuth } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import {
	createEntry,
	createInput,
	emptyRequest,
	toDisplayName,
	toIdentifier,
	uniqueName,
} from './draftMapping';
import type { EditableEntry, EditableInput, EditableRequest } from './wizard.types';

/** Standard headers that carry a secret. The wizard never copies them (decision 6 of the plan). */
const SECRET_HEADERS = ['authorization', 'cookie', 'proxy-authorization'];
/**
 * A header, query parameter, or body field whose name contains one of these parts likely carries
 * a secret. The check is broad on purpose: the wizard reports each dropped name, and the user can
 * add a harmless value again.
 */
const SECRET_NAME_PARTS = ['key', 'token', 'secret', 'auth', 'password', 'signature', 'session'];

const METHODS: ReadonlyArray<CustomActionRequest['method']> = [
	'GET',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
];
const GENERIC_AUTH_TYPES = [
	'httpHeaderAuth',
	'httpBasicAuth',
	'httpBearerAuth',
	'httpQueryAuth',
] as const;

const EXPRESSION_PATTERN = /\{\{([\s\S]*?)\}\}/g;

export const isSecretName = (name: string) => {
	const lower = name.toLowerCase();
	return SECRET_NAME_PARTS.some((part) => lower.includes(part));
};
export const isSecretHeader = (name: string) =>
	SECRET_HEADERS.includes(name.trim().toLowerCase()) || isSecretName(name);

export interface HttpRequestMapping {
	request: EditableRequest;
	inputs: EditableInput[];
	auth: CustomNodeAuth;
	/** The names of the headers, query parameters, and body fields that the wizard did not copy. */
	dropped: string[];
}

const isExpression = (value: unknown): value is string =>
	typeof value === 'string' && value.startsWith('=') && value.includes('{{');

/** A plain value of a parameter. Drops the `=` that marks an expression without `{{`. */
function literal(value: unknown): string {
	if (value === undefined || value === null) return '';
	const text = typeof value === 'string' ? value : JSON.stringify(value);
	return text.startsWith('=') ? text.slice(1) : text;
}

function nameFromExpression(expression: string): string | undefined {
	const match = /\$(?:json|parameter|input\.item\.json)(?:\.|\[["'])([A-Za-z_][A-Za-z0-9_]*)/.exec(
		expression,
	);
	return match?.[1];
}

function isGenericAuthType(value: unknown): value is (typeof GENERIC_AUTH_TYPES)[number] {
	return GENERIC_AUTH_TYPES.some((type) => type === value);
}

function isMethod(value: string): value is CustomActionRequest['method'] {
	return METHODS.some((method) => method === value);
}

/** Reads `{ parameters: [{ name, value }] }` of a fixed collection. */
function readPairs(container: unknown): Array<{ name: string; value: unknown }> {
	if (!isRecord(container) || !Array.isArray(container.parameters)) return [];
	return container.parameters
		.filter(isRecord)
		.map((pair) => ({ name: literal(pair.name).trim(), value: pair.value }))
		.filter((pair) => pair.name !== '');
}

function readJsonPairs(raw: unknown): Array<{ name: string; value: unknown }> {
	try {
		const parsed: unknown = typeof raw === 'string' ? JSON.parse(literal(raw)) : raw;
		return isRecord(parsed) ? Object.entries(parsed).map(([name, value]) => ({ name, value })) : [];
	} catch {
		return [];
	}
}

class Mapper {
	readonly inputs: EditableInput[] = [];
	readonly dropped: string[] = [];
	private readonly used = new Set<string>();

	/** Adds an input for a value that changes in each run. */
	addInput(target: CustomActionInput['target'], key: string, expression: string): string {
		const name = uniqueName(
			target === 'url' ? key : toIdentifier(nameFromExpression(expression) ?? key),
			this.used,
		);
		this.inputs.push(
			createInput({
				name,
				key: target === 'url' ? name : key,
				target,
				required: true,
				displayName: toDisplayName(target === 'url' ? name : key),
			}),
		);
		return name;
	}

	/** Turns each `{{ … }}` of the URL path into a `{placeholder}` with an input. */
	mapUrlPath(path: string): string {
		return path.replace(EXPRESSION_PATTERN, (segment: string) => {
			const base = toIdentifier(nameFromExpression(segment) ?? 'value');
			return `{${this.addInput('url', base, segment)}}`;
		});
	}

	/** Splits pairs into fixed entries and inputs. Drops the pairs with a secret name. */
	mapPairs(
		pairs: Array<{ name: string; value: unknown }>,
		target: 'header' | 'query',
		isSecret: (name: string) => boolean,
	) {
		const entries: EditableEntry[] = [];
		for (const { name, value } of pairs) {
			if (isSecret(name)) {
				this.dropped.push(name);
			} else if (isExpression(value)) {
				this.addInput(target, name, value);
			} else {
				entries.push(createEntry(name, literal(value)));
			}
		}
		return entries;
	}

	/**
	 * Removes the expression values from a JSON body and adds an input for each. Drops a fixed
	 * value whose path has a secret name.
	 */
	mapBodyValue(value: unknown, path: string): unknown {
		if (isExpression(value) || (typeof value === 'string' && value.includes('{{'))) {
			this.addInput('body', path, value);
			return undefined;
		}
		if (!isRecord(value) && !Array.isArray(value) && isSecretName(path)) {
			this.dropped.push(path);
			return undefined;
		}
		if (Array.isArray(value)) {
			return value
				.map((item, index) => this.mapBodyValue(item, `${path}[${index}]`))
				.filter((item) => item !== undefined);
		}
		if (isRecord(value)) {
			const result: Record<string, unknown> = {};
			for (const [key, child] of Object.entries(value)) {
				const mapped = this.mapBodyValue(child, path ? `${path}.${key}` : key);
				if (mapped !== undefined) result[key] = mapped;
			}
			return result;
		}
		return value;
	}
}

function mapBody(params: Record<string, unknown>, request: EditableRequest, mapper: Mapper) {
	if (params.sendBody !== true) return;
	const contentType = literal(params.contentType ?? 'json');
	request.bodyType =
		contentType === 'form-urlencoded' || contentType === 'multipart-form-data' ? 'form' : 'json';

	if (params.specifyBody === 'json') {
		const text = literal(params.jsonBody);
		let parsed: unknown;
		try {
			parsed = JSON.parse(text);
		} catch {
			// The wizard cannot remove one field from text that does not parse. If a field has a
			// secret name, it copies no body. Else the user sees the text and fixes it.
			const secretKeys = jsonKeysOf(text).filter(isSecretName);
			if (secretKeys.length > 0) {
				mapper.dropped.push(...secretKeys);
				request.bodyText = '';
			} else {
				request.bodyText = text;
			}
			return;
		}
		const body = mapper.mapBodyValue(parsed, '');
		// Write the cleaned value back, also for an array body: the original text can hold a dropped field.
		request.bodyText = isRecord(body) || Array.isArray(body) ? JSON.stringify(body, null, 2) : text;
		return;
	}

	const body: Record<string, unknown> = {};
	for (const { name, value } of readPairs(params.bodyParameters)) {
		if (isExpression(value)) mapper.addInput('body', name, value);
		else if (isSecretName(name)) mapper.dropped.push(name);
		else body[name] = literal(value);
	}
	request.bodyText = Object.keys(body).length > 0 ? JSON.stringify(body, null, 2) : '';
}

function mapAuth(params: Record<string, unknown>): CustomNodeAuth {
	if (params.authentication === 'predefinedCredentialType') {
		const credentialType = literal(params.nodeCredentialType);
		if (credentialType) return { kind: 'predefined', credentialType };
	}
	if (
		params.authentication === 'genericCredentialType' &&
		isGenericAuthType(params.genericAuthType)
	) {
		return { kind: 'generic', type: params.genericAuthType };
	}
	return { kind: 'none' };
}

/** The quoted keys of JSON text, also when the text does not parse. */
function jsonKeysOf(text: string): string[] {
	return [...text.matchAll(/"((?:[^"\\]|\\.)*)"\s*:/g)].map((match) => match[1]);
}

/**
 * Maps the parameters of an HTTP Request node to a request of the wizard. A value with an
 * expression becomes a required input. A header, query parameter, or fixed body value that likely
 * carries a secret is not copied: its name is in `dropped`, so the wizard can tell the user to use
 * a credential.
 */
export function mapHttpRequestParameters(params: Record<string, unknown>): HttpRequestMapping {
	const mapper = new Mapper();
	const request = emptyRequest();

	const method = literal(params.method ?? 'GET').toUpperCase();
	request.method = isMethod(method) ? method : 'GET';

	const url = literal(params.url).trim();
	const split = url.indexOf('?');
	request.url = mapper.mapUrlPath(split === -1 ? url : url.slice(0, split));
	const urlQuery =
		split === -1
			? []
			: url
					.slice(split + 1)
					.split('#')[0]
					.split('&')
					.filter(Boolean)
					.map((pair) => {
						const [name, ...rest] = pair.split('=');
						const value = rest.join('=');
						return {
							name: decodeQueryPart(name),
							value: isExpression(`=${value}`) ? `=${value}` : decodeQueryPart(value),
						};
					});

	const headers =
		params.sendHeaders === true
			? params.specifyHeaders === 'json'
				? readJsonPairs(params.jsonHeaders)
				: readPairs(params.headerParameters)
			: [];
	request.headers = mapper.mapPairs(headers, 'header', isSecretHeader);

	const query =
		params.sendQuery === true
			? params.specifyQuery === 'json'
				? readJsonPairs(params.jsonQuery)
				: readPairs(params.queryParameters)
			: [];
	request.query = mapper.mapPairs([...urlQuery, ...query], 'query', isSecretName);

	mapBody(params, request, mapper);

	return { request, inputs: mapper.inputs, auth: mapAuth(params), dropped: mapper.dropped };
}

function decodeQueryPart(text: string): string {
	try {
		return decodeURIComponent(text.replace(/\+/g, ' '));
	} catch {
		return text;
	}
}

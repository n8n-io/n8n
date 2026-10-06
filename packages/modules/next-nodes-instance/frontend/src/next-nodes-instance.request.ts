/** "Save as action" in the HTTP Request node: its parameters as an HTTP action form. */
import {
	emptyForm,
	GENERIC_CREDENTIAL_TYPES,
	isMethod,
	type HeaderRow,
	type HttpActionForm,
	type ValueRow,
} from './next-nodes-instance.config';

/** The form reads its unsaved draft from this key. */
export const HTTP_ACTION_DRAFT_KEY = 'N8N_NEXT_NODES_HTTP_ACTION_DRAFT';

/** Makes `form` the draft that the HTTP action form opens with. */
export function saveHttpActionDraft(form: HttpActionForm) {
	localStorage.setItem(HTTP_ACTION_DRAFT_KEY, JSON.stringify(form));
}

/** Starts a draft for the app `appName`, unless the form already holds a draft. */
export function startHttpActionDraft(appName: string) {
	if (localStorage.getItem(HTTP_ACTION_DRAFT_KEY) !== null) return;
	saveHttpActionDraft({ ...emptyForm(), appName });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const textOf = (value: unknown) =>
	typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value);

const isExpression = (value: unknown): value is string =>
	typeof value === 'string' && value.startsWith('=');

/** `$json.userId` and `$json["userId"]` name an input; any other expression gets `value<n>`. */
function inputNameOf(expression: string, index: number) {
	const named = /^\s*\$json(?:\.([A-Za-z_]\w*)|\[\s*["']([A-Za-z_]\w*)["']\s*\])\s*$/.exec(
		expression,
	);
	return named?.[1] ?? named?.[2] ?? `value${index + 1}`;
}

/** The URL with each `{{ expression }}` as a `{name}` hole, so the action asks for its value. */
function templateOf(url: unknown) {
	if (typeof url !== 'string') return '';
	if (!isExpression(url)) return url;
	const holes = [...url.slice(1).matchAll(/\{\{([^}]*)\}\}/g)];
	return holes.reduce(
		(text, [whole, expression], index) =>
			text.replace(whole, `{${inputNameOf(expression ?? '', index)}}`),
		url.slice(1),
	);
}

/** `https://api.acme.com/v1/greet?x=1` → base URL, path, and the query values of the URL. */
function splitUrl(url: string) {
	const match = /^(https?:\/\/[^/?#]+)([^?#]*)(?:\?([^#]*))?/.exec(url.trim());
	if (!match) return { baseUrl: url, path: '/', query: [] };
	const query = [...new URLSearchParams(match[3] ?? '')].map(
		([key, value]): ValueRow => ({ key, value, fromInput: false }),
	);
	return { baseUrl: match[1] ?? '', path: match[2] || '/', query };
}

/** The `parameters` list of a fixed collection, such as `queryParameters`. */
function pairsOf(collection: unknown): Array<{ name: string; value: unknown }> {
	const list = isRecord(collection) ? collection.parameters : undefined;
	if (!Array.isArray(list)) return [];
	return list.flatMap((pair) =>
		isRecord(pair) && typeof pair.name === 'string' && pair.name
			? [{ name: pair.name, value: pair.value }]
			: [],
	);
}

/** A fixed value stays fixed; an expression becomes an input with the name of the parameter. */
const valueRowsOf = (collection: unknown): ValueRow[] =>
	pairsOf(collection).map(({ name, value }) =>
		isExpression(value)
			? { key: name, value: '', fromInput: true }
			: { key: name, value: textOf(value), fromInput: false },
	);

/** The credential type of the node, when an action can send it. The credential stays with the user. */
function credentialTypeOf({
	authentication,
	nodeCredentialType,
	genericAuthType,
}: Readonly<Record<string, unknown>>) {
	if (authentication === 'predefinedCredentialType' && typeof nodeCredentialType === 'string') {
		return nodeCredentialType;
	}
	if (
		authentication === 'genericCredentialType' &&
		typeof genericAuthType === 'string' &&
		GENERIC_CREDENTIAL_TYPES.includes(genericAuthType)
	) {
		return genericAuthType;
	}
	return undefined;
}

/** The form for the parameters of an HTTP Request node (version 3 or later). */
export function httpActionFormOfRequest(parameters: Readonly<Record<string, unknown>>) {
	const { baseUrl, path, query: urlQuery } = splitUrl(templateOf(parameters.url));
	const keypair = (specify: unknown) => specify === undefined || specify === 'keypair';
	const query =
		parameters.sendQuery === true && keypair(parameters.specifyQuery)
			? valueRowsOf(parameters.queryParameters)
			: [];
	const headers: HeaderRow[] =
		parameters.sendHeaders === true && keypair(parameters.specifyHeaders)
			? valueRowsOf(parameters.headerParameters)
					// A header is a fixed value in the form, so an expression header is left out.
					.filter(({ fromInput }) => !fromInput)
					.map(({ key, value }) => ({ key, value }))
			: [];
	const jsonBody = parameters.contentType === undefined || parameters.contentType === 'json';
	const body =
		parameters.sendBody === true && jsonBody && keypair(parameters.specifyBody)
			? valueRowsOf(parameters.bodyParameters)
			: [];
	const credentialType = credentialTypeOf(parameters);
	const form: HttpActionForm = {
		...emptyForm(),
		...(credentialType ? { credentialType } : {}),
		method: isMethod(parameters.method) ? parameters.method : 'GET',
		baseUrl,
		path,
		query: [...urlQuery, ...query],
		headers,
		body,
	};
	return form;
}

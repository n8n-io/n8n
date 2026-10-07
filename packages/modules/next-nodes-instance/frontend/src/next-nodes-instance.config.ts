import type { NextNodeParent } from '@n8n/api-types';
import type { CatalogCredentialType } from '@n8n/frontend-module-sdk';

/**
 * The HTTP action form as data, and the HTTP guest config that it gives. The server packs the
 * config and writes the parts of the contract that the request gives, such as the egress and
 * the paging input, so the config here only has to be valid, not complete.
 */

export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const;
export type HttpMethod = (typeof METHODS)[number];

export const INPUT_TYPES = ['string', 'number', 'integer', 'boolean'] as const;
export type InputType = (typeof INPUT_TYPES)[number];

export type Effect = 'read' | 'write';

export const isMethod = (value: unknown): value is HttpMethod =>
	METHODS.some((method) => method === value);

export const isInputType = (value: unknown): value is InputType =>
	INPUT_TYPES.some((type) => type === value);

export const isEffect = (value: unknown): value is Effect => value === 'read' || value === 'write';

/** A query or body value: fixed, or the value of an input with the same name. */
export interface ValueRow {
	readonly key: string;
	readonly value: string;
	readonly fromInput: boolean;
}

export interface HeaderRow {
	readonly key: string;
	readonly value: string;
}

export interface InputSettings {
	readonly type: InputType;
	readonly required: boolean;
	readonly description: string;
}

export type PageSend = { readonly query: string } | { readonly body: string };

export type Paging =
	| { readonly style: 'cursor'; readonly next: string; readonly send: PageSend }
	| { readonly style: 'link' }
	| { readonly style: 'offset'; readonly unit: 'item'; readonly send: PageSend }
	| { readonly style: 'offset'; readonly unit: 'page'; readonly send: PageSend };

export type ResponseShape =
	| { readonly kind: 'single' }
	| { readonly kind: 'list'; readonly items: string; readonly paging?: Paging };

/** The shipped node that the action extends, as the form took it when the user picked it. */
export interface ExtendsSettings {
	/** E.g. `github`. */
	readonly node: string;
	readonly displayName: string;
	readonly credentialTypes: readonly string[];
	/** E.g. `issue`. The id of the action is then `github.issue.<action>`. */
	readonly resource?: string;
	/** The input fields that the node gives every action of the resource, e.g. `owner`. */
	readonly resourceFields: readonly string[];
}

export interface HttpActionForm {
	/** The app that groups the action, e.g. `Acme`. */
	readonly appName: string;
	/** E.g. `Get a greeting`. */
	readonly actionName: string;
	readonly summary: string;
	readonly method: HttpMethod;
	readonly baseUrl: string;
	/** Starts with `/`; `{name}` takes the value of the input `name`. */
	readonly path: string;
	readonly query: readonly ValueRow[];
	readonly headers: readonly HeaderRow[];
	readonly body: readonly ValueRow[];
	/** Settings by input name. An input without settings is a required string. */
	readonly inputs: Readonly<Record<string, InputSettings>>;
	readonly response: ResponseShape;
	/** The n8n credential type that each request sends, e.g. `slackApi`. Absent: none. */
	readonly credentialType?: string;
	/**
	 * The shipped node that the action extends. The server copies its base URL, credentials and
	 * resource inputs, so the form's base URL and credential type do not apply.
	 */
	readonly extends?: ExtendsSettings;
	/** The schema of one output item, after the user trims the schema of a test run. */
	readonly output?: JsonSchema;
	/** Overrides of the values that the names and the method give. */
	readonly advanced: {
		readonly id?: string;
		readonly effect?: Effect;
		readonly idempotent?: boolean;
	};
}

export interface JsonSchema {
	readonly type?: string | readonly string[];
	readonly properties?: Readonly<Record<string, JsonSchema>>;
	readonly items?: JsonSchema;
	readonly required?: readonly string[];
	readonly additionalProperties?: boolean | JsonSchema;
	readonly description?: string;
}

type RequestValue = string | { readonly input: string };

export interface HttpRequestConfig {
	readonly method: HttpMethod;
	readonly path: string;
	readonly query?: Readonly<Record<string, RequestValue>>;
	readonly headers?: Readonly<Record<string, string>>;
	readonly body?: Readonly<Record<string, RequestValue>>;
}

/** The HTTP guest config, as the publish and test endpoints take it. */
export interface HttpActionConfig {
	readonly contract: {
		readonly id: string;
		readonly version: number;
		readonly node: string;
		readonly action: string;
		readonly summary: string;
		readonly flow: {
			readonly effect: Effect;
			readonly cardinality: 'per-item' | '1:N';
			readonly idempotent: boolean;
			readonly passthrough: 'replace';
		};
		readonly credentials: readonly string[];
		readonly input: JsonSchema;
		readonly output: JsonSchema;
	};
	readonly node?: { readonly displayName: string };
	readonly extends?: string;
	readonly baseUrl?: string;
	readonly request?: HttpRequestConfig;
	readonly list?: HttpRequestConfig & { readonly items: string; readonly pages?: Paging };
}

export const emptyForm = (): HttpActionForm => ({
	appName: '',
	actionName: '',
	summary: '',
	method: 'GET',
	baseUrl: '',
	path: '/',
	query: [],
	headers: [],
	body: [],
	inputs: {},
	response: { kind: 'single' },
	advanced: {},
});

/** `Get a greeting` → `getAGreeting`: a name segment of an action id. */
export function identifierOf(text: string): string {
	const words = text
		.normalize('NFKD')
		.replace(/[^A-Za-z0-9]+/g, ' ')
		.trim()
		.split(' ')
		.filter(Boolean);
	const camel = words
		.map((word, index) =>
			index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
		)
		.join('');
	return /^[a-z]/.test(camel) ? camel : '';
}

/** The node id: the first segment of the action id. */
export const nodeIdOf = (form: HttpActionForm) =>
	(form.advanced.id ?? defaultIdOf(form)).split('.')[0] ?? '';

function defaultIdOf({ extends: parent, appName, actionName }: HttpActionForm) {
	const action = identifierOf(actionName);
	if (!parent) return `${identifierOf(appName)}.${action}`;
	return [parent.node, parent.resource, action].filter(Boolean).join('.');
}

export const actionIdOf = (form: HttpActionForm) => form.advanced.id ?? defaultIdOf(form);

/** GET and HEAD read; PUT and DELETE are idempotent writes; POST and PATCH write. */
export function flowOf(method: HttpMethod): { effect: Effect; idempotent: boolean } {
	if (method === 'GET' || method === 'HEAD') return { effect: 'read', idempotent: true };
	return { effect: 'write', idempotent: method === 'PUT' || method === 'DELETE' };
}

/** The names in `{name}` holes of a path, in order. */
export const holesOf = (path: string): string[] => [
	...new Set([...path.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1])),
];

/**
 * The inputs of the action: the fields of the extended resource, the path holes, then the query
 * and body values from inputs.
 */
export function inputNamesOf(form: HttpActionForm): string[] {
	const fromRows = [...form.query, ...form.body]
		.filter(({ key, fromInput }) => fromInput && key)
		.map(({ key }) => key);
	const shared = form.extends?.resourceFields ?? [];
	return [...new Set([...shared, ...holesOf(form.path), ...fromRows])];
}

/** The extended node gives this input, so its settings come from the node. */
export const isNodeInput = (form: HttpActionForm, name: string) =>
	form.extends?.resourceFields.includes(name) ?? false;

/** The credential types that a test run can use. */
export const credentialTypesOf = (form: HttpActionForm): readonly string[] =>
	form.extends?.credentialTypes ?? (form.credentialType ? [form.credentialType] : []);

/** A path hole is always required: the request has no URL without it. */
export function inputSettingsOf(form: HttpActionForm, name: string): InputSettings {
	const settings = form.inputs[name] ?? { type: 'string', required: true, description: '' };
	return holesOf(form.path).includes(name) ? { ...settings, required: true } : settings;
}

function inputSchemaOf(form: HttpActionForm): JsonSchema {
	const names = inputNamesOf(form);
	const settings = names.map((name) => [name, inputSettingsOf(form, name)] as const);
	const required = settings.filter(([, { required }]) => required).map(([name]) => name);
	return {
		type: 'object',
		properties: Object.fromEntries(
			settings.map(([name, { type, description }]) => [
				name,
				{ type, ...(description ? { description } : {}) },
			]),
		),
		...(required.length ? { required } : {}),
		additionalProperties: false,
	};
}

const valuesOf = (rows: readonly ValueRow[]) => {
	const entries = rows
		.filter(({ key }) => key)
		.map(({ key, value, fromInput }): [string, RequestValue] => [
			key,
			fromInput ? { input: key } : value,
		]);
	return entries.length ? Object.fromEntries(entries) : undefined;
};

const headersOf = (rows: readonly HeaderRow[]) => {
	const entries = rows.filter(({ key }) => key).map(({ key, value }) => [key, value]);
	return entries.length ? Object.fromEntries(entries) : undefined;
};

/** The HTTP guest config of the form. */
export function configOf(form: HttpActionForm): HttpActionConfig {
	const derived = flowOf(form.method);
	const isList = form.response.kind === 'list';
	const request: HttpRequestConfig = {
		method: form.method,
		path: form.path,
		...(valuesOf(form.query) ? { query: valuesOf(form.query) } : {}),
		...(headersOf(form.headers) ? { headers: headersOf(form.headers) } : {}),
		...(valuesOf(form.body) ? { body: valuesOf(form.body) } : {}),
	};
	return {
		contract: {
			id: actionIdOf(form),
			version: 1,
			node: nodeIdOf(form),
			action: form.actionName.trim(),
			summary: form.summary.trim() || form.actionName.trim(),
			flow: {
				effect: form.advanced.effect ?? derived.effect,
				cardinality: isList ? '1:N' : 'per-item',
				idempotent: form.advanced.idempotent ?? derived.idempotent,
				passthrough: 'replace',
			},
			// The server copies the credentials of an extended node.
			credentials: form.extends ? [] : credentialTypesOf(form),
			input: inputSchemaOf(form),
			output: form.output ?? { type: 'object' },
		},
		...(form.extends
			? { extends: form.extends.node }
			: { node: { displayName: form.appName.trim() }, baseUrl: form.baseUrl.trim() }),
		...(form.response.kind === 'list'
			? {
					list: {
						...request,
						items: form.response.items,
						...(form.response.paging ? { pages: form.response.paging } : {}),
					},
				}
			: { request }),
	};
}

export type FormIssue = 'appName' | 'actionName' | 'id' | 'baseUrl' | 'path' | 'items';

/** What the form must hold before a test run. */
export function issuesOf(form: HttpActionForm): FormIssue[] {
	const id = actionIdOf(form);
	const hasApp = Boolean(form.extends) || Boolean(identifierOf(form.appName));
	const checks: ReadonlyArray<readonly [boolean, FormIssue]> = [
		[hasApp, 'appName'],
		[Boolean(identifierOf(form.actionName)), 'actionName'],
		// A derived id is only wrong when a name is, and the names have their own issues.
		[
			(form.advanced.id === undefined && !(hasApp && identifierOf(form.actionName))) ||
				/^[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*){1,2}$/.test(id),
			'id',
		],
		[Boolean(form.extends) || /^https?:\/\/[^/\s]+/.test(form.baseUrl.trim()), 'baseUrl'],
		[form.path.startsWith('/'), 'path'],
		[form.response.kind !== 'list' || /^(\/([^~]|~[01])*)*$/.test(form.response.items), 'items'],
	];
	return checks.filter(([ok]) => !ok).map(([, issue]) => issue);
}

/** Keys sorted at every level, so two equal configs give the same text. */
function canonical(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonical);
	if (value === null || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, inner]) => [key, canonical(inner)]),
	);
}

/**
 * The parts of a config that a test run covers. The output schema is not one of them: the user
 * trims it after the run, and publish replays the recorded run against the trimmed schema.
 */
export function testedPartOf(config: HttpActionConfig): string {
	return JSON.stringify(canonical({ ...config, contract: { ...config.contract, output: null } }));
}

/** The values of a test run, typed as the inputs declare them. An empty value is left out. */
export function testParamsOf(
	form: HttpActionForm,
	values: Readonly<Record<string, string>>,
): Record<string, string | number | boolean> {
	return Object.fromEntries(
		inputNamesOf(form).flatMap((name): Array<[string, string | number | boolean]> => {
			const raw = values[name]?.trim() ?? '';
			if (raw === '') return [];
			const { type } = inputSettingsOf(form, name);
			if (type === 'boolean') return [[name, raw === 'true']];
			if (type === 'number' || type === 'integer') {
				const parsed = Number(raw);
				return [[name, Number.isNaN(parsed) ? raw : parsed]];
			}
			return [[name, raw]];
		}),
	);
}

/** The schema with only the top-level properties in `keep`. */
export function trimmedSchemaOf(schema: JsonSchema, keep: ReadonlySet<string>): JsonSchema {
	if (!schema.properties) return schema;
	const properties = Object.entries(schema.properties).filter(([name]) => keep.has(name));
	return { ...schema, properties: Object.fromEntries(properties) };
}

export const schemaTypeOf = ({ type }: JsonSchema) =>
	Array.isArray(type) ? type.join(' | ') : (type ?? 'any');

/**
 * Generic types that n8n's authenticated request applies. The HTTP Request node applies the
 * other generic types, such as basic auth, in its own code, so an action would send no auth.
 */
export const GENERIC_CREDENTIAL_TYPES: readonly string[] = ['httpHeaderAuth', 'httpBearerAuth'];

/** The types an action can send: those of the HTTP Request node, by display name. */
export const usableCredentialTypesOf = (types: readonly CatalogCredentialType[]) =>
	types
		.filter(
			({ name, httpRequestNode }) => httpRequestNode || GENERIC_CREDENTIAL_TYPES.includes(name),
		)
		.sort((a, b) => a.displayName.localeCompare(b.displayName));

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const textOf = (value: unknown) =>
	typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value);

const recordOf = (value: unknown) => (isRecord(value) ? value : {});

const valueRowsOf = (values: unknown): ValueRow[] =>
	Object.entries(recordOf(values)).map(([key, value]) =>
		isRecord(value) && typeof value.input === 'string'
			? { key, value: '', fromInput: true }
			: { key, value: textOf(value), fromInput: false },
	);

const isPageSend = (value: unknown): value is PageSend =>
	isRecord(value) && (typeof value.query === 'string' || typeof value.body === 'string');

function pagingOf(pages: unknown): Paging | undefined {
	if (!isRecord(pages)) return undefined;
	const { style, unit, next, send } = pages;
	if (style === 'link') return { style };
	if (!isPageSend(send)) return undefined;
	if (style === 'cursor' && typeof next === 'string') return { style, next, send };
	if (style === 'offset' && (unit === 'item' || unit === 'page')) return { style, unit, send };
	return undefined;
}

function inputsOf(schema: unknown): Record<string, InputSettings> {
	const { properties, required } = recordOf(schema);
	const needed = Array.isArray(required) ? required : [];
	return Object.fromEntries(
		Object.entries(recordOf(properties)).map(([name, property]) => {
			const { type, description } = recordOf(property);
			const settings: InputSettings = {
				type: isInputType(type) ? type : 'string',
				required: needed.includes(name),
				description: typeof description === 'string' ? description : '',
			};
			return [name, settings];
		}),
	);
}

/**
 * The form of a published config, for its next version. The id stays: a new id is a new action.
 * `parents` give the resource inputs of a node that the config extends.
 */
export function formOfConfig(
	config: Readonly<Record<string, unknown>>,
	parents: readonly NextNodeParent[],
): HttpActionForm {
	const contract = recordOf(config.contract);
	const flow = recordOf(contract.flow);
	const id = textOf(contract.id);
	const list = isRecord(config.list) ? config.list : undefined;
	const request = list ?? recordOf(config.request);
	const method = isMethod(request.method) ? request.method : 'GET';
	const derived = flowOf(method);
	const credentials = Array.isArray(contract.credentials)
		? contract.credentials.filter((name): name is string => typeof name === 'string')
		: [];
	const nodeId = typeof config.extends === 'string' ? config.extends : undefined;
	const parent = parents.find((node) => node.id === nodeId);
	const segments = id.split('.');
	const resource = segments.length === 3 ? segments[1] : undefined;
	const paging = list ? pagingOf(list.pages) : undefined;
	return {
		...emptyForm(),
		appName: textOf(recordOf(config.node).displayName),
		actionName: textOf(contract.action),
		summary: textOf(contract.summary),
		method,
		baseUrl: nodeId ? '' : textOf(config.baseUrl),
		path: textOf(request.path) || '/',
		query: valueRowsOf(request.query),
		headers: Object.entries(recordOf(request.headers)).map(([key, value]) => ({
			key,
			value: textOf(value),
		})),
		body: valueRowsOf(request.body),
		inputs: inputsOf(contract.input),
		response: list
			? { kind: 'list', items: textOf(list.items), ...(paging ? { paging } : {}) }
			: { kind: 'single' },
		...(isRecord(contract.output) ? { output: contract.output } : {}),
		...(nodeId
			? {
					extends: {
						node: nodeId,
						displayName: parent?.displayName ?? textOf(recordOf(config.node).displayName),
						credentialTypes: parent?.credentialTypes ?? credentials,
						...(resource ? { resource } : {}),
						resourceFields: (resource && parent?.resources[resource]) || [],
					},
				}
			: credentials[0]
				? { credentialType: credentials[0] }
				: {}),
		advanced: {
			id,
			...(isEffect(flow.effect) && flow.effect !== derived.effect ? { effect: flow.effect } : {}),
			...(typeof flow.idempotent === 'boolean' && flow.idempotent !== derived.idempotent
				? { idempotent: flow.idempotent }
				: {}),
		},
	};
}

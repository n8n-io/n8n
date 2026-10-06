import {
	isHttpError,
	isRecord,
	t,
	type FieldUi,
	type Http,
	type HttpRequest,
	type JsonSchema,
	type ResponsePage,
} from '@n8n/node-sdk';

/** An array body becomes one item per element; any other body becomes one item. */
export function toItems(body: unknown): Array<Record<string, unknown>> {
	if (Array.isArray(body)) return body.map((entry) => (isRecord(entry) ? entry : { data: entry }));
	return [isRecord(body) ? body : { data: body }];
}

export const common = {
	url: t.str().title('URL').hint('Full URL; never URL-encode an expression'),
	query: t
		.record(t.str())
		.title('Query Parameters')
		.hint('Never put secrets here; attach a credential')
		.optional(),
	headers: t
		.record(t.str())
		.title('Headers')
		.hint('Never put secrets here; attach a credential')
		.optional(),
};

const assignments: FieldUi<Readonly<Record<string, string>>> = { widget: 'assignments' };

/** The form of `common`: the query and the headers as n8n assignments. */
export const commonUi = { fields: { query: assignments, headers: assignments } };

/** The response options of the legacy node. A fixed value, so the build types the output. */
export const responseOptions = {
	fullResponse: t
		.bool()
		.with({ 'x-n8n-literal': true })
		.title('Include Response Headers and Status')
		.hint('true: one item { body, headers, statusCode } for the response')
		.optional(),
	neverError: t
		.bool()
		.with({ 'x-n8n-literal': true })
		.title('Never Error')
		.hint('true: a non-2xx response is no error; read its statusCode with fullResponse')
		.optional(),
};

const fullResponse = t.obj({
	body: t.jsonValue().hint('The parsed response body'),
	headers: t.record(t.str()).hint('Lower-case names'),
	statusCode: t.int(),
});

/**
 * The build reads the schema to type the items, so it is a literal. The host compares the output
 * that a run gives with it (`x-n8n-declared`).
 */
export const bodySchema = t
	.json()
	.with({ 'x-n8n-literal': true, 'x-n8n-declared': true })
	.title('Response Schema')
	.hint('Body JSON Schema from the API docs, not a sample. Types items; objects closed')
	.optional();

// The input takes any JSON object as the schema; the build reads only the keywords it knows.
const isJsonSchema = (value: unknown): value is JsonSchema => isRecord(value);

/** `schema` with each object that lists properties closed, unless it allows more. */
const closed = (schema: JsonSchema): JsonSchema => ({
	...schema,
	...(schema.properties
		? {
				properties: Object.fromEntries(
					Object.entries(schema.properties).map(([key, child]) => [key, closed(child)]),
				),
				additionalProperties: schema.additionalProperties ?? false,
			}
		: {}),
	...(schema.items ? { items: closed(schema.items) } : {}),
	...(schema.anyOf ? { anyOf: schema.anyOf.map(closed) } : {}),
	...(schema.oneOf ? { oneOf: schema.oneOf.map(closed) } : {}),
});

/** The item of one list entry, as `toItems` makes it: an entry that is no object goes in `data`. */
const entryItemOf = (entry: JsonSchema): JsonSchema =>
	entry.type === 'object' || entry.properties
		? entry
		: {
				type: 'object',
				properties: { data: entry },
				required: ['data'],
				additionalProperties: false,
			};

/** `items` as a plain read of the body, e.g. `={{ $response.body.data.list }}`. */
const ITEMS_PATH = /^=\{\{\s*\$response\.body((?:\.[A-Za-z_$][\w$]*)*)\s*\}\}$/;

/** The schema at a dot path of `schema`, or `undefined` when the path leaves it. */
const schemaAt = (schema: JsonSchema, path: readonly string[]): JsonSchema | undefined =>
	path.reduce<JsonSchema | undefined>((at, key) => at?.properties?.[key], schema);

/** The schema of each item for the declared `body`: an array body gives one item per entry. */
function itemOfBody(body: JsonSchema, items: unknown): JsonSchema | undefined {
	if (items === undefined) {
		return body.type === 'array' && body.items ? entryItemOf(body.items) : body;
	}
	const path = typeof items === 'string' ? ITEMS_PATH.exec(items)?.[1] : undefined;
	const list = path === undefined ? undefined : schemaAt(body, path.split('.').slice(1));
	return list?.type === 'array' && list.items ? entryItemOf(list.items) : undefined;
}

/**
 * The output for the response options and a declared body `schema`: `fullResponse: true` gives
 * one `{ body, headers, statusCode }` item, else each item comes from the body as `toItems`
 * makes it. Without a schema, or for an `items` value that is no plain read, it is `output`.
 */
export const responseOutputOf =
	(output: JsonSchema) =>
	(input: {
		readonly fullResponse?: boolean;
		readonly schema?: unknown;
		readonly items?: unknown;
	}): JsonSchema => {
		const body = isJsonSchema(input.schema) ? closed(input.schema) : undefined;
		if (input.fullResponse === true) {
			return body
				? { ...fullResponse.json, properties: { ...fullResponse.json.properties, body } }
				: fullResponse.json;
		}
		return (body && itemOfBody(body, input.items)) ?? output;
	};

/** The page of a full response. A header with more values joins them, as `fetch` does. */
export const responsePageOf = (response: unknown): ResponsePage => {
	const full = isRecord(response) ? response : {};
	const headers = isRecord(full.headers) ? full.headers : {};
	return {
		body: full.body,
		headers: Object.fromEntries(
			Object.entries(headers).map(([key, value]) => [
				key.toLowerCase(),
				Array.isArray(value) ? value.join(', ') : String(value),
			]),
		),
		statusCode: typeof full.statusCode === 'number' ? full.statusCode : 0,
	};
};

/**
 * The body of one request, or with `fullResponse` its page. With `neverError`, a non-2xx
 * response gives its body or page as the legacy node does, and does not fail the run.
 */
export async function responseOf(
	http: Http,
	request: HttpRequest,
	options: { readonly fullResponse?: boolean; readonly neverError?: boolean },
): Promise<unknown> {
	try {
		if (!options.fullResponse) return await http.request(request);
		return responsePageOf(await http.request({ ...request, fullResponse: true }));
	} catch (error) {
		if (!options.neverError || !isHttpError(error)) throw error;
		const { body, headers, status } = error;
		return options.fullResponse ? { body, headers, statusCode: status } : body;
	}
}

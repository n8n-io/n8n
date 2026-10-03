import {
	isHttpError,
	isRecord,
	t,
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
	url: t.str().hint('Full URL; never URL-encode an expression'),
	query: t.record(t.str()).hint('Never put secrets here; attach a credential').optional(),
	headers: t.record(t.str()).hint('Never put secrets here; attach a credential').optional(),
};

/** The response options of the legacy node. A fixed value, so the build types the output. */
export const responseOptions = {
	fullResponse: t
		.bool()
		.with({ 'x-n8n-literal': true })
		.hint('true: one item { body, headers, statusCode } for the response')
		.optional(),
	neverError: t
		.bool()
		.with({ 'x-n8n-literal': true })
		.hint('true: a non-2xx response is no error; read its statusCode with fullResponse')
		.optional(),
};

const fullResponse = t.obj({
	body: t.jsonValue().hint('The parsed response body'),
	headers: t.record(t.str()).hint('Lower-case names'),
	statusCode: t.int(),
});

/** The output of `fullResponse: true`, else `output`. */
export const responseOutputOf =
	(output: JsonSchema) =>
	({ fullResponse: full }: { readonly fullResponse?: boolean }) =>
		full === true ? fullResponse.json : output;

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

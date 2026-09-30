import {
	bool,
	compact,
	num,
	obj,
	openObj,
	record,
	str,
	tagOf,
	toKeyValueParameters,
	toObjectParameter,
	variant,
} from '../helpers';
import type { ActionContract, ContractInput, JsonSchema } from '../types';

const stringMap: JsonSchema = { type: 'object', additionalProperties: { type: 'string' } };

const GENERIC_AUTH_TYPES = [
	'httpTemplatedCustomAuth',
	'httpBearerAuth',
	'httpHeaderAuth',
	'httpQueryAuth',
	'httpBasicAuth',
	'httpDigestAuth',
	'oAuth1Api',
	'oAuth2Api',
] as const;

function compileAuth(auth: unknown) {
	const { credentialType } = record(auth);
	switch (tagOf(auth, 'kind')) {
		case 'predefined':
			return { authentication: 'predefinedCredentialType', nodeCredentialType: credentialType };
		case 'generic':
			return { authentication: 'genericCredentialType', genericAuthType: credentialType };
		default:
			return { authentication: 'none' };
	}
}

function compileBody(body: unknown) {
	const { json, fields, binaryField, contentType, text } = record(body);
	switch (tagOf(body, 'kind')) {
		case 'json':
			return {
				sendBody: true,
				contentType: 'json',
				specifyBody: 'json',
				jsonBody: toObjectParameter(json),
			};
		case 'form':
			return {
				sendBody: true,
				contentType: 'form-urlencoded',
				specifyBody: 'keypair',
				bodyParameters: toKeyValueParameters(fields),
			};
		case 'multipart':
			return {
				sendBody: true,
				contentType: 'multipart-form-data',
				bodyParameters: toKeyValueParameters(fields),
			};
		case 'binary':
			return { sendBody: true, contentType: 'binaryData', inputDataFieldName: binaryField };
		case 'raw':
			return { sendBody: true, contentType: 'raw', rawContentType: contentType, body: text };
		default:
			return { sendBody: false };
	}
}

function compileResponse(response: unknown) {
	const { fullResponse, neverError, binaryField, field } = record(response);
	const format = tagOf(response, 'format') ?? 'auto';
	return {
		response: compact({
			fullResponse: fullResponse === true ? true : undefined,
			neverError: neverError === true ? true : undefined,
			responseFormat: format === 'auto' ? undefined : format,
			outputPropertyName: format === 'file' ? binaryField : format === 'text' ? field : undefined,
		}),
	};
}

function compilePagination(pagination: unknown) {
	const mode = tagOf(pagination, 'mode') ?? 'off';
	if (mode === 'off') return undefined;
	const { nextUrl, parameters, until, maxPages, intervalMs } = record(pagination);
	const untilKind = tagOf(until, 'kind') ?? 'emptyResponse';
	const untilValue = record(until);
	return compact({
		paginationMode:
			mode === 'nextUrl' ? 'responseContainsNextURL' : 'updateAParameterInEachRequest',
		nextURL: mode === 'nextUrl' ? nextUrl : undefined,
		parameters:
			mode === 'updateParameter'
				? {
						parameters: (Array.isArray(parameters) ? parameters : []).map((parameter) => {
							const { in: location, name, value } = record(parameter);
							return { type: location ?? 'qs', name, value };
						}),
					}
				: undefined,
		paginationCompleteWhen:
			untilKind === 'statusCodes'
				? 'receiveSpecificStatusCodes'
				: untilKind === 'expression'
					? 'other'
					: 'responseIsEmpty',
		statusCodesWhenComplete: untilKind === 'statusCodes' ? untilValue.codes : undefined,
		completeExpression: untilKind === 'expression' ? untilValue.expression : undefined,
		limitPagesFetched: typeof maxPages === 'number' ? true : undefined,
		maxRequests: maxPages,
		requestInterval: intervalMs,
	});
}

function compileRequest(input: ContractInput) {
	const pagination = compilePagination(input.pagination);
	const query = record(input.query);
	const headers = record(input.headers);
	return {
		method: input.method ?? 'GET',
		url: input.url,
		...compileAuth(input.auth),
		...(Object.keys(query).length
			? { sendQuery: true, specifyQuery: 'keypair', queryParameters: toKeyValueParameters(query) }
			: {}),
		...(Object.keys(headers).length
			? {
					sendHeaders: true,
					specifyHeaders: 'keypair',
					headerParameters: toKeyValueParameters(headers),
				}
			: {}),
		...compileBody(input.body),
		options: compact({
			...compileResponse(input.response),
			pagination: pagination ? { pagination } : undefined,
			timeout: input.timeoutMs,
		}),
	};
}

const paginationUntil = variant('kind', {
	emptyResponse: { hint: 'Stop when a page comes back empty' },
	statusCodes: { properties: { codes: str('Comma-separated, e.g. 404') }, required: ['codes'] },
	expression: {
		properties: { expression: str('e.g. ={{ !$response.body.has_more }}') },
		required: ['expression'],
	},
});

const LITERAL_BINARY_FIELD = str('Binary property name, e.g. data. A plain name, not {{ }}', {
	'x-n8n-literal': true,
	default: 'data',
});

export const httpRequest: ActionContract = {
	id: 'httpRequest.request',
	node: 'httpRequest',
	action: 'Make an HTTP request',
	summary: 'Call any HTTP API. Use a dedicated node when one exists for the service.',
	flow: { effect: 'write', cardinality: 'per-item', passthrough: 'replace', idempotent: false },
	credentials: GENERIC_AUTH_TYPES,
	input: obj(
		{
			method: {
				enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
				default: 'GET',
			},
			url: str('Expressions go inside ={{ }}; never URL-encode the braces'),
			auth: variant(
				'kind',
				{
					none: {},
					predefined: {
						hint: 'An n8n credential for this service, e.g. notionApi',
						properties: { credentialType: str() },
						required: ['credentialType'],
					},
					generic: {
						properties: { credentialType: { enum: GENERIC_AUTH_TYPES } },
						required: ['credentialType'],
					},
				},
				{ default: { kind: 'none' } },
			),
			query: { ...stringMap, 'x-n8n-hint': 'Never put secrets here; use auth' },
			headers: { ...stringMap, 'x-n8n-hint': 'Never put secrets here; use auth' },
			body: variant(
				'kind',
				{
					none: {},
					json: {
						hint: 'A JSON object; leaves may be ={{ }}. Never a hand-built JSON string',
						properties: { json: { type: 'object', additionalProperties: true } },
						required: ['json'],
					},
					form: { properties: { fields: stringMap }, required: ['fields'] },
					multipart: { properties: { fields: stringMap }, required: ['fields'] },
					binary: {
						hint: 'Send an input binary file as the whole body',
						properties: { binaryField: LITERAL_BINARY_FIELD },
						required: ['binaryField'],
					},
					raw: {
						properties: { contentType: str('e.g. text/plain'), text: str() },
						required: ['contentType', 'text'],
					},
				},
				{ default: { kind: 'none' } },
			),
			response: variant(
				'format',
				{
					auto: {
						hint: 'Item is the parsed response body',
						properties: { fullResponse: bool(), neverError: bool() },
					},
					json: { properties: { fullResponse: bool(), neverError: bool() } },
					text: {
						properties: { field: str('Output field for the text', { default: 'data' }) },
					},
					file: { hint: 'Body saved as binary', properties: { binaryField: LITERAL_BINARY_FIELD } },
				},
				{ default: { format: 'auto' } },
			),
			pagination: variant(
				'mode',
				{
					off: {},
					nextUrl: {
						properties: {
							nextUrl: str('Expression over $response, e.g. ={{ $response.body.next }}'),
							until: paginationUntil,
							maxPages: num(),
							intervalMs: num(),
						},
						required: ['nextUrl', 'until'],
					},
					updateParameter: {
						properties: {
							parameters: {
								type: 'array',
								minItems: 1,
								items: obj(
									{
										in: { enum: ['qs', 'body', 'headers'] },
										name: str(),
										value: str('e.g. ={{ $response.body.next_cursor }}'),
									},
									['in', 'name', 'value'],
								),
							},
							until: paginationUntil,
							maxPages: num(),
							intervalMs: num(),
						},
						required: ['parameters', 'until'],
					},
				},
				{
					default: { mode: 'off' },
					'x-n8n-hint': 'One node fetches every page; no loop nodes needed',
				},
			),
			timeoutMs: num(),
		},
		['url'],
	),
	output: openObj(),
	deriveOutput: (input) => {
		const response = record(input.response);
		const format = tagOf(response, 'format') ?? 'auto';
		if (format === 'file') return obj({}, [], { 'x-n8n-hint': 'Body is in binary, not $json' });
		if (format === 'text')
			return obj({ [typeof response.field === 'string' ? response.field : 'data']: str() });
		if (response.fullResponse === true) {
			return obj({ body: openObj(), headers: openObj(), statusCode: num(), statusMessage: str() });
		}
		return openObj();
	},
	example: {
		method: 'POST',
		url: 'https://api.example.com/messages',
		body: { kind: 'json', json: { message: '={{ $json.text }}', channel: 'ops' } },
	},
	compile: {
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4.5,
		parameters: compileRequest,
	},
};

import { HttpHeaderAuth } from 'n8n-nodes-base/dist/credentials/HttpHeaderAuth.credentials';
import { HttpRequest } from 'n8n-nodes-base/dist/nodes/HttpRequest/HttpRequest.node';

import { getRequest } from '../../nodes/http-request/actions/get';
import { sendRequest } from '../../nodes/http-request/actions/send';
import {
	actionNode,
	compareRuns,
	runNode,
	type AllowedDifference,
	type ParityCase,
} from './harness';

const URL = 'https://api.example.com/v1/tasks';

const credential: ParityCase['credential'] = {
	data: { name: 'X-Api-Key', value: 'key-parity' },
	types: [new HttpHeaderAuth()],
};

const HEADERS = ['x-api-key', 'x-trace', 'content-type', 'accept'];

/** The action reads JSON only; the legacy node autodetects the response format. */
const jsonOnly = (method: string, count: number): AllowedDifference[] =>
	Array.from({ length: count }, (_, index) => ({
		path: `requests.${method} ${URL} #${index}.headers.accept`,
		kind: 'intended',
		reason: 'The action reads JSON responses only, so it asks for application/json.',
	}));

const legacyNode = (parameters: Record<string, unknown>) => ({
	nodeType: new HttpRequest(),
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.5,
	credential: 'httpHeaderAuth',
	parameters: {
		authentication: 'genericCredentialType',
		genericAuthType: 'httpHeaderAuth',
		url: URL,
		sendQuery: true,
		queryParameters: { parameters: [{ name: 'status', value: 'open' }] },
		sendHeaders: true,
		headerParameters: { parameters: [{ name: 'X-Trace', value: 'parity' }] },
		...parameters,
	},
});

describe('httpRequest.get parity with HTTP Request v4.5 GET', () => {
	const parityCase: ParityCase = {
		credential,
		headers: HEADERS,
		input: [{}],
		routes: [
			{
				method: 'GET',
				url: URL,
				query: { cursor: 'c2' },
				json: { tasks: [{ id: 3 }], next_cursor: null },
			},
			{
				method: 'GET',
				url: URL,
				times: 1,
				json: { tasks: [{ id: 1 }, { id: 2 }], next_cursor: 'c2' },
			},
		],
	};

	const ALLOWED: readonly AllowedDifference[] = jsonOnly('GET', 2);

	it('sends the same requests and emits the same items', async () => {
		const legacy = await runNode(
			legacyNode({
				method: 'GET',
				options: {
					pagination: {
						pagination: {
							paginationMode: 'updateAParameterInEachRequest',
							parameters: {
								parameters: [
									{ type: 'qs', name: 'cursor', value: '={{ $response.body.next_cursor }}' },
								],
							},
							paginationCompleteWhen: 'other',
							completeExpression: '={{ !$response.body.next_cursor }}',
							limitPagesFetched: true,
							maxRequests: 100,
						},
					},
				},
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				getRequest,
				{
					authentication: 'httpHeaderAuth',
					url: URL,
					query: { status: 'open' },
					headers: { 'X-Trace': 'parity' },
					pagination: { cursorPath: 'next_cursor', queryParameter: 'cursor', maxPages: 100 },
				},
				'httpHeaderAuth',
			),
			parityCase,
		);
		expect(legacy.error).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

describe('httpRequest.send parity with HTTP Request v4.5 POST', () => {
	const parityCase: ParityCase = {
		credential,
		headers: HEADERS,
		input: [{}, {}],
		routes: [{ method: 'POST', url: URL, json: { id: 7, created: true } }],
	};

	const ALLOWED: readonly AllowedDifference[] = jsonOnly('POST', 2);

	it('sends the same requests and emits the same items', async () => {
		const body = { title: 'Ship', tags: ['a', 'b'], done: false };
		const legacy = await runNode(
			legacyNode({
				method: 'POST',
				sendBody: true,
				contentType: 'json',
				specifyBody: 'json',
				jsonBody: JSON.stringify(body),
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				sendRequest,
				{
					authentication: 'httpHeaderAuth',
					method: 'POST',
					url: URL,
					query: { status: 'open' },
					headers: { 'X-Trace': 'parity' },
					body: { kind: 'json', json: body },
				},
				'httpHeaderAuth',
			),
			parityCase,
		);
		expect(legacy.error).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});

	it('sends the same form body', async () => {
		const legacy = await runNode(
			legacyNode({
				method: 'POST',
				sendBody: true,
				contentType: 'form-urlencoded',
				bodyParameters: {
					parameters: [
						{ name: 'title', value: 'Ship it' },
						{ name: 'owner', value: 'a&b' },
					],
				},
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				sendRequest,
				{
					authentication: 'httpHeaderAuth',
					method: 'POST',
					url: URL,
					query: { status: 'open' },
					headers: { 'X-Trace': 'parity' },
					body: { kind: 'form', fields: { title: 'Ship it', owner: 'a&b' } },
				},
				'httpHeaderAuth',
			),
			parityCase,
		);
		expect(legacy.error).toBeUndefined();
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});

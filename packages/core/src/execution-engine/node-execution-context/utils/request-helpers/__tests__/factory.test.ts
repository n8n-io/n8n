import type { HttpRequestClient } from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	IExecuteFunctions,
	INode,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { httpRequestWithAuthentication, requestWithAuthentication } from '../authentication';
import { getRequestHelperFunctions } from '../factory';
import { proxyRequestToAxios } from '../legacy-request-adapter';

vi.mock('../authentication', () => ({
	httpRequestWithAuthentication: vi.fn(),
	requestWithAuthentication: vi.fn(),
}));
vi.mock('../legacy-request-adapter', () => ({ proxyRequestToAxios: vi.fn() }));

describe('getRequestHelperFunctions trace headers', () => {
	const traceparent = `00-${'a'.repeat(32)}-${'b'.repeat(16)}-01`;
	const workflow = mock<Workflow>();
	const node = mock<INode>({ name: 'Notion', type: 'n8n-nodes-base.notion' });
	const context = mock<IExecuteFunctions>();
	const request = vi.fn();
	const url = 'https://api.example.com/items';

	const helpersWith = (otel: IWorkflowExecuteAdditionalData['otel']) =>
		getRequestHelperFunctions(
			workflow,
			node,
			mock<IWorkflowExecuteAdditionalData>({
				evalLlmMockHandler: undefined,
				executionId: 'exec-1',
				otel,
			}),
		);
	const injectTraceHeaders = (
		_executionId: string,
		_nodeName: string | undefined,
		headers: Record<string, string>,
	) => {
		headers.traceparent = traceparent;
	};
	const traced = helpersWith({
		injectTraceHeaders,
		traceId: () => 'a'.repeat(32),
		nodeContractsEnabled: true,
	});
	const untraced = helpersWith({
		injectTraceHeaders: () => {},
		traceId: () => undefined,
		nodeContractsEnabled: true,
	});
	const tracedWithoutContracts = helpersWith({
		injectTraceHeaders,
		traceId: () => 'a'.repeat(32),
		nodeContractsEnabled: false,
	});

	beforeEach(() => {
		vi.resetAllMocks();
		Container.set(
			OutboundHttp,
			mock<OutboundHttp>({ requests: () => mock<HttpRequestClient>({ request }) }),
		);
	});

	test('httpRequestWithAuthentication sends the traceparent to the auth helper, so it signs it', async () => {
		const options = { url, headers: { accept: 'application/json' } };

		await traced.httpRequestWithAuthentication.call(context, 'notionApi', options);

		expect(vi.mocked(httpRequestWithAuthentication).mock.calls[0][1]).toEqual({
			url,
			headers: { accept: 'application/json', traceparent },
		});
		expect(options.headers).toEqual({ accept: 'application/json' });
	});

	test('requestWithAuthentication sends the traceparent to the auth helper', async () => {
		await traced.requestWithAuthentication.call(context, 'notionApi', { uri: url });

		expect(vi.mocked(requestWithAuthentication).mock.calls[0][1]).toEqual({
			uri: url,
			headers: { traceparent },
		});
	});

	test('keeps a traceparent that the node set', async () => {
		const own = `00-${'c'.repeat(32)}-${'d'.repeat(16)}-01`;

		await traced.httpRequestWithAuthentication.call(context, 'notionApi', {
			url,
			headers: { Traceparent: own },
		});
		await traced.httpRequest({ url, headers: { traceparent: own } });
		await traced.request(url, { headers: { traceparent: own } });

		expect(vi.mocked(httpRequestWithAuthentication).mock.calls[0][1].headers).toEqual({
			Traceparent: own,
		});
		expect(request.mock.calls[0][0].headers).toEqual({ traceparent: own });
		expect(vi.mocked(proxyRequestToAxios).mock.calls[0][4]).toEqual({
			headers: { traceparent: own },
		});
	});

	test('adds no header when no trace is active', async () => {
		const options = { url };

		await untraced.httpRequestWithAuthentication.call(context, 'notionApi', options);
		await untraced.request(url);

		expect(vi.mocked(httpRequestWithAuthentication).mock.calls[0][1]).toBe(options);
		expect(vi.mocked(proxyRequestToAxios).mock.calls[0][4]).toEqual({});
	});

	test('httpRequest and request add the traceparent', async () => {
		await traced.httpRequest({ url });
		await traced.request(url);
		await traced.request({ uri: url });

		expect(request.mock.calls[0][0].headers).toEqual({ traceparent });
		expect(vi.mocked(proxyRequestToAxios).mock.calls[0][4]).toEqual({ headers: { traceparent } });
		expect(vi.mocked(proxyRequestToAxios).mock.calls[1][3]).toEqual({
			uri: url,
			headers: { traceparent },
		});
	});

	describe('with node contracts disabled', () => {
		test('authenticated helpers send the caller options without trace headers', async () => {
			const httpOptions = { url, headers: { accept: 'application/json' } };
			const requestOptions = { uri: url };

			await tracedWithoutContracts.httpRequestWithAuthentication.call(
				context,
				'notionApi',
				httpOptions,
			);
			await tracedWithoutContracts.requestWithAuthentication.call(
				context,
				'notionApi',
				requestOptions,
			);

			expect(vi.mocked(httpRequestWithAuthentication).mock.calls[0][1]).toBe(httpOptions);
			expect(httpOptions).toEqual({ url, headers: { accept: 'application/json' } });
			expect(vi.mocked(requestWithAuthentication).mock.calls[0][1]).toBe(requestOptions);
			expect(requestOptions).toEqual({ uri: url });
		});

		test('httpRequest and request write the trace headers into the caller options', async () => {
			const own = `00-${'c'.repeat(32)}-${'d'.repeat(16)}-01`;
			const httpOptions = { url, headers: { traceparent: own } };
			const options = {};
			const requestOptions = { uri: url };

			await tracedWithoutContracts.httpRequest(httpOptions);
			await tracedWithoutContracts.request(url, options);
			await tracedWithoutContracts.request(requestOptions);

			expect(request.mock.calls[0][0]).toBe(httpOptions);
			expect(httpOptions.headers).toEqual({ traceparent });
			expect(vi.mocked(proxyRequestToAxios).mock.calls[0][4]).toBe(options);
			expect(options).toEqual({ headers: { traceparent } });
			expect(vi.mocked(proxyRequestToAxios).mock.calls[1][3]).toBe(requestOptions);
			expect(requestOptions).toEqual({ uri: url, headers: { traceparent } });
		});
	});
});

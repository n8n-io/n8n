import { sleep } from '@n8n/utils/sleep';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INode,
	JsonObject,
} from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { DATABRICKS_PARTNER_USER_AGENT } from '../constants';
import { lakebaseApiRequest } from '../transport';

vi.mock('@n8n/utils/sleep', () => ({
	sleep: vi.fn().mockResolvedValue(undefined),
}));

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

class AxiosError extends Error {
	constructor(
		message: string,
		readonly response: { status: number; data: unknown; headers?: Record<string, string> },
	) {
		super(message);
	}
}

const apiError = (status: number, data: unknown, headers?: Record<string, string>) =>
	new NodeApiError(
		node,
		new AxiosError(`Request failed with status code ${status}`, {
			status,
			data,
			headers,
		}) as unknown as JsonObject,
	);

const expiredJwt = () => apiError(400, { message: 'JWT token has expired' });
const pgrst205 = () =>
	apiError(404, {
		code: 'PGRST205',
		message: "Could not find the table 'public.orders' in the schema cache",
		hint: null,
		details: null,
	});

const request: IHttpRequestOptions = {
	method: 'GET',
	url: 'https://ep.example.com/api/2.0/workspace/123/rest/db/public/orders',
	json: true,
};

describe('lakebaseApiRequest', () => {
	let httpRequestWithAuthentication: Mock;
	let refreshOAuth2Token: Mock;
	let context: ReturnType<typeof mock<IExecuteFunctions>>;

	const sleepDurations = () => vi.mocked(sleep).mock.calls.map(([ms]) => ms);
	const capturedOptions = (call = 0) =>
		httpRequestWithAuthentication.mock.calls[call][1] as IHttpRequestOptions;

	beforeEach(() => {
		vi.mocked(sleep).mockClear();
		httpRequestWithAuthentication = vi.fn();
		refreshOAuth2Token = vi.fn().mockResolvedValue(undefined);
		context = mock<IExecuteFunctions>({
			getInputData: vi.fn(),
			getNode: () => node,
			getExecutionCancelSignal: () => undefined,
			helpers: { httpRequestWithAuthentication, refreshOAuth2Token },
		});
		context.getNodeParameter.mockReturnValue('oAuth2');
	});

	it('sends the partner User-Agent', async () => {
		httpRequestWithAuthentication.mockResolvedValueOnce([]);

		await lakebaseApiRequest(context, request);

		expect(httpRequestWithAuthentication.mock.calls[0][0]).toBe('databricksOAuth2Api');
		expect(capturedOptions().headers).toEqual({ 'User-Agent': DATABRICKS_PARTNER_USER_AGENT });
		expect(httpRequestWithAuthentication.mock.calls[0][2]).toEqual({
			oauth2: { skipRefreshWhileTokenIsFresh: true },
		});
	});

	it.each([
		[400, { message: 'JWT token has expired' }],
		[400, { error: { message: 'JWT token has expired' } }],
		[401, { code: 'PGRST301', message: 'JWT expired' }],
	])('refreshes the token once on an expired-JWT %s and resends', async (status, body) => {
		httpRequestWithAuthentication
			.mockRejectedValueOnce(apiError(status, body))
			.mockResolvedValueOnce([{ id: 1 }]);

		await expect(lakebaseApiRequest(context, request)).resolves.toEqual([{ id: 1 }]);

		expect(refreshOAuth2Token).toHaveBeenCalledTimes(1);
		expect(refreshOAuth2Token).toHaveBeenCalledWith('databricksOAuth2Api');
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
		const [firstHttp, secondHttp] = httpRequestWithAuthentication.mock.invocationCallOrder;
		const [refresh] = refreshOAuth2Token.mock.invocationCallOrder;
		expect(firstHttp).toBeLessThan(refresh);
		expect(refresh).toBeLessThan(secondHttp);
		expect(httpRequestWithAuthentication.mock.calls[1][0]).toBe('databricksOAuth2Api');
		expect(capturedOptions(1)).toMatchObject({ url: request.url, method: request.method });
	});

	it('does not refresh twice', async () => {
		const first = expiredJwt();
		const second = expiredJwt();
		httpRequestWithAuthentication.mockRejectedValueOnce(first).mockRejectedValueOnce(second);

		await expect(lakebaseApiRequest(context, request)).rejects.toBe(second);

		expect(refreshOAuth2Token).toHaveBeenCalledTimes(1);
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
	});

	it('surfaces the refresh error', async () => {
		const refreshError = new NodeOperationError(node, 'needs to be reconnected');
		httpRequestWithAuthentication.mockRejectedValueOnce(expiredJwt());
		refreshOAuth2Token.mockRejectedValueOnce(refreshError);

		await expect(lakebaseApiRequest(context, request)).rejects.toBe(refreshError);

		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('wraps a plain refresh error in NodeApiError', async () => {
		httpRequestWithAuthentication.mockRejectedValueOnce(expiredJwt());
		refreshOAuth2Token.mockRejectedValueOnce(new Error('invalid_client'));

		const thrown = await lakebaseApiRequest(context, request).catch((error: unknown) => error);

		expect(thrown).toBeInstanceOf(NodeApiError);
		expect(thrown).toMatchObject({ message: 'invalid_client' });
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
	});

	it('retries once after PGRST205 and returns the second response', async () => {
		httpRequestWithAuthentication
			.mockRejectedValueOnce(pgrst205())
			.mockResolvedValueOnce([{ id: 1 }]);

		await expect(lakebaseApiRequest(context, request)).resolves.toEqual([{ id: 1 }]);

		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
		expect(sleepDurations()).toEqual([1000]);
	});

	it('fails on the second PGRST205 with the original error', async () => {
		const first = pgrst205();
		const second = pgrst205();
		httpRequestWithAuthentication.mockRejectedValueOnce(first).mockRejectedValueOnce(second);

		await expect(lakebaseApiRequest(context, request)).rejects.toBe(second);

		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
		expect(sleep).toHaveBeenCalledTimes(1);
		expect(refreshOAuth2Token).not.toHaveBeenCalled();
	});

	it.each([
		['a bad filter 400', 400, { code: 'PGRST100', message: 'unexpected "x" expecting ...' }],
		['a permissions 401', 401, { code: 'PGRST301', message: 'invalid token permissions' }],
		['an expired-token 403', 403, { message: 'JWT token has expired' }],
		['an unrelated expiry 400', 400, { message: 'session expired' }],
		['a transport error', undefined, undefined],
	])('throws %s without refreshing', async (_label, status, body) => {
		const error = status === undefined ? new Error('socket hang up') : apiError(status, body);
		httpRequestWithAuthentication.mockRejectedValueOnce(error);

		await expect(lakebaseApiRequest(context, request)).rejects.toBe(error);

		expect(refreshOAuth2Token).not.toHaveBeenCalled();
		expect(sleep).not.toHaveBeenCalled();
		if (error instanceof NodeApiError) expect(error.context.data).toEqual(body);
	});

	it.each([
		['refresh first', () => [expiredJwt(), pgrst205()]],
		['schema retry first', () => [pgrst205(), expiredJwt()]],
	])('allows one refresh and one schema retry in the same call, %s', async (_label, makeErrors) => {
		const [first, second] = makeErrors();
		httpRequestWithAuthentication
			.mockRejectedValueOnce(first)
			.mockRejectedValueOnce(second)
			.mockResolvedValueOnce([{ id: 1 }]);

		await expect(lakebaseApiRequest(context, request)).resolves.toEqual([{ id: 1 }]);

		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(3);
		expect(refreshOAuth2Token).toHaveBeenCalledTimes(1);
		expect(sleep).toHaveBeenCalledTimes(1);
	});

	it('still retries 429 through databricksApiRequest', async () => {
		httpRequestWithAuthentication
			.mockRejectedValueOnce(
				apiError(429, { error_code: 'RESOURCE_EXHAUSTED' }, { 'retry-after': '2' }),
			)
			.mockResolvedValueOnce([]);

		await expect(lakebaseApiRequest(context, request)).resolves.toEqual([]);

		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
		expect(refreshOAuth2Token).not.toHaveBeenCalled();
		expect(sleepDurations()).toEqual([2000]);
	});

	it('passes the execution cancel signal to the schema-cache sleep', async () => {
		const signal = new AbortController().signal;
		context = mock<IExecuteFunctions>({
			getInputData: vi.fn(),
			getNode: () => node,
			getExecutionCancelSignal: () => signal,
			helpers: { httpRequestWithAuthentication, refreshOAuth2Token },
		});
		context.getNodeParameter.mockReturnValue('oAuth2');
		httpRequestWithAuthentication.mockRejectedValueOnce(pgrst205()).mockResolvedValueOnce([]);

		await lakebaseApiRequest(context, request);

		expect(sleep).toHaveBeenCalledWith(1000, signal);
	});

	it('refuses personal access token auth before any request', async () => {
		context.getNodeParameter.mockReturnValue('accessToken');

		const thrown = await lakebaseApiRequest(context, request).catch((error: unknown) => error);

		expect(thrown).toBeInstanceOf(NodeOperationError);
		expect(thrown).toMatchObject({ message: 'Lakebase requires OAuth2 authentication' });
		expect(httpRequestWithAuthentication).not.toHaveBeenCalled();
		expect(refreshOAuth2Token).not.toHaveBeenCalled();
	});

	it('works on a context without an item index or cancel signal', async () => {
		// A plain object, not a proxy mock: an unguarded read of the cancel signal must throw here
		const getNodeParameter = vi.fn().mockReturnValue('oAuth2');
		const loadOptionsContext = {
			getNode: () => node,
			getNodeParameter,
			helpers: { httpRequestWithAuthentication, refreshOAuth2Token },
		} as unknown as ILoadOptionsFunctions;
		httpRequestWithAuthentication
			.mockRejectedValueOnce(expiredJwt())
			.mockRejectedValueOnce(pgrst205())
			.mockResolvedValueOnce([{ id: 1 }]);

		await expect(lakebaseApiRequest(loadOptionsContext, request)).resolves.toEqual([{ id: 1 }]);

		expect(getNodeParameter).toHaveBeenCalledWith('authentication', 'accessToken');
		expect(refreshOAuth2Token).toHaveBeenCalledTimes(1);
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(3);
		expect(sleep).toHaveBeenCalledWith(1000, undefined);
	});
});

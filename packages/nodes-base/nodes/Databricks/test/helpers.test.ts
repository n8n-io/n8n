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
import { mock, mockDeep } from 'vitest-mock-extended';

import { databricksApiRequest, readIdParameter } from '../actions/helpers';
import { DATABRICKS_PARTNER_USER_AGENT } from '../constants';

vi.mock('@n8n/utils/sleep', () => ({
	sleep: vi.fn().mockResolvedValue(undefined),
}));

describe('databricksApiRequest', () => {
	let httpRequestWithAuthentication: Mock;
	let context: IExecuteFunctions;

	beforeEach(() => {
		httpRequestWithAuthentication = vi.fn().mockResolvedValue({});
		context = mock<IExecuteFunctions>({
			getNode: () => mock<INode>({ typeVersion: 1 }),
			helpers: { httpRequestWithAuthentication },
		});
	});

	const capturedOptions = () =>
		httpRequestWithAuthentication.mock.calls[0][1] as Record<string, unknown>;

	it('should add the partner User-Agent alongside caller headers', async () => {
		await databricksApiRequest(context, 'databricksApi', {
			method: 'PUT',
			url: 'https://example.databricks.com/api/2.0/fs/files/x',
			headers: { 'Content-Type': 'application/octet-stream' },
		});

		expect(capturedOptions().headers).toEqual({
			'Content-Type': 'application/octet-stream',
			'User-Agent': 'n8n_DatabricksNode',
		});
	});

	it('should add headers when the caller supplies none', async () => {
		await databricksApiRequest(context, 'databricksApi', {
			method: 'GET',
			url: 'https://example.databricks.com/api/2.1/unity-catalog/catalogs',
		});

		expect(capturedOptions().headers).toEqual({ 'User-Agent': 'n8n_DatabricksNode' });
	});

	it('should override a caller-supplied User-Agent', async () => {
		await databricksApiRequest(context, 'databricksApi', {
			method: 'GET',
			url: 'https://example.databricks.com/api/2.1/unity-catalog/catalogs',
			headers: { 'User-Agent': 'something-else' },
		});

		expect(capturedOptions().headers).toEqual({ 'User-Agent': 'n8n_DatabricksNode' });
	});

	it('should pass non-header options through untouched', async () => {
		await databricksApiRequest(context, 'databricksApi', {
			method: 'GET',
			url: 'https://example.databricks.com/api/2.0/fs/files/x',
			encoding: 'arraybuffer',
			returnFullResponse: true,
			qs: { page_token: 'abc' },
			json: true,
		});

		expect(capturedOptions()).toEqual({
			method: 'GET',
			url: 'https://example.databricks.com/api/2.0/fs/files/x',
			encoding: 'arraybuffer',
			returnFullResponse: true,
			qs: { page_token: 'abc' },
			json: true,
			headers: { 'User-Agent': 'n8n_DatabricksNode' },
		});
	});

	it('should forward the credential type and bind the call to the passed context', async () => {
		// `fetchResourcesInSchema` in methods/listSearch.ts passes a context object
		// rather than `this`, so the receiver must come from the argument.
		const loadOptionsContext = mock<ILoadOptionsFunctions>({
			getNode: () => mock<INode>({ typeVersion: 1 }),
			helpers: { httpRequestWithAuthentication },
		});

		await databricksApiRequest(loadOptionsContext, 'databricksOAuth2Api', {
			method: 'GET',
			url: 'https://example.databricks.com/api/2.1/unity-catalog/volumes',
		});

		expect(httpRequestWithAuthentication.mock.calls[0][0]).toBe('databricksOAuth2Api');
		expect(httpRequestWithAuthentication.mock.instances[0]).toBe(loadOptionsContext);
	});

	it('should track the integration version rather than the node typeVersion', async () => {
		// A node instance pinned to an older typeVersion must still report the version
		// of the integration that is actually running.
		const staleContext = mock<IExecuteFunctions>({
			getNode: () => mock<INode>({ typeVersion: 0.1 }),
			helpers: { httpRequestWithAuthentication },
		});

		await databricksApiRequest(staleContext, 'databricksApi', {
			method: 'GET',
			url: 'https://example.databricks.com/api/2.1/unity-catalog/catalogs',
		});

		expect(capturedOptions().headers).toEqual({
			'User-Agent': DATABRICKS_PARTNER_USER_AGENT,
		});
	});

	it('should send the unversioned partner User-Agent', () => {
		expect(DATABRICKS_PARTNER_USER_AGENT).toBe('n8n_DatabricksNode');
	});
});

describe('databricksApiRequest rate limiting', () => {
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

	const apiError = (status: number, headers?: Record<string, string>) =>
		new NodeApiError(
			node,
			new AxiosError(`Request failed with status code ${status}`, {
				status,
				data: { error_code: 'RESOURCE_EXHAUSTED', message: 'Too many requests' },
				headers,
			}) as unknown as JsonObject,
		);

	const request: IHttpRequestOptions = {
		method: 'GET',
		url: 'https://example.databricks.com/api/2.2/jobs/runs/get',
	};
	let httpRequestWithAuthentication: Mock;
	let context: IExecuteFunctions;

	beforeEach(() => {
		vi.mocked(sleep).mockClear();
		httpRequestWithAuthentication = vi.fn();
		context = mock<IExecuteFunctions>({
			getNode: () => node,
			getExecutionCancelSignal: () => undefined,
			helpers: { httpRequestWithAuthentication },
		});
	});

	const sleepDurations = () => vi.mocked(sleep).mock.calls.map(([ms]) => ms);

	it('should wait for the Retry-After seconds after a 429 and return the next response', async () => {
		httpRequestWithAuthentication
			.mockRejectedValueOnce(apiError(429, { 'retry-after': '2' }))
			.mockResolvedValueOnce({ run_id: 1 });

		await expect(databricksApiRequest(context, 'databricksApi', request)).resolves.toEqual({
			run_id: 1,
		});

		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
		expect(sleepDurations()).toEqual([2000]);
	});

	it.each([
		['no header', undefined],
		['a non-numeric header', { 'retry-after': 'soon' }],
		['a zero header', { 'retry-after': '0' }],
	])('should wait one second when the 429 carries %s', async (_label, headers) => {
		httpRequestWithAuthentication
			.mockRejectedValueOnce(apiError(429, headers))
			.mockResolvedValueOnce({});

		await databricksApiRequest(context, 'databricksApi', request);

		expect(sleepDurations()).toEqual([1000]);
	});

	it('should cap the wait at 30 seconds', async () => {
		httpRequestWithAuthentication
			.mockRejectedValueOnce(apiError(429, { 'retry-after': '120' }))
			.mockResolvedValueOnce({});

		await databricksApiRequest(context, 'databricksApi', request);

		expect(sleepDurations()).toEqual([30000]);
	});

	it('should give up after three retries and rethrow the 429', async () => {
		const error = apiError(429, { 'retry-after': '1' });
		httpRequestWithAuthentication.mockRejectedValue(error);

		await expect(databricksApiRequest(context, 'databricksApi', request)).rejects.toBe(error);

		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(4);
		expect(sleepDurations()).toEqual([1000, 1000, 1000]);
	});

	it('should not retry other API errors', async () => {
		const error = apiError(503);
		httpRequestWithAuthentication.mockRejectedValue(error);

		await expect(databricksApiRequest(context, 'databricksApi', request)).rejects.toBe(error);

		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(sleep).not.toHaveBeenCalled();
	});

	it('should hand the execution cancel signal to the wait', async () => {
		const signal = new AbortController().signal;
		context = mock<IExecuteFunctions>({
			getNode: () => node,
			getExecutionCancelSignal: () => signal,
			helpers: { httpRequestWithAuthentication },
		});
		httpRequestWithAuthentication
			.mockRejectedValueOnce(apiError(429, { 'retry-after': '1' }))
			.mockResolvedValueOnce({});

		await databricksApiRequest(context, 'databricksApi', request);

		expect(sleep).toHaveBeenCalledWith(1000, signal);
	});

	it('should retry dropdown requests without a cancel signal', async () => {
		const loadOptionsContext = mock<ILoadOptionsFunctions>({
			getNode: () => node,
			helpers: { httpRequestWithAuthentication },
		});
		httpRequestWithAuthentication
			.mockRejectedValueOnce(apiError(429, { 'retry-after': '1' }))
			.mockResolvedValueOnce({ jobs: [] });

		await expect(
			databricksApiRequest(loadOptionsContext, 'databricksApi', request),
		).resolves.toEqual({ jobs: [] });

		expect(sleep).toHaveBeenCalledWith(1000, undefined);
	});
});

describe('readIdParameter', () => {
	const node: INode = {
		id: '1',
		name: 'Databricks',
		type: 'n8n-nodes-base.databricks',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
	const setupContext = (value: string) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getInputData.mockReturnValue([]);
		context.getNodeParameter.mockReturnValue(value);
		return context;
	};

	it('should read the resource locator value and return it as a number', () => {
		const context = setupContext('41847992357943');

		expect(readIdParameter(context, 1, 'runId', 'run')).toBe(41847992357943);
		expect(context.getNodeParameter).toHaveBeenCalledWith('runId', 1, '', { extractValue: true });
	});

	it.each([
		['', 'Job ID must be a whole number', 'Use the numeric ID shown in the job URL in Databricks.'],
		[
			'12a',
			'Job ID must be a whole number',
			'Use the numeric ID shown in the job URL in Databricks.',
		],
		[
			'9007199254740993',
			'Job ID is too large to send exactly',
			'IDs above 9007199254740991 lose precision in JavaScript, so the node cannot send this job ID.',
		],
	])('should reject %j with a user-facing error for the item', (value, message, description) => {
		const context = setupContext(value);

		let thrown: unknown;
		try {
			readIdParameter(context, 3, 'jobId', 'job');
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(NodeOperationError);
		expect(thrown).toMatchObject({ message, description, context: { itemIndex: 3 } });
	});
});

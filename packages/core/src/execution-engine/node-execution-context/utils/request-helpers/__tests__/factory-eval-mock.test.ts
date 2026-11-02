import type {
	IAllExecuteFunctions,
	IHttpRequestOptions,
	INode,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { EvalLlmMockHandler } from '@/execution-engine';

import { getRequestHelperFunctions } from '../factory';

describe('request helpers under the eval mock', () => {
	const workflow = mock<Workflow>();
	const node = mock<INode>({ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' });
	const notFound = {
		statusCode: 404,
		headers: { 'content-type': 'application/json' },
		body: { error: 'not found' },
	};
	const url = 'https://api.example.com/items';

	function helpersUnderMock(handler: EvalLlmMockHandler) {
		const additionalData = mockDeep<IWorkflowExecuteAdditionalData>();
		additionalData.evalLlmMockHandler = handler;
		additionalData.otel = undefined;
		return getRequestHelperFunctions(workflow, node, additionalData);
	}

	test('legacy request with simple:false resolves with the mocked 404 as a full response', async () => {
		const helpers = helpersUnderMock(vi.fn().mockResolvedValue(notFound));

		await expect(
			helpers.request({ uri: url, method: 'GET', simple: false, resolveWithFullResponse: true }),
		).resolves.toMatchObject({ statusCode: 404, body: { error: 'not found' } });
	});

	test('legacy request without simple:false rejects with the legacy 404 error shape', async () => {
		const helpers = helpersUnderMock(vi.fn().mockResolvedValue(notFound));

		await expect(
			helpers.request({ uri: url, method: 'GET', resolveWithFullResponse: true }),
		).rejects.toMatchObject({ statusCode: 404, response: { body: { error: 'not found' } } });
	});

	test('httpRequest with ignoreHttpStatusErrors resolves with the mocked 404 as a full response', async () => {
		const helpers = helpersUnderMock(vi.fn().mockResolvedValue(notFound));

		await expect(
			helpers.httpRequest({
				url,
				method: 'GET',
				ignoreHttpStatusErrors: true,
				returnFullResponse: true,
			}),
		).resolves.toMatchObject({ statusCode: 404, body: { error: 'not found' } });
	});

	test('httpRequest without ignoreHttpStatusErrors rejects with the axios 404 error shape', async () => {
		const helpers = helpersUnderMock(vi.fn().mockResolvedValue(notFound));

		await expect(helpers.httpRequest({ url, method: 'GET' })).rejects.toMatchObject({
			isAxiosError: true,
			response: { status: 404 },
		});
	});

	describe('AWS requests whose URL the credential builds', () => {
		const ok = { statusCode: 200, headers: {}, body: 'ok' };

		function setup() {
			const handler = vi.fn<EvalLlmMockHandler>().mockResolvedValue(ok);
			const additionalData = mockDeep<IWorkflowExecuteAdditionalData>();
			additionalData.evalLlmMockHandler = handler;
			additionalData.otel = undefined;
			const helpers = getRequestHelperFunctions(workflow, node, additionalData);
			const context = { getCredentials: vi.fn() } as unknown as IAllExecuteFunctions;
			const mockedUrl = () => handler.mock.calls[0][0].url;
			return { handler, additionalData, helpers, context, mockedUrl };
		}

		// Shape sent by the S3 V2 node: no URL, the target rides in qs for the credential.
		const s3ListObjects = (): IHttpRequestOptions => ({
			method: 'GET',
			url: '',
			body: '',
			qs: {
				'list-type': 2,
				service: 'my-bucket.s3',
				path: '',
				query: { 'list-type': 2, prefix: 'leads/' },
				_region: 'eu-west-1',
			},
		});

		test('legacy requestWithAuthentication hands the mock the AWS endpoint URL', async () => {
			const { handler, additionalData, helpers, context, mockedUrl } = setup();

			await helpers.requestWithAuthentication.call(context, 'aws', s3ListObjects());

			expect(mockedUrl()).toBe(
				'https://my-bucket.s3.eu-west-1.amazonaws.com/?list-type=2&prefix=leads%2F',
			);
			expect(handler.mock.calls[0][0].qs).toBeUndefined();
			expect(context.getCredentials).not.toHaveBeenCalled();
			expect(additionalData.credentialsHelper.authenticate).not.toHaveBeenCalled();
			expect(additionalData.credentialsHelper.preAuthentication).not.toHaveBeenCalled();
		});

		test('uses a placeholder region when the request carries none', async () => {
			const { helpers, context, mockedUrl } = setup();

			await helpers.requestWithAuthentication.call(context, 'aws', {
				method: 'GET',
				url: '',
				body: '',
				qs: { service: 'my-bucket.s3', path: '', query: { location: '' } },
			});

			expect(mockedUrl()).toBe('https://my-bucket.s3.us-east-1.amazonaws.com/?location=');
		});

		test('legacy requestWithAuthentication reads the top-level region', async () => {
			const { helpers, context, mockedUrl } = setup();

			// Shape sent by the generic awsApiRequest: the region rides at the top level.
			await helpers.requestWithAuthentication.call(context, 'aws', {
				method: 'POST',
				url: '',
				qs: { service: 'lambda', path: '/2015-03-31/functions/fn/invocations' },
				region: 'eu-central-1',
			} as IHttpRequestOptions);

			expect(mockedUrl()).toBe(
				'https://lambda.eu-central-1.amazonaws.com/2015-03-31/functions/fn/invocations',
			);
		});

		test('legacy requestWithAuthentication leaves a request with a baseURL unchanged', async () => {
			const { handler, helpers, context } = setup();

			await helpers.requestWithAuthentication.call(context, 'aws', {
				method: 'GET',
				baseURL: 'https://minio.local',
				url: '',
				qs: { service: 's3', path: '/bucket' },
			});

			expect(handler.mock.calls[0][0].url).not.toContain('amazonaws.com');
		});

		test('httpRequestWithAuthentication resolves the URL for awsAssumeRole', async () => {
			const { helpers, context, mockedUrl } = setup();

			await helpers.httpRequestWithAuthentication.call(context, 'awsAssumeRole', {
				method: 'POST',
				url: '',
				qs: { service: 'lambda', path: '/2015-03-31/functions/fn/invocations' },
				region: 'eu-central-1',
			} as IHttpRequestOptions);

			expect(mockedUrl()).toBe(
				'https://lambda.eu-central-1.amazonaws.com/2015-03-31/functions/fn/invocations',
			);
		});

		test('leaves an AWS request without qs.service unchanged', async () => {
			const { helpers, context, mockedUrl } = setup();

			await helpers.requestWithAuthentication.call(context, 'aws', { method: 'GET', url: '' });

			expect(mockedUrl()).toBe('');
		});

		test('leaves other credential types unchanged', async () => {
			const { helpers, context, mockedUrl } = setup();

			await helpers.requestWithAuthentication.call(context, 'httpHeaderAuth', s3ListObjects());

			expect(mockedUrl()).toBe('');
		});
	});
});

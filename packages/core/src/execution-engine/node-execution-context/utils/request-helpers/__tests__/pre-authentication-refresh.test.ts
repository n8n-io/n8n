import type {
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	IExecuteFunctions,
	IHttpRequestOptions,
	INode,
	IRequestOptions,
	IWorkflowExecuteAdditionalData,
	PaginationOptions,
	Workflow,
} from 'n8n-workflow';
import nock from 'nock';
import { Readable } from 'node:stream';
import { mock, mockDeep } from 'vitest-mock-extended';

import { requestWithAuthentication } from '../authentication';
import { requestWithAuthenticationPaginated } from '../pagination';

describe('preAuthentication refresh with resolved HTTP errors', () => {
	const baseUrl = 'https://api.example.com';
	const path = '/items';
	const node = mock<INode>({ name: 'Get items', typeVersion: 4.2 });
	const workflow = mock<Workflow>();

	afterEach(() => nock.cleanAll());

	function setup() {
		const credentials: ICredentialDataDecryptedObject = { accessToken: 'expired-token' };
		const helper = mock<ICredentialsHelper>();
		helper.getParentTypes.mockReturnValue([]);
		helper.preAuthentication.mockImplementation(async (_helpers, _data, _type, _node, expired) =>
			expired ? { accessToken: 'fresh-token' } : undefined,
		);
		helper.authenticate.mockImplementation(async (data, _type, options) => {
			if (typeof data.accessToken !== 'string') throw new Error('Expected an access token');
			return {
				...options,
				headers: { ...options.headers, Authorization: `Bearer ${data.accessToken}` },
			} as IHttpRequestOptions;
		});
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			credentialsHelper: helper,
			hooks: undefined,
			evalLlmMockHandler: undefined,
		});
		const ctx = mockDeep<IExecuteFunctions>();
		ctx.getCredentials.mockResolvedValue(credentials);
		ctx.getNode.mockReturnValue(node);
		ctx.helpers.requestWithAuthentication.mockImplementation(
			async (type, options, extra) =>
				await requestWithAuthentication.call(
					ctx,
					type,
					options,
					workflow,
					node,
					additionalData,
					extra,
				),
		);
		const options: IRequestOptions = {
			method: 'GET',
			uri: `${baseUrl}${path}`,
			json: true,
			simple: false,
			resolveWithFullResponse: true,
		};
		const request = async () =>
			await ctx.helpers.requestWithAuthentication.call(ctx, 'testPreAuth', options);
		const refreshCalls = () => helper.preAuthentication.mock.calls.map((call) => call[4]);
		const stale = (status = 401) =>
			nock(baseUrl, { reqheaders: { authorization: 'Bearer expired-token' } })
				.get(path)
				.reply(status, { message: 'Original response' });
		const fresh = (status = 200) =>
			nock(baseUrl, { reqheaders: { authorization: 'Bearer fresh-token' } })
				.get(path)
				.reply(status, [{ id: 1 }]);
		return { ctx, credentials, helper, options, request, refreshCalls, stale, fresh };
	}

	test('refreshes and re-authenticates a paginated request after a 401', async () => {
		const { ctx, helper, options, refreshCalls, stale, fresh } = setup();
		delete options.simple;
		const first = stale();
		const retry = fresh();
		const pagination: PaginationOptions = { request: {}, continue: false, requestInterval: 0 };

		await expect(
			requestWithAuthenticationPaginated.call(
				ctx,
				options,
				0,
				pagination,
				(value) => value,
				node,
				'testPreAuth',
			),
		).resolves.toMatchObject([{ statusCode: 200, body: [{ id: 1 }] }]);

		expect(refreshCalls()).toEqual([false, true]);
		expect(helper.authenticate).toHaveBeenCalledTimes(2);
		expect(helper.authenticate).toHaveBeenLastCalledWith(
			{ accessToken: 'fresh-token' },
			'testPreAuth',
			expect.anything(),
			workflow,
			node,
		);
		first.done();
		retry.done();
	});

	test('retries the same page when the token expires between pages', async () => {
		const { ctx, options, refreshCalls } = setup();
		const firstPage = nock(baseUrl, { reqheaders: { authorization: 'Bearer expired-token' } })
			.get(path)
			.query({ page: 0 })
			.reply(200, [{ id: 1 }]);
		const expiredPage = nock(baseUrl, { reqheaders: { authorization: 'Bearer expired-token' } })
			.get(path)
			.query({ page: 1 })
			.reply(401, { message: 'Original response' });
		const retriedPage = nock(baseUrl, { reqheaders: { authorization: 'Bearer fresh-token' } })
			.get(path)
			.query({ page: 1 })
			.reply(200, [{ id: 2 }]);
		const pagination: PaginationOptions = {
			request: {},
			continue: true,
			maxRequests: 2,
			requestInterval: 0,
		};

		await expect(
			requestWithAuthenticationPaginated.call(
				ctx,
				options,
				0,
				pagination,
				(value, _item, _run, _execute, keys) =>
					value === pagination.request ? { qs: { page: keys?.$pageCount ?? 0 } } : value,
				node,
				'testPreAuth',
			),
		).resolves.toMatchObject([
			{ statusCode: 200, body: [{ id: 1 }] },
			{ statusCode: 200, body: [{ id: 2 }] },
		]);

		expect(refreshCalls()).toEqual([false, false, true]);
		firstPage.done();
		expiredPage.done();
		retriedPage.done();
	});

	test.each([true, false])('refreshes with full response set to %s', async (fullResponse) => {
		const { options, request, refreshCalls, stale, fresh } = setup();
		options.resolveWithFullResponse = fullResponse;
		const first = stale();
		const retry = fresh();

		const result = await request();

		expect(result).toMatchObject(
			fullResponse ? { statusCode: 200, body: [{ id: 1 }] } : [{ id: 1 }],
		);
		expect(refreshCalls()).toEqual([false, true]);
		first.done();
		retry.done();
	});

	test.each([200, 403, 404, 500])('does not refresh a resolved %s by default', async (status) => {
		const { request, refreshCalls, stale } = setup();
		const first = stale(status);

		await expect(request()).resolves.toMatchObject({ statusCode: status });

		expect(refreshCalls()).toEqual([false]);
		first.done();
	});

	test('preserves a successful body-only response without a refresh', async () => {
		const { options, request, refreshCalls, stale } = setup();
		delete options.resolveWithFullResponse;
		const first = stale(200);

		await expect(request()).resolves.toEqual({ message: 'Original response' });

		expect(refreshCalls()).toEqual([false]);
		first.done();
	});

	test('returns a second 401 without a second refresh', async () => {
		const { request, refreshCalls, stale, fresh } = setup();
		const first = stale();
		const retry = fresh(401);

		await expect(request()).resolves.toMatchObject({ statusCode: 401 });

		expect(refreshCalls()).toEqual([false, true]);
		first.done();
		retry.done();
	});

	test('does not resend when the credential has no refresh hook', async () => {
		const { helper, request, refreshCalls, stale } = setup();
		helper.preAuthentication.mockResolvedValue(undefined);
		const first = stale();

		await expect(request()).resolves.toMatchObject({ statusCode: 401 });

		expect(refreshCalls()).toEqual([false, true]);
		expect(helper.authenticate).toHaveBeenCalledTimes(1);
		first.done();
	});

	test('does not repeat a failed refresh', async () => {
		const { helper, request, refreshCalls, stale } = setup();
		helper.preAuthentication
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('Token exchange failed'));
		const first = stale();

		await expect(request()).rejects.toMatchObject({
			cause: expect.objectContaining({ message: 'Token exchange failed' }),
		});

		expect(refreshCalls()).toEqual([false, true]);
		first.done();
	});

	test('refreshes but returns the original response for a consumed stream', async () => {
		const { options, request, refreshCalls, helper } = setup();
		options.method = 'POST';
		options.body = Readable.from(['content']);
		const first = nock(baseUrl).post(path, 'content').reply(401, { message: 'Original response' });

		await expect(request()).resolves.toMatchObject({
			statusCode: 401,
			body: { message: 'Original response' },
		});

		expect(refreshCalls()).toEqual([false, true]);
		expect(helper.authenticate).toHaveBeenCalledTimes(1);
		first.done();
	});

	test.each([
		{ status: 403, expiry: undefined, retry: true },
		{ status: 401, expiry: undefined, retry: false },
		{ status: 403, expiry: Date.UTC(2999, 0, 1), retry: false },
		{ status: 403, expiry: Date.UTC(2000, 0, 1), retry: true },
	])('honors custom refresh settings: $status, $expiry', async ({ status, expiry, retry }) => {
		const { ctx, options, credentials, refreshCalls, stale, fresh } = setup();
		if (expiry !== undefined) credentials.n8n_expires_at = expiry;
		const first = stale(status);
		const second = retry ? fresh() : undefined;

		await expect(
			ctx.helpers.requestWithAuthentication.call(ctx, 'testPreAuth', options, {
				preAuthenticationRetryStatusCode: [403],
				skipPreAuthenticationRetryWhileTokenIsFresh: true,
			}),
		).resolves.toMatchObject({ statusCode: retry ? 200 : status });

		expect(refreshCalls()).toEqual(retry ? [false, true] : [false]);
		first.done();
		second?.done();
	});
});

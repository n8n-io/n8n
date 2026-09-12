import { mock } from 'vitest-mock-extended';
import type { INode, IN8nHttpFullResponse } from 'n8n-workflow';
import { Readable } from 'stream';

import { withShouldRefreshCredentials } from '../credential-expired-when';
import { materializeHttpResponseBody, toHttpFullResponseOrBody } from '../http-full-response';
import type { ResolveValueFn } from '../pagination';

describe('withShouldRefreshCredentials', () => {
	const node = mock<INode>({ name: 'HTTP Request' });

	it('leaves unset options unchanged', () => {
		expect(withShouldRefreshCredentials(undefined, vi.fn(), node)).toBeUndefined();
		expect(withShouldRefreshCredentials({}, vi.fn(), node)).toEqual({});
		expect(withShouldRefreshCredentials({ credentialExpiredWhen: false }, vi.fn(), node)).toEqual({
			credentialExpiredWhen: false,
		});
		expect(withShouldRefreshCredentials({ credentialExpiredWhen: 'false' }, vi.fn(), node)).toEqual(
			{
				credentialExpiredWhen: 'false',
			},
		);
		expect(withShouldRefreshCredentials({ credentialExpiredWhen: '' }, vi.fn(), node)).toEqual({
			credentialExpiredWhen: '',
		});
	});

	it('keeps an existing callback', () => {
		const shouldRefreshCredentials = vi.fn();
		const options = { shouldRefreshCredentials };
		expect(withShouldRefreshCredentials(options, vi.fn(), node)).toBe(options);
	});

	it('treats a static true as always expired', () => {
		const compiled = withShouldRefreshCredentials({ credentialExpiredWhen: true }, vi.fn(), node);
		expect(
			compiled?.shouldRefreshCredentials?.({
				statusCode: 200,
				body: {},
				headers: {},
			}),
		).toBe(true);
	});

	it('treats the literal string true as always expired', () => {
		const compiled = withShouldRefreshCredentials({ credentialExpiredWhen: 'true' }, vi.fn(), node);
		expect(
			compiled?.shouldRefreshCredentials?.({
				statusCode: 200,
				body: {},
				headers: {},
			}),
		).toBe(true);
	});

	it('resolves an expression against $response', () => {
		const getResolvedValue = vi.fn<ResolveValueFn>((_value, _item, _run, _execute, keys) => {
			const response = keys?.$response as IN8nHttpFullResponse;
			const body = response.body;
			return typeof body === 'object' && body !== null && 'code' in body && body.code === 10001;
		});

		const compiled = withShouldRefreshCredentials(
			{ credentialExpiredWhen: '={{ $response.body.code === 10001 }}' },
			getResolvedValue,
			node,
			3,
		);

		const fullResponse: IN8nHttpFullResponse = {
			statusCode: 200,
			body: { code: 10001 },
			headers: {},
		};

		expect(compiled?.shouldRefreshCredentials?.(fullResponse)).toBe(true);
		expect(getResolvedValue).toHaveBeenCalledWith(
			'={{ $response.body.code === 10001 }}',
			3,
			0,
			expect.objectContaining({ node }),
			{ $response: fullResponse },
		);
	});

	it('does not treat a resolved false as expired', () => {
		const getResolvedValue = vi.fn<ResolveValueFn>().mockReturnValue(false);
		const compiled = withShouldRefreshCredentials(
			{ credentialExpiredWhen: '={{ $response.body.code === 10001 }}' },
			getResolvedValue,
			node,
		);

		expect(
			compiled?.shouldRefreshCredentials?.({
				statusCode: 200,
				body: { code: 0 },
				headers: {},
			}),
		).toBe(false);
	});

	it('does not treat a resolved string true as expired', () => {
		const getResolvedValue = vi.fn<ResolveValueFn>().mockReturnValue('true');
		const compiled = withShouldRefreshCredentials(
			{ credentialExpiredWhen: '={{ $response.body.flag }}' },
			getResolvedValue,
			node,
		);

		expect(
			compiled?.shouldRefreshCredentials?.({
				statusCode: 200,
				body: { flag: 'true' },
				headers: {},
			}),
		).toBe(false);
	});

	it('resolves a raw expression against a materialized JSON stream', async () => {
		const getResolvedValue = vi.fn<ResolveValueFn>((_value, _item, _run, _execute, keys) => {
			const response = keys?.$response as IN8nHttpFullResponse;
			const body = response.body;
			return typeof body === 'object' && body !== null && 'code' in body && body.code === 10001;
		});
		const compiled = withShouldRefreshCredentials(
			{ credentialExpiredWhen: '={{ $response.body.code === 10001 }}' },
			getResolvedValue,
			node,
		);
		const materialized = await materializeHttpResponseBody({
			statusCode: 200,
			body: Readable.from([Buffer.from(JSON.stringify({ code: 10001 }))]),
			headers: { 'content-type': 'application/json' },
		});

		expect(compiled?.shouldRefreshCredentials?.(toHttpFullResponseOrBody(materialized))).toBe(true);
	});

	it('does not fail the request when the expression throws', () => {
		const getResolvedValue = vi.fn<ResolveValueFn>().mockImplementation(() => {
			throw new Error('Cannot read properties of undefined');
		});
		const compiled = withShouldRefreshCredentials(
			{ credentialExpiredWhen: '={{ $response.body.code.foo }}' },
			getResolvedValue,
			node,
		);

		expect(
			compiled?.shouldRefreshCredentials?.({
				statusCode: 200,
				body: {},
				headers: {},
			}),
		).toBe(false);
	});
});

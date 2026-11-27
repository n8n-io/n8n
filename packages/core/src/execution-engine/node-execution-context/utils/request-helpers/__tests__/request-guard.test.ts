import { OutboundHttp } from '@n8n/backend-network';
import type { HttpRequestClient } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type { INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { EvalLlmMockHandler } from '@/execution-engine';

import { proxyRequestToAxios } from '../legacy-request-adapter';
import { sendHttpRequest } from '../outbound-request';

describe('request guard of a node execution', () => {
	const node = mock<INode>({ name: 'Gmail', type: 'n8n-nodes-base.gmail' });
	const request = vi.fn();
	const requestLegacy = vi.fn();

	const additionalDataWith = (guard?: EvalLlmMockHandler) => {
		const additionalData = mockDeep<IWorkflowExecuteAdditionalData>();
		additionalData.otel = undefined;
		additionalData.nodeRequestGuard = guard;
		return additionalData;
	};

	beforeEach(() => {
		vi.resetAllMocks();
		request.mockResolvedValue('network-body');
		requestLegacy.mockResolvedValue('network-legacy-body');
		Container.set(
			OutboundHttp,
			mock<OutboundHttp>({
				requests: vi.fn(() => mock<HttpRequestClient>({ request, requestLegacy })),
			}),
		);
	});

	describe('sendHttpRequest', () => {
		const options = { url: 'https://api.example.test/items', method: 'GET' as const };

		it('answers the request with the guard and does not send it', async () => {
			const guard = vi.fn(async () => ({ statusCode: 200, headers: {}, body: { ok: 1 } }));

			const result = await sendHttpRequest(options, additionalDataWith(guard), node);

			expect(result).toEqual({ ok: 1 });
			expect(guard).toHaveBeenCalledWith(expect.objectContaining({ url: options.url }), node);
			expect(request).not.toHaveBeenCalled();
		});

		it('returns the full response when the request asks for it', async () => {
			const guard = vi.fn(async () => ({ statusCode: 201, headers: { a: 'b' }, body: { ok: 1 } }));

			const result = await sendHttpRequest(
				{ ...options, returnFullResponse: true },
				additionalDataWith(guard),
				node,
			);

			expect(result).toMatchObject({ statusCode: 201, headers: { a: 'b' }, body: { ok: 1 } });
		});

		it('sends the request when the guard leaves it to the network', async () => {
			const guard = vi.fn(async () => undefined);

			const result = await sendHttpRequest(options, additionalDataWith(guard), node);

			expect(result).toBe('network-body');
			expect(request).toHaveBeenCalledTimes(1);
		});

		it('sends the request when the execution has no guard', async () => {
			expect(await sendHttpRequest(options, additionalDataWith(), node)).toBe('network-body');
		});

		it('fails like a real request when the guard answers with an error status', async () => {
			const guard = vi.fn(async () => ({ statusCode: 403, headers: {}, body: 'refused' }));

			await expect(sendHttpRequest(options, additionalDataWith(guard), node)).rejects.toMatchObject(
				{
					response: { status: 403, data: 'refused' },
				},
			);
			expect(request).not.toHaveBeenCalled();
		});
	});

	describe('proxyRequestToAxios', () => {
		it('gives the guard the request in the shape of a modern request, with the basic auth', async () => {
			const guard = vi.fn(async () => ({ statusCode: 200, headers: {}, body: { ok: 1 } }));

			const result = await proxyRequestToAxios(undefined, additionalDataWith(guard), node, {
				uri: 'https://api.example.test/items',
				method: 'POST',
				qs: { a: '1' },
				body: { x: 1 },
				auth: { user: 'jo', pass: 'secret' },
			});

			expect(result).toEqual({ ok: 1 });
			expect(guard).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://api.example.test/items',
					method: 'POST',
					qs: { a: '1' },
					body: { x: 1 },
					auth: { username: 'jo', password: 'secret' },
				}),
				node,
			);
			expect(requestLegacy).not.toHaveBeenCalled();
		});

		it('tells the guard that a legacy request wants a binary answer', async () => {
			const guard = vi.fn(async () => ({
				statusCode: 200,
				headers: {},
				body: Buffer.from([1, 2]),
			}));

			await proxyRequestToAxios(undefined, additionalDataWith(guard), node, {
				uri: 'https://api.example.test/file',
				encoding: null,
			});

			expect(guard).toHaveBeenCalledWith(
				expect.objectContaining({ encoding: 'arraybuffer' }),
				node,
			);
		});

		it('fails like a legacy request when the guard answers with an error status', async () => {
			const guard = vi.fn(async () => ({ statusCode: 502, headers: {}, body: 'down' }));

			await expect(
				proxyRequestToAxios(undefined, additionalDataWith(guard), node, 'https://api.example.test'),
			).rejects.toMatchObject({ statusCode: 502 });
		});

		it('sends the request when the guard leaves it to the network', async () => {
			const guard = vi.fn(async () => undefined);

			const result = await proxyRequestToAxios(
				undefined,
				additionalDataWith(guard),
				node,
				'https://api.example.test',
			);

			expect(result).toBe('network-legacy-body');
		});

		it('asks for no guard when there is no node, so it does not guard internal calls', async () => {
			const guard = vi.fn(async () => ({ statusCode: 200, headers: {}, body: 'x' }));

			await proxyRequestToAxios(undefined, additionalDataWith(guard), undefined, 'https://a.test');

			expect(guard).not.toHaveBeenCalled();
		});
	});
});

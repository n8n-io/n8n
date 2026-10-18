import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { ALLOWED_RPC_METHODS, RpcHandler, serializeRpcError } from '../rpc-handler';

function handlerWith(httpRequest: (...args: unknown[]) => Promise<unknown>) {
	const executeFunctions = mock<IExecuteFunctions>();
	const helpers = { httpRequest: vi.fn(httpRequest), request: vi.fn(httpRequest) };
	(executeFunctions as unknown as { helpers: typeof helpers }).helpers = helpers;
	return { handler: new RpcHandler(executeFunctions), helpers };
}

describe('RpcHandler', () => {
	it('allows only the httpRequest helpers', () => {
		expect(ALLOWED_RPC_METHODS).toEqual(['helpers.httpRequest', 'helpers.request']);
	});

	it('runs an allowed helper with the params and counts the call', async () => {
		const { handler, helpers } = handlerWith(async () => ({ status: 200 }));
		const reply = await handler.handleCall({
			name: 'helpers.httpRequest',
			params: [{ url: 'https://example.com' }],
		});
		expect(reply).toEqual({ ok: true, data: { status: 200 } });
		expect(helpers.httpRequest).toHaveBeenCalledWith({ url: 'https://example.com' });
		expect(handler.rpcCount).toBe(1);
	});

	it('refuses a method that is not allowed', async () => {
		const { handler, helpers } = handlerWith(async () => 'x');
		const reply = await handler.handleCall({ name: 'helpers.getBinaryDataBuffer', params: [] });
		expect(reply).toEqual({ ok: false, error: { message: 'Method not allowed' } });
		expect(handler.rpcCount).toBe(0);
		expect(helpers.httpRequest).not.toHaveBeenCalled();
	});

	it('converts serialized Buffers in the params', async () => {
		const { handler, helpers } = handlerWith(async () => 'ok');
		await handler.handleCall({
			name: 'helpers.httpRequest',
			params: [{ type: 'Buffer', data: [104, 105] }],
		});
		const arg = helpers.httpRequest.mock.calls[0][0];
		expect(Buffer.isBuffer(arg)).toBe(true);
		expect((arg as Buffer).toString()).toBe('hi');
	});

	it('returns a helper error as a serialized error', async () => {
		const { handler } = handlerWith(async () => {
			throw Object.assign(new Error('Not Found'), { httpCode: '404', socket: { big: true } });
		});
		const reply = await handler.handleCall({ name: 'helpers.request', params: [] });
		expect(reply).toEqual({
			ok: false,
			error: { message: 'Not Found', name: 'Error', httpCode: '404' },
		});
	});

	it('serializes a value that is not an Error', () => {
		expect(serializeRpcError('boom')).toEqual({ message: 'boom' });
	});
});

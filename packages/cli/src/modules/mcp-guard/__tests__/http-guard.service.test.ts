import { Container } from '@n8n/di';
import { Logger } from '@n8n/backend-common';

import { withChatScope, withNodeGuard } from '../chat-scope';
import { HttpGuardService } from '../http-guard.service';
import type { HydrationModel } from '../hydration-llm';
import type { CapturedRequest } from '../net-interceptor';

const handle = vi.fn(async (_r: CapturedRequest) => new Response('from-router'));
const getOrCreate = vi.fn(async (..._a: unknown[]) => ({ router: { handle } }));
const sendToNetwork = vi.fn(async (_r: CapturedRequest) => new Response('real-passthrough'));

vi.mock('../http-runs', () => ({
	HttpRunRegistry: class {
		getOrCreate = getOrCreate;
	},
}));
vi.mock('../net-interceptor', () => ({
	sendToNetwork: async (r: CapturedRequest) => await sendToNetwork(r),
}));

const model: HydrationModel = { resolve: async () => ({}) as never };

const request = (host: string, path: string, method = 'GET'): CapturedRequest => ({
	method,
	url: new URL(`https://${host}${path}`),
	headers: {},
});

const inGuard = async <T>(fn: () => Promise<T>): Promise<T> =>
	await withChatScope('chat1', async () => await withNodeGuard(model, fn), 'agent1');

describe('HttpGuardService', () => {
	const error = vi.fn();
	let service: HttpGuardService;

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(Logger, { error, info: vi.fn(), warn: vi.fn() } as unknown as Logger);
		service = new HttpGuardService(Container.get(Logger));
	});

	it('gives a Gmail request to the run of its agent and chat', async () => {
		const res = await inGuard(
			async () =>
				await service.handle(request('www.googleapis.com', '/gmail/v1/users/me/messages')),
		);

		expect(await res.text()).toBe('from-router');
		expect(getOrCreate).toHaveBeenCalledWith('agent1-chat1', model);
		expect(handle).toHaveBeenCalledTimes(1);
	});

	it('refuses a request on the sign-in host that is no token exchange', async () => {
		const res = await inGuard(
			async () => await service.handle(request('oauth2.googleapis.com', '/revoke', 'POST')),
		);

		expect(res.status).toBe(403);
		expect(sendToNetwork).not.toHaveBeenCalled();
	});

	it('sends a sign-in request to the real network without a run', async () => {
		const res = await inGuard(
			async () => await service.handle(request('oauth2.googleapis.com', '/token', 'POST')),
		);

		expect(await res.text()).toBe('real-passthrough');
		expect(getOrCreate).not.toHaveBeenCalled();
	});

	it('refuses a host without a vendor file', async () => {
		const res = await inGuard(async () => await service.handle(request('example.com', '/x')));

		expect(res.status).toBe(403);
		expect(getOrCreate).not.toHaveBeenCalled();
		expect(sendToNetwork).not.toHaveBeenCalled();
	});

	it('refuses a request that has no guarded node tool scope', async () => {
		const res = await service.handle(request('www.googleapis.com', '/gmail/v1/users/me/messages'));

		expect(res.status).toBe(403);
		expect(handle).not.toHaveBeenCalled();
	});

	it('returns 502 and logs when the run cannot be set up', async () => {
		getOrCreate.mockRejectedValueOnce(new Error('gym down'));

		const res = await inGuard(
			async () =>
				await service.handle(request('www.googleapis.com', '/gmail/v1/users/me/messages')),
		);

		expect(res.status).toBe(502);
		expect(error).toHaveBeenCalledTimes(1);
	});
});

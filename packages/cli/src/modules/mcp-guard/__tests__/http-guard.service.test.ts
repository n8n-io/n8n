import type { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import { Logger } from '@n8n/backend-common';

import { HttpGuardService } from '../http-guard.service';
import type { HydrationModel } from '../hydration-llm';
import type { CapturedRequest } from '../network';
import type { NodeRequestGuardScope } from '../node-request-guard';

const handle = vi.fn(async (_r: CapturedRequest) => new Response('from-router'));
const getOrCreate = vi.fn(async (..._a: unknown[]) => ({ router: { handle } }));

const configs: Array<{ profile: { name: string }; admin: unknown; gymUrl: string }> = [];

vi.mock('../http-runs', () => ({
	HttpRunRegistry: class {
		constructor(cfg: { profile: { name: string }; admin: unknown; gymUrl: string }) {
			configs.push(cfg);
		}

		getOrCreate = getOrCreate;
	},
}));

const model: HydrationModel = { resolve: async () => ({}) as never };

const request = (host: string, path: string, method = 'GET'): CapturedRequest => ({
	method,
	url: new URL(`https://${host}${path}`),
	headers: {},
});

const scope: NodeRequestGuardScope = { model, chatId: 'chat1', agentId: 'agent1' };

const outboundHttp = {
	transport: () => ({ asCustomFetch: () => fetch }),
} as unknown as OutboundHttp;

describe('HttpGuardService', () => {
	const error = vi.fn();
	let service: HttpGuardService;

	beforeEach(() => {
		vi.clearAllMocks();
		configs.length = 0;
		Container.set(Logger, { error, info: vi.fn(), warn: vi.fn() } as unknown as Logger);
		service = new HttpGuardService(Container.get(Logger), outboundHttp);
	});

	it('gives a Gmail request to the run of its agent and chat', async () => {
		const res = await service.handle(
			request('www.googleapis.com', '/gmail/v1/users/me/messages'),
			scope,
		);

		expect(await res?.text()).toBe('from-router');
		expect(getOrCreate).toHaveBeenCalledWith('agent1-chat1', model);
		expect(handle).toHaveBeenCalledTimes(1);
	});

	it('refuses a request on the sign-in host that is no token exchange', async () => {
		const res = await service.handle(request('oauth2.googleapis.com', '/revoke', 'POST'), scope);

		expect(res?.status).toBe(403);
	});

	it('leaves a token exchange to the node, without a run', async () => {
		const res = await service.handle(request('oauth2.googleapis.com', '/token', 'POST'), scope);

		expect(res).toBeUndefined();
		expect(getOrCreate).not.toHaveBeenCalled();
	});

	it('refuses a host without a vendor file', async () => {
		const res = await service.handle(request('example.com', '/x'), scope);

		expect(res?.status).toBe(403);
		expect(getOrCreate).not.toHaveBeenCalled();
	});

	it('refuses a request that has no chat', async () => {
		const res = await service.handle(request('www.googleapis.com', '/gmail/v1/users/me/messages'), {
			...scope,
			chatId: undefined,
		});

		expect(res?.status).toBe(403);
		expect(handle).not.toHaveBeenCalled();
	});

	it('returns 502 and logs when the run cannot be set up', async () => {
		getOrCreate.mockRejectedValueOnce(new Error('gym down'));

		const res = await service.handle(
			request('www.googleapis.com', '/gmail/v1/users/me/messages'),
			scope,
		);

		expect(res?.status).toBe(502);
		expect(error).toHaveBeenCalledTimes(1);
	});

	describe('gym address', () => {
		afterEach(() => vi.unstubAllEnvs());

		it('gives every vendor the same gym and the default addresses', () => {
			configs.length = 0;
			new HttpGuardService(Container.get(Logger));

			expect(configs.length).toBeGreaterThan(0);
			expect(new Set(configs.map((c) => c.admin)).size).toBe(1);
			expect(new Set(configs.map((c) => c.gymUrl))).toEqual(new Set(['http://127.0.0.1:8083']));
		});

		it('uses the addresses of the environment for every vendor', () => {
			vi.stubEnv('AI_GYM_NODES_URL', 'http://gym.test:9000');
			vi.stubEnv('GYM_NODES_URL', 'http://gym.test:8000');
			configs.length = 0;

			new HttpGuardService(Container.get(Logger));

			expect(new Set(configs.map((c) => c.gymUrl))).toEqual(new Set(['http://gym.test:8000']));
			expect(new Set(configs.map((c) => c.admin)).size).toBe(1);
		});
	});
});

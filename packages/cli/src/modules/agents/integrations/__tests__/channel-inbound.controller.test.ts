import type { UrlService } from '@n8n/backend-services';
import { mock } from 'vitest-mock-extended';

vi.mock('@/middlewares/body-parser', () => ({ limitRawBodySize: vi.fn() }));

import { getRoutesByHandlerName } from '../../__tests__/test-utils/controller-route-metadata';
import type { ChannelInboundIngressService } from '../channel-inbound/channel-inbound-ingress.service';
import { limitRawBodySize } from '@/middlewares/body-parser';

import {
	channelInboundRouteOptions,
	limitChannelInboundBodySize,
} from '../channel-inbound/channel-inbound-route-options';
import { MAX_CHANNEL_INBOUND_BODY_BYTES } from '../channel-inbound/channel-inbound.types';
import { ChannelInboundController } from '../channel-inbound/channel-inbound.controller';

function setup() {
	const ingress = mock<ChannelInboundIngressService>();
	const urlService = mock<UrlService>();
	urlService.getWebhookBaseUrl.mockReturnValue('https://hooks.n8n.example/');
	const res = {
		headersSent: false,
		status: vi.fn().mockReturnThis(),
		type: vi.fn().mockReturnThis(),
		send: vi.fn(),
		end: vi.fn(),
		setHeader: vi.fn(),
	};
	return { controller: new ChannelInboundController(ingress, urlService), ingress, res };
}

const request = (method: string) => ({
	params: { agentId: 'agent-1', platform: 'slack' },
	method,
	headers: { host: 'internal:5678', 'x-forwarded-host': 'attacker.example' },
	originalUrl: '/agent-hook/agent-1/slack?x=1',
	query: { x: '1' },
	rawBody: Buffer.from('{}'),
});

describe('ChannelInboundController', () => {
	it('declares public routes with the shared rate limits', () => {
		const routes = getRoutesByHandlerName(ChannelInboundController);
		const { ipRateLimit, keyedRateLimit } = channelInboundRouteOptions();
		for (const name of ['event', 'handshake']) {
			const route = routes.get(name);
			expect(route?.skipAuth).toBe(true);
			expect(route?.allowBots).toBe(true);
			expect(route?.accessScope).toBeUndefined();
			expect(route?.ipRateLimit).toEqual(ipRateLimit);
			expect(route?.keyedRateLimit).toEqual(keyedRateLimit);
		}
	});

	it('hands a POST to the ingress on the configured base URL and sends its reply', async () => {
		const { controller, ingress, res } = setup();
		ingress.handle.mockResolvedValue({ status: 503, body: 'busy', retryAfterSeconds: 5 });

		await controller.event(request('POST') as never, res as never);

		expect(ingress.handle).toHaveBeenCalledWith({
			agentId: 'agent-1',
			platform: 'slack',
			route: 'agent-hook',
			method: 'POST',
			url: 'https://hooks.n8n.example/agent-hook/agent-1/slack?x=1',
			query: { x: '1' },
			headers: request('POST').headers,
			rawBody: Buffer.from('{}'),
		});
		expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '5');
		expect(res.status).toHaveBeenCalledWith(503);
		expect(res.type).toHaveBeenCalledWith('text/plain');
		expect(res.send).toHaveBeenCalledWith('busy');
	});

	it('hands a GET handshake to the ingress with an empty body', async () => {
		const { controller, ingress, res } = setup();
		ingress.handle.mockResolvedValue({ status: 200 });

		await controller.handshake({ ...request('GET'), rawBody: undefined } as never, res as never);

		expect(ingress.handle).toHaveBeenCalledWith(
			expect.objectContaining({ method: 'GET', rawBody: Buffer.alloc(0) }),
		);
		expect(res.end).toHaveBeenCalled();
	});
});

describe('limitChannelInboundBodySize', () => {
	it('limits the body of the agent-hook route and the legacy route only', () => {
		limitChannelInboundBodySize();

		const [matches, bytes] = vi.mocked(limitRawBodySize).mock.calls[0];
		expect(bytes).toBe(MAX_CHANNEL_INBOUND_BODY_BYTES);
		expect(matches('/agent-hook/agent-1/slack')).toBe(true);
		expect(matches('/rest/projects/p1/agents/v2/agent-1/webhooks/slack')).toBe(true);
		expect(matches('/rest/projects/p1/agents/v2/agent-1/webhooks/slack/')).toBe(true);
		expect(matches('/rest/projects/p1/agents/v2/agent-1/chat')).toBe(false);
		expect(matches('/rest/projects/p1/agents/v2/agent-1/webhooks')).toBe(false);
		expect(matches('/webhook/abc')).toBe(false);
	});
});

import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from '../../__tests__/test-utils/controller-route-metadata';
import { WebhookChannelController } from '../platforms/webhook/webhook-channel.controller';

describe('WebhookChannelController route access scopes', () => {
	// The caller is not an n8n user: the channel's own authentication runs in the handler.
	expectProjectScopedAgentRoutes(WebhookChannelController, new Set(['respond']));

	it('limits the requests of one IP address with the configured limit', () => {
		const route = getRoutesByHandlerName(WebhookChannelController).get('respond');

		expect(route?.ipRateLimit).toEqual({ limit: 100 });
	});
});

import { expectProjectScopedAgentRoutes } from '../../__tests__/test-utils/controller-route-metadata';
import { WebhookChannelController } from '../platforms/webhook/webhook-channel.controller';

describe('WebhookChannelController route access scopes', () => {
	// The caller is not an n8n user: the channel's own authentication runs in the handler.
	expectProjectScopedAgentRoutes(WebhookChannelController, new Set(['respond', 'decide']));
});

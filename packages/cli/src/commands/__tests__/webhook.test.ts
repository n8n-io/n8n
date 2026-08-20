import { mockInstance } from '@n8n/backend-test-utils';

import { WebhookServer } from '@/webhooks/webhook-server';

import { Webhook } from '../webhook';

mockInstance(WebhookServer);

test('webhook needs the expression engine', () => {
	expect(new Webhook().needsExpressionEngine).toBe(true);
});

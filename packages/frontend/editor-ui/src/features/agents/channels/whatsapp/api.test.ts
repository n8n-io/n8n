import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import { checkWhatsAppCredential, getWhatsAppWebhookStatus } from './api';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const context = { baseUrl: '/rest', pushRef: 'push-ref' };

describe('WhatsApp channel API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('checks a credential for the agent', async () => {
		const check = { status: 'failed', reason: 'mismatch' };
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce(check);

		const result = await checkWhatsAppCredential(context, 'p', 'a', 'cred-1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'POST',
			'/projects/p/agents/v2/a/integrations/whatsapp/check/cred-1',
		);
		expect(result).toBe(check);
	});

	it('reads the webhook status for the agent', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValueOnce({ verified: true });

		const result = await getWhatsAppWebhookStatus(context, 'p', 'a');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/projects/p/agents/v2/a/integrations/whatsapp/webhook-status',
		);
		expect(result).toEqual({ verified: true });
	});
});

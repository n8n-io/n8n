import { AgentsConfig, GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { AgentEmailServiceClient } from '../agent-email-service-client';

describe('AgentEmailServiceClient', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('creates the known short-lived signed attachment URL', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-10T14:00:00Z'));
		const globalConfig = mock<GlobalConfig>({
			aiAssistant: { baseUrl: 'http://localhost:3000' },
		});
		const agentsConfig = mock<AgentsConfig>({
			emailServicePublicBaseUrl: 'https://email.example',
		});
		const client = new AgentEmailServiceClient(globalConfig, agentsConfig);
		const callbackSecret = `whsec_${Buffer.from('callback-secret').toString('base64')}`;

		expect(
			client.getSignedAttachmentUrl('inbox-1', '<message-1@example.com>', 'att-1', callbackSecret),
		).toBe(
			'https://email.example/v1/agent-email/channels/inbox-1/messages/%3Cmessage-1%40example.com%3E/attachments/att-1/download?expires=1789049400&signature=ATFlNbRixjE-ABdLFnig2O5pFGWpJ5JEK3PqcPyQIT0',
		);
	});
});

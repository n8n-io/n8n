import type { AgentIntegrationConfig } from '@n8n/api-types';
import { BadRequestError } from '@n8n/errors';

import { WebhookIntegration } from '../platforms/webhook/webhook-integration';

const webhook = (
	authentication: 'none' | 'headerAuth' | 'jwtAuth' | undefined,
	credentialId = '',
): AgentIntegrationConfig => ({
	type: 'webhook',
	credentialId,
	...(authentication ? { settings: { authentication } } : {}),
});

describe('WebhookIntegration.validateConfig', () => {
	const integration = new WebhookIntegration();

	it.each([
		['none without a credential', webhook('none')],
		['header auth with a credential', webhook('headerAuth', 'cred-1')],
	])('accepts %s', (_, entry) => {
		expect(() => integration.validateConfig(entry)).not.toThrow();
	});

	it.each([
		['no authentication', webhook(undefined, 'cred-1')],
		['none with a credential', webhook('none', 'cred-1')],
		['JWT auth without a credential', webhook('jwtAuth')],
	])('rejects %s', (_, entry) => {
		expect(() => integration.validateConfig(entry)).toThrow(BadRequestError);
	});
});

describe('WebhookIntegration.actionToolDefinitions', () => {
	it('has no channel actions to approve', () => {
		expect(new WebhookIntegration().actionToolDefinitions).toEqual([]);
	});
});

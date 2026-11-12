import {
	hasChannelRuntime,
	integrationNeedsCredential,
	isDraftIntegration,
	reuseIntegrationSetup,
	toDraftIntegration,
} from '../agent-config-lifecycle';
import {
	type AgentIntegrationConfig,
	type CredentialAgentIntegrationConfig,
	webhookCredentialType,
} from '../agent-integration.schema';

const n8nChat: AgentIntegrationConfig = { type: 'n8n_chat', credentialId: '' };
const webhookNone: CredentialAgentIntegrationConfig = {
	type: 'webhook',
	credentialId: '',
	settings: { authentication: 'none' },
};
const webhookHeader: CredentialAgentIntegrationConfig = {
	type: 'webhook',
	credentialId: 'cred-header',
	settings: { authentication: 'headerAuth' },
};
const slack: CredentialAgentIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-1',
	settings: { messagingExperience: 'agent' },
};

describe('hasChannelRuntime', () => {
	it('is true for a platform channel', () => {
		expect(hasChannelRuntime(slack)).toBe(true);
	});

	it('is false for n8n Chat', () => {
		expect(hasChannelRuntime(n8nChat)).toBe(false);
	});
});

describe('integrationNeedsCredential', () => {
	it('is true for a platform channel', () => {
		expect(integrationNeedsCredential(slack)).toBe(true);
	});

	it('is false for n8n Chat', () => {
		expect(integrationNeedsCredential(n8nChat)).toBe(false);
	});
});

describe('isDraftIntegration', () => {
	it('is true for a platform channel without a credential', () => {
		expect(isDraftIntegration({ ...slack, credentialId: ' ' })).toBe(true);
	});

	it('is false for a platform channel with a credential', () => {
		expect(isDraftIntegration(slack)).toBe(false);
	});

	it('is false for n8n Chat', () => {
		expect(isDraftIntegration(n8nChat)).toBe(false);
	});
});

describe('toDraftIntegration', () => {
	it('clears the credential and keeps the settings of a platform channel', () => {
		expect(toDraftIntegration(slack)).toEqual({ ...slack, credentialId: '' });
	});

	it('keeps n8n Chat as it is', () => {
		expect(toDraftIntegration(n8nChat)).toBe(n8nChat);
	});
});

describe('reuseIntegrationSetup', () => {
	it('takes the credential of the existing channel and keeps the source settings', () => {
		const existing: AgentIntegrationConfig = {
			type: 'slack',
			credentialId: 'cred-destination',
			settings: { messagingExperience: 'assistant' },
		};

		expect(reuseIntegrationSetup(slack, existing)).toEqual({
			...slack,
			credentialId: 'cred-destination',
		});
	});
});

describe('webhook channel', () => {
	it('has no platform runtime', () => {
		expect(hasChannelRuntime(webhookNone)).toBe(false);
		expect(hasChannelRuntime(webhookHeader)).toBe(false);
	});

	it.each([
		['needs no credential with authentication none', webhookNone, false],
		['needs a credential with header auth', webhookHeader, true],
		['needs a credential without an authentication', { type: 'webhook' }, true],
	])('%s', (_, entry, expected) => {
		expect(integrationNeedsCredential(entry)).toBe(expected);
	});

	it('maps each authentication to its credential type', () => {
		expect(webhookCredentialType({ authentication: 'none' })).toBeUndefined();
		expect(webhookCredentialType({ authentication: 'headerAuth' })).toBe('httpHeaderAuth');
		expect(webhookCredentialType({ authentication: 'jwtAuth' })).toBe('jwtAuth');
		expect(webhookCredentialType(undefined)).toBeUndefined();
	});

	it.each([
		[
			'is a draft without an authentication, also with a credential',
			{ type: 'webhook', credentialId: 'c' },
			true,
		],
		['is a draft with header auth and no credential', { ...webhookHeader, credentialId: '' }, true],
		['is not a draft with authentication none', webhookNone, false],
		['is not a draft with header auth and its credential', webhookHeader, false],
	])('%s', (_, entry, expected) => {
		expect(isDraftIntegration(entry)).toBe(expected);
	});

	it('becomes a draft without settings when it is copied', () => {
		expect(toDraftIntegration(webhookNone)).toEqual({ type: 'webhook', credentialId: '' });
		expect(toDraftIntegration(webhookHeader)).toEqual({ type: 'webhook', credentialId: '' });
	});

	it('takes the authentication and the credential of the existing webhook on reuse', () => {
		expect(reuseIntegrationSetup(webhookNone, webhookHeader)).toEqual(webhookHeader);
	});
});

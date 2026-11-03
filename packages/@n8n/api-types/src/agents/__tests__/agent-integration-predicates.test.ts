import { isDraftIntegration } from '../agent-config-lifecycle';
import {
	type AgentIntegrationConfig,
	hasChannelRuntime,
	integrationNeedsCredential,
	reuseIntegrationSetup,
	toDraftIntegration,
} from '../agent-integration.schema';

const n8nChat: AgentIntegrationConfig = { type: 'n8n_chat', credentialId: '' };
const slack: AgentIntegrationConfig = {
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

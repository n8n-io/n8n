import type { CredentialCheckStatus } from 'n8n-workflow';

import { buildChatShellViewModel, connectBarText } from '../connect-panel';

const missingCred = (overrides: Partial<CredentialCheckStatus> = {}): CredentialCheckStatus => ({
	credentialId: 'cred-1',
	credentialName: 'Slack account',
	credentialType: 'slackOAuth2Api',
	status: 'missing',
	authorizationUrl: 'https://n8n.example.com/credentials/cred-1/authorize',
	revokeUrl: undefined,
	...overrides,
});

const configuredCred = (overrides: Partial<CredentialCheckStatus> = {}): CredentialCheckStatus => ({
	credentialId: 'cred-2',
	credentialName: 'Google account',
	credentialType: 'googleOAuth2Api',
	status: 'configured',
	revokeUrl: 'https://n8n.example.com/credentials/cred-2/revoke?resolverId=n8n',
	...overrides,
});

describe('buildChatShellViewModel', () => {
	it('skips the dialog for exactly one required credential', () => {
		const vm = buildChatShellViewModel([missingCred()]);

		expect(vm.useDialog).toBe(false);
		expect(vm.total).toBe(1);
	});

	it('uses the dialog for two or more required credentials', () => {
		const vm = buildChatShellViewModel([missingCred(), configuredCred()]);

		expect(vm.useDialog).toBe(true);
		expect(vm.total).toBe(2);
		expect(vm.connectedCount).toBe(1);
		expect(vm.footerText).toBe('1 of 2 accounts connected');
	});

	it('marks a row connected only for a configured credential, and carries its links', () => {
		const vm = buildChatShellViewModel([missingCred(), configuredCred()]);

		expect(vm.credentials).toMatchObject([
			{
				id: 'cred-1',
				name: 'Slack account',
				connected: false,
				authorizationUrl: 'https://n8n.example.com/credentials/cred-1/authorize',
			},
			{
				id: 'cred-2',
				name: 'Google account',
				connected: true,
				revokeUrl: 'https://n8n.example.com/credentials/cred-2/revoke?resolverId=n8n',
			},
		]);
	});

	it('shows the visitor email only on a connected row', () => {
		const vm = buildChatShellViewModel([missingCred(), configuredCred()], 'visitor@example.com');

		expect(vm.credentials.find((c) => c.id === 'cred-1')?.account).toBeUndefined();
		expect(vm.credentials.find((c) => c.id === 'cred-2')?.account).toBe('visitor@example.com');
	});

	it('derives the letter tile from the credential name', () => {
		const vm = buildChatShellViewModel([missingCred({ credentialName: 'slack account' })]);

		expect(vm.credentials[0].initial).toBe('S');
	});

	it('falls back to a placeholder tile for a nameless credential', () => {
		const vm = buildChatShellViewModel([missingCred({ credentialName: '   ' })]);

		expect(vm.credentials[0].initial).toBe('?');
	});
});

describe('connectBarText', () => {
	it('names the full count while nothing is connected', () => {
		expect(connectBarText(buildChatShellViewModel([missingCred()]))).toBe(
			'1 account needed to start this chat',
		);
		expect(connectBarText(buildChatShellViewModel([missingCred(), missingCred()]))).toBe(
			'2 accounts needed to start this chat',
		);
	});

	// Part-way through, naming the full count again would read as if no progress had
	// been made, so only the remainder is named.
	it('names only what is left once some are connected', () => {
		const vm = buildChatShellViewModel([missingCred(), missingCred(), configuredCred()]);

		expect(connectBarText(vm)).toBe('2 more accounts needed to start this chat');
	});

	it('confirms readiness once every account is connected', () => {
		expect(connectBarText(buildChatShellViewModel([configuredCred()]))).toBe(
			'All 1 account connected · ready to chat',
		);
	});

	// Test mode establishes identity from the builder's own credentials, so there is
	// nothing for them to connect - the bar is informational and has no button.
	it('explains test mode regardless of what is connected', () => {
		const vm = buildChatShellViewModel([missingCred()]);

		expect(connectBarText(vm, true)).toBe(
			"You're testing with your own connected accounts. Visitors will need to connect their own.",
		);
	});
});

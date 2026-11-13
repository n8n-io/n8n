import { EvalAssistantTurnOverrides } from '../eval-assistant-turn-overrides';
import { EvalThreadCredentialAllowlistService } from '../thread-credential-allowlist.service';

describe('EvalAssistantTurnOverrides', () => {
	function setup() {
		// The real store, so that the overrides see what the eval controllers write.
		const allowlists = new EvalThreadCredentialAllowlistService();
		return { allowlists, overrides: new EvalAssistantTurnOverrides(allowlists) };
	}

	it('overrides nothing for a thread without settings', () => {
		const { overrides } = setup();

		expect(overrides.getCredentialIdAllowlist('thread-1')).toBeUndefined();
		expect(overrides.shouldBypassCredentialTest('thread-1', 'cred-1')).toBe(false);
		expect(overrides.getCredentialTestTarget('thread-1', 'slackApi')).toBeUndefined();
		expect(overrides.getBuildMode('thread-1')).toBeUndefined();
		expect(overrides.getPromptVersion('thread-1')).toBeUndefined();
	});

	it('reads the credential settings from the eval allowlist service', () => {
		const { allowlists, overrides } = setup();
		allowlists.set('thread-1', ['cred-1', 'cred-2'], ['cred-2']);
		const target = { credentialType: 'slackApi', baseUrl: 'http://stand-in', urlField: 'url' };
		allowlists.setTestTarget('thread-1', target);

		expect(overrides.getCredentialIdAllowlist('thread-1')).toEqual(['cred-1', 'cred-2']);
		expect(overrides.shouldBypassCredentialTest('thread-1', 'cred-2')).toBe(true);
		expect(overrides.shouldBypassCredentialTest('thread-1', 'cred-1')).toBe(false);
		expect(overrides.getCredentialTestTarget('thread-1', 'slackApi')).toEqual(target);
		expect(overrides.getCredentialIdAllowlist('thread-2')).toBeUndefined();
	});

	it('keeps the turn overrides for each thread', () => {
		const { overrides } = setup();
		overrides.setThreadOverrides('thread-1', { mode: 'progressive', promptVersion: 'v2' });

		expect(overrides.getBuildMode('thread-1')).toBe('progressive');
		expect(overrides.getPromptVersion('thread-1')).toBe('v2');
		expect(overrides.getBuildMode('thread-2')).toBeUndefined();
	});

	it('replaces all turn overrides, so an omitted field has no override', () => {
		const { overrides } = setup();
		overrides.setThreadOverrides('thread-1', { mode: 'progressive', promptVersion: 'v2' });

		overrides.setThreadOverrides('thread-1', { promptVersion: 'v3' });

		expect(overrides.getBuildMode('thread-1')).toBeUndefined();
		expect(overrides.getPromptVersion('thread-1')).toBe('v3');
	});

	it('clears the turn overrides and the credential settings of the thread', () => {
		const { allowlists, overrides } = setup();
		allowlists.set('thread-1', ['cred-1'], ['cred-1']);
		allowlists.set('thread-2', ['cred-9']);
		overrides.setThreadOverrides('thread-1', { mode: 'progressive' });

		overrides.clearThread('thread-1');

		expect(overrides.getBuildMode('thread-1')).toBeUndefined();
		expect(overrides.getCredentialIdAllowlist('thread-1')).toBeUndefined();
		expect(overrides.shouldBypassCredentialTest('thread-1', 'cred-1')).toBe(false);
		expect(overrides.getCredentialIdAllowlist('thread-2')).toEqual(['cred-9']);
	});
});

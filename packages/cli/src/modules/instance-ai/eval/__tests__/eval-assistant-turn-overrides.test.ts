import { EvalAssistantTurnOverrides } from '../eval-assistant-turn-overrides';
import { EvalThreadCredentialAllowlistService } from '../thread-credential-allowlist.service';

describe('EvalAssistantTurnOverrides', () => {
	function setup() {
		// The real store, so that the overrides see what the eval controllers write.
		const allowlists = new EvalThreadCredentialAllowlistService();
		return { allowlists, overrides: new EvalAssistantTurnOverrides(allowlists) };
	}

	it('reads the credential settings of the thread from the eval allowlist store', () => {
		const { allowlists, overrides } = setup();
		const target = { credentialType: 'slackApi', baseUrl: 'http://stub', urlField: 'url' };
		allowlists.set('thread-1', ['cred-1', 'cred-2'], ['cred-2']);
		allowlists.setTestTarget('thread-1', target);

		expect(overrides.getCredentialIdAllowlist('thread-1')).toEqual(['cred-1', 'cred-2']);
		expect(overrides.shouldBypassCredentialTest('thread-1', 'cred-2')).toBe(true);
		expect(overrides.shouldBypassCredentialTest('thread-1', 'cred-1')).toBe(false);
		expect(overrides.getCredentialTestTarget('thread-1', 'slackApi')).toEqual(target);
	});

	it('overrides nothing for a thread without eval settings', () => {
		const { overrides } = setup();

		expect(overrides.getCredentialIdAllowlist('thread-2')).toBeUndefined();
		expect(overrides.shouldBypassCredentialTest('thread-2', 'cred-1')).toBe(false);
		expect(overrides.getCredentialTestTarget('thread-2', 'slackApi')).toBeUndefined();
		expect(overrides.getBuildMode('thread-2')).toBeUndefined();
		expect(overrides.getPromptVersion('thread-2')).toBeUndefined();
	});
});

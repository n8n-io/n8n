import { askCredentialInputSchema } from '../agent-builder-interactive';

describe('agent builder interactive schemas', () => {
	it('keeps credentialSlot as the node credential key for ask_credential input', () => {
		const result = askCredentialInputSchema.parse({
			purpose: 'Use Linear from the agent',
			credentialType: 'linearOAuth2Api',
			credentialSlot: 'linearOAuth2Api',
		});

		expect(result.credentialSlot).toBe('linearOAuth2Api');
	});
});

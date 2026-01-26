import { type SecretKeysConfig, secretKeysCheck } from '../../actions/checks/secretKeys';

describe('secretKeys guardrail', () => {
	it('detects secrets', async () => {
		const config: SecretKeysConfig = {
			threshold: 'balanced',
			customRegex: [],
		};
		const text =
			'My API key is ADBCS-r-cEY7csbSwF123S8Nsdf3p2fknkSw12o\nMy ID is 7b9fcd0a-9188-4e36-8c65-bc915192b2375\n My email is john.doe@example.com';

		const result = secretKeysCheck(text, config);

		expect(result.tripwireTriggered).toBe(true);
		expect(result.info?.maskEntities?.SECRET).toEqual([
			'ADBCS-r-cEY7csbSwF123S8Nsdf3p2fknkSw12o',
			'7b9fcd0a-9188-4e36-8c65-bc915192b2375',
		]);
	});
});

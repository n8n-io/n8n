import { isEnvFeatureEnabled } from '../env-feature-flags';

describe('isEnvFeatureEnabled', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('should return true when the flag is set to "true"', () => {
		vi.stubEnv('N8N_ENV_FEAT_TEST_FLAG', 'true');

		expect(isEnvFeatureEnabled('N8N_ENV_FEAT_TEST_FLAG')).toBe(true);
	});

	it.each(['false', '1', 'TRUE', ''])(
		'should return false when the flag is set to "%s"',
		(value) => {
			vi.stubEnv('N8N_ENV_FEAT_TEST_FLAG', value);

			expect(isEnvFeatureEnabled('N8N_ENV_FEAT_TEST_FLAG')).toBe(false);
		},
	);

	it('should return false when the flag is not set', () => {
		vi.stubEnv('N8N_ENV_FEAT_TEST_FLAG', undefined);

		expect(isEnvFeatureEnabled('N8N_ENV_FEAT_TEST_FLAG')).toBe(false);
	});
});

import { Container } from '@n8n/di';

import { FeatureFlagConfig } from '../feature-flags.config';

describe('FeatureFlagConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.resetAllMocks();
		vi.unstubAllEnvs();
	});

	test('defaults override to an empty map', () => {
		expect(Container.get(FeatureFlagConfig).override).toEqual({});
	});

	test('parses a JSON map of string and boolean overrides', () => {
		vi.stubEnv('N8N_FEATURE_FLAG_OVERRIDES', '{"my_flag":true,"multivariate_flag":"variant"}');

		expect(Container.get(FeatureFlagConfig).override).toEqual({
			my_flag: true,
			multivariate_flag: 'variant',
		});
	});

	test('parses a false value, so a flag can be forced off', () => {
		vi.stubEnv('N8N_FEATURE_FLAG_OVERRIDES', '{"my_flag":false}');

		expect(Container.get(FeatureFlagConfig).override).toEqual({ my_flag: false });
	});

	test('parses an override with a payload', () => {
		vi.stubEnv(
			'N8N_FEATURE_FLAG_OVERRIDES',
			'{"my_flag":{"value":"variant","payload":{"url":"https://example.com"}}}',
		);

		expect(Container.get(FeatureFlagConfig).override).toEqual({
			my_flag: {
				value: 'variant',
				payload: { url: 'https://example.com' },
			},
		});
	});

	test('falls back to default on JSON that is not an object', () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubEnv('N8N_FEATURE_FLAG_OVERRIDES', '["my_flag"]');

		expect(Container.get(FeatureFlagConfig).override).toEqual({});
		expect(consoleWarnSpy).toHaveBeenCalled();
	});

	test('falls back to default on invalid JSON', () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubEnv('N8N_FEATURE_FLAG_OVERRIDES', 'not-json');

		expect(Container.get(FeatureFlagConfig).override).toEqual({});
		expect(consoleWarnSpy).toHaveBeenCalled();
	});

	test('falls back to default on non-string/boolean values', () => {
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubEnv('N8N_FEATURE_FLAG_OVERRIDES', '{"my_flag":42}');

		expect(Container.get(FeatureFlagConfig).override).toEqual({});
		expect(consoleWarnSpy).toHaveBeenCalled();
	});
});

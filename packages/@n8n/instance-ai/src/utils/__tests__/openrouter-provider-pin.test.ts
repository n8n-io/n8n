import { UserError } from 'n8n-workflow';

import {
	OPENROUTER_PROVIDER_ENV,
	openRouterProviderPinExtraBody,
	parseOpenRouterProviderSlug,
	withOpenRouterProviderPin,
} from '../openrouter-provider-pin';

describe('parseOpenRouterProviderSlug', () => {
	it('returns undefined for empty values', () => {
		expect(parseOpenRouterProviderSlug(undefined)).toBeUndefined();
		expect(parseOpenRouterProviderSlug('')).toBeUndefined();
		expect(parseOpenRouterProviderSlug('   ')).toBeUndefined();
	});

	it('normalizes a valid slug', () => {
		expect(parseOpenRouterProviderSlug('Together')).toBe('together');
		expect(parseOpenRouterProviderSlug('z-ai')).toBe('z-ai');
		expect(parseOpenRouterProviderSlug(' amazon-bedrock ')).toBe('amazon-bedrock');
	});

	it('rejects a value that is not a single slug', () => {
		expect(() => parseOpenRouterProviderSlug('together,fireworks')).toThrow(UserError);
		expect(() => parseOpenRouterProviderSlug('together/fireworks')).toThrow(UserError);
		expect(() => parseOpenRouterProviderSlug('together fireworks')).toThrow(UserError);
	});
});

describe('withOpenRouterProviderPin', () => {
	const previous = process.env[OPENROUTER_PROVIDER_ENV];

	afterEach(() => {
		if (previous === undefined) delete process.env[OPENROUTER_PROVIDER_ENV];
		else process.env[OPENROUTER_PROVIDER_ENV] = previous;
	});

	it('leaves models unchanged when the env pin is unset', () => {
		delete process.env[OPENROUTER_PROVIDER_ENV];
		expect(withOpenRouterProviderPin('openrouter/z-ai/glm-5.3-flash:nitro')).toBe(
			'openrouter/z-ai/glm-5.3-flash:nitro',
		);
	});

	it('wraps an OpenRouter string id', () => {
		process.env[OPENROUTER_PROVIDER_ENV] = 'together';
		expect(withOpenRouterProviderPin('openrouter/z-ai/glm-5.3-flash:nitro')).toEqual({
			id: 'openrouter/z-ai/glm-5.3-flash:nitro',
			extraBody: openRouterProviderPinExtraBody('together'),
		});
	});

	it('merges the pin onto an existing OpenRouter config', () => {
		process.env[OPENROUTER_PROVIDER_ENV] = 'Fireworks';
		expect(
			withOpenRouterProviderPin({
				id: 'openrouter/z-ai/glm-5.3-flash:nitro',
				apiKey: 'or-key',
				url: '',
				extraBody: { temperature: 0 },
			}),
		).toEqual({
			id: 'openrouter/z-ai/glm-5.3-flash:nitro',
			apiKey: 'or-key',
			url: '',
			extraBody: {
				temperature: 0,
				...openRouterProviderPinExtraBody('fireworks'),
			},
		});
	});

	it('does not pin a non-OpenRouter model', () => {
		process.env[OPENROUTER_PROVIDER_ENV] = 'together';
		expect(withOpenRouterProviderPin('anthropic/claude-opus-4-8')).toBe(
			'anthropic/claude-opus-4-8',
		);
	});
});

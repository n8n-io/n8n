import { describe, expect, it } from 'vitest';

import {
	normalizeWebSearchForModelChange,
	stripNativeWebSearchProviderTools,
} from '../utils/nativeWebSearch';
import type { AgentJsonConfig } from '../types';

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'A',
		instructions: 'i',
		model: 'anthropic/claude-sonnet-4-6',
		credential: 'c',
		...overrides,
	} as AgentJsonConfig;
}

describe('nativeWebSearch utils', () => {
	it('strips only native web search provider tools', () => {
		expect(
			stripNativeWebSearchProviderTools({
				'anthropic.web_search': { maxUses: 5 },
				'openai.image_generation': {},
			}),
		).toEqual({ 'openai.image_generation': {} });
	});

	it('disables native web search when switching to a non-native provider', () => {
		const result = normalizeWebSearchForModelChange(
			makeConfig({
				config: { webSearch: { enabled: true, provider: 'native' } },
				providerTools: {
					'anthropic.web_search': { maxUses: 5 },
					'openai.image_generation': {},
				},
			} as Partial<AgentJsonConfig>),
			false,
		);

		expect(result.config?.webSearch).toEqual({ enabled: false });
		expect(result.providerTools).toEqual({ 'openai.image_generation': {} });
	});

	it('preserves fallback web search when switching to a native-capable provider', () => {
		const result = normalizeWebSearchForModelChange(
			makeConfig({
				model: 'google/gemini-2.5-flash',
				config: { webSearch: { enabled: true, provider: 'brave', credential: 'brave-1' } },
			} as Partial<AgentJsonConfig>),
			'anthropic.web_search',
		);

		expect(result.config?.webSearch).toEqual({
			enabled: true,
			provider: 'brave',
			credential: 'brave-1',
		});
		expect(result.providerTools).toBeUndefined();
	});
});

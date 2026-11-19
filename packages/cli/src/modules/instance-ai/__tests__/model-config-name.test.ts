import type { ModelConfig } from '@n8n/instance-ai';

import { modelNameForProvider, withModelName } from '../model-config-name';

describe('withModelName', () => {
	it.each<[ModelConfig, string, ModelConfig]>([
		['anthropic/claude-opus-5-5', 'claude-haiku-4-5', 'anthropic/claude-haiku-4-5'],
		['claude-opus-5-5', 'claude-haiku-4-5', 'custom/claude-haiku-4-5'],
		[
			{
				kind: 'endpoint',
				id: 'anthropic/claude-opus-5-5',
				url: 'https://anthropic.example',
				apiKey: 'main-key',
			},
			'claude-haiku-4-5',
			{
				kind: 'endpoint',
				id: 'anthropic/claude-haiku-4-5',
				url: 'https://anthropic.example',
				apiKey: 'main-key',
			},
		],
		[
			{
				kind: 'vertex-anthropic',
				id: 'google-vertex-anthropic/claude-opus-5-5',
				project: 'acme',
				location: 'us-east5',
			},
			'claude-haiku-4-5',
			{
				kind: 'vertex-anthropic',
				id: 'google-vertex-anthropic/claude-haiku-4-5',
				project: 'acme',
				location: 'us-east5',
			},
		],
	])('keeps the provider and credentials of %j', (config, modelName, expected) => {
		expect(withModelName(config, modelName)).toEqual(expected);
	});

	it('keeps a matching provider prefix by default', () => {
		expect(withModelName('openrouter/openai/gpt-5', 'openrouter/auto')).toBe(
			'openrouter/openrouter/auto',
		);
	});

	it.each([
		['anthropic/claude-opus-5-5', 'anthropic/claude-haiku-5-5', 'anthropic/claude-haiku-5-5'],
		['anthropic/claude-opus-5-5', 'claude-haiku-5-5', 'anthropic/claude-haiku-5-5'],
		[
			'openrouter/anthropic/claude-opus-5.5',
			'openrouter/anthropic/claude-haiku-5.5',
			'openrouter/anthropic/claude-haiku-5.5',
		],
		[
			'openrouter/anthropic/claude-opus-5.5',
			'anthropic/claude-haiku-5.5',
			'openrouter/anthropic/claude-haiku-5.5',
		],
		['custom/qwen3-coder', 'custom/qwen3-small', 'custom/qwen3-small'],
	])(
		'reads the name like the main model env with dropMainProviderPrefix: main %s with %s uses %s',
		(mainId, modelName, expectedId) => {
			const config: ModelConfig = {
				kind: 'endpoint',
				id: mainId as `${string}/${string}`,
				url: 'https://provider.example',
				apiKey: 'main-key',
			};

			expect(withModelName(config, modelName, { dropMainProviderPrefix: true })).toEqual({
				...config,
				id: expectedId,
			});
		},
	);

	it('returns undefined for a pre-built language model', () => {
		const prebuilt = { provider: 'anthropic.messages', modelId: 'claude-opus-5-5' } as never;

		expect(withModelName(prebuilt, 'claude-haiku-4-5')).toBeUndefined();
	});
});

describe('modelNameForProvider', () => {
	it('drops only a prefix that matches the main provider', () => {
		expect(modelNameForProvider('anthropic/claude-haiku-5-5', 'anthropic')).toBe(
			'claude-haiku-5-5',
		);
		expect(modelNameForProvider('anthropic/claude-haiku-5.5', 'openrouter')).toBe(
			'anthropic/claude-haiku-5.5',
		);
		expect(modelNameForProvider('claude-haiku-5-5', 'anthropic')).toBe('claude-haiku-5-5');
	});
});

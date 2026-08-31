import { modelConfigId } from '../model-config-id';

describe('modelConfigId', () => {
	it('returns plain-string model ids as-is', () => {
		expect(modelConfigId('anthropic/claude-sonnet-4-6')).toBe('anthropic/claude-sonnet-4-6');
	});

	it('reads the id off endpoint and Vertex configs', () => {
		expect(
			modelConfigId({
				id: 'anthropic/claude-sonnet-4-6',
				url: 'https://api.anthropic.com/v1/messages',
				apiKey: 'sk-ant-secret',
			}),
		).toBe('anthropic/claude-sonnet-4-6');
		expect(
			modelConfigId({
				id: 'google-vertex-anthropic/claude-opus-4-8',
				project: 'p',
				location: 'europe-west1',
			}),
		).toBe('google-vertex-anthropic/claude-opus-4-8');
	});

	it('reads `modelId` off a pre-built AI SDK model and drops the transport suffix', () => {
		// Shape of what `createProxyLanguageModel` returns: `modelId` + `config.provider`,
		// no `id`. `provider` is a prototype getter, so only `config` is an own property.
		expect(
			modelConfigId({
				specificationVersion: 'v4',
				modelId: 'kimi-k3',
				config: { provider: 'moonshotai.chat', includeUsage: true },
			}),
		).toBe('moonshotai/kimi-k3');
		expect(
			modelConfigId({
				specificationVersion: 'v4',
				modelId: 'claude-opus-4-8',
				config: { provider: 'anthropic.messages' },
			}),
		).toBe('anthropic/claude-opus-4-8');
	});

	it('prefers a top-level provider over the config one', () => {
		expect(
			modelConfigId({
				modelId: 'claude-opus-4-8',
				provider: 'anthropic.messages',
				config: { provider: 'ignored.chat' },
			}),
		).toBe('anthropic/claude-opus-4-8');
	});

	it('falls back to the bare model name when no provider is readable', () => {
		expect(modelConfigId({ modelId: 'kimi-k3' })).toBe('kimi-k3');
		expect(modelConfigId({ modelId: 'kimi-k3', config: { provider: 42 } })).toBe('kimi-k3');
	});

	it('returns undefined when no id can be read', () => {
		expect(modelConfigId(undefined)).toBeUndefined();
		expect(modelConfigId('')).toBeUndefined();
		expect(modelConfigId({})).toBeUndefined();
		expect(modelConfigId({ modelId: '' })).toBeUndefined();
		expect(modelConfigId({ modelId: 7 })).toBeUndefined();
	});
});

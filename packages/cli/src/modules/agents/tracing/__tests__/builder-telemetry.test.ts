import { LangSmithTelemetry } from '@n8n/agents';

import {
	buildBuilderTelemetry,
	isLangSmithEnabled,
	resolveModelIdForTelemetry,
} from '../builder-telemetry';

const baseOptions = {
	agentId: 'agent-1',
	projectId: 'project-1',
	userId: 'user-1',
	threadId: 'thread-1',
	model: 'anthropic/claude-sonnet-4-5',
} as const;

describe('isLangSmithEnabled', () => {
	it('returns false when no API key is set', () => {
		expect(isLangSmithEnabled({})).toBe(false);
	});

	it('returns true when LANGSMITH_API_KEY is set', () => {
		expect(isLangSmithEnabled({ LANGSMITH_API_KEY: 'ls-key' })).toBe(true);
	});

	it('returns true when LANGCHAIN_API_KEY is set', () => {
		expect(isLangSmithEnabled({ LANGCHAIN_API_KEY: 'lc-key' })).toBe(true);
	});

	it('returns false when tracing flag is explicitly disabled', () => {
		expect(isLangSmithEnabled({ LANGSMITH_API_KEY: 'ls-key', LANGCHAIN_TRACING_V2: 'false' })).toBe(
			false,
		);
		expect(isLangSmithEnabled({ LANGSMITH_API_KEY: 'ls-key', LANGSMITH_TRACING: 'false' })).toBe(
			false,
		);
	});
});

describe('buildBuilderTelemetry', () => {
	it('returns undefined when tracing is not enabled', () => {
		expect(buildBuilderTelemetry(baseOptions, {})).toBeUndefined();
	});

	it('returns a LangSmithTelemetry instance when an API key is present', () => {
		const telemetry = buildBuilderTelemetry(baseOptions, { LANGSMITH_API_KEY: 'ls-key' });
		expect(telemetry).toBeInstanceOf(LangSmithTelemetry);
	});

	it('seeds identifying metadata for the run', () => {
		const telemetry = buildBuilderTelemetry(baseOptions, { LANGSMITH_API_KEY: 'ls-key' });
		// Calling build() would trigger dynamic OTel imports; inspect the builder's
		// internal state via a safe cast to a partial shape instead.
		const internal = telemetry as unknown as {
			functionIdValue?: string;
			metadataValue?: Record<string, unknown>;
		};
		expect(internal.functionIdValue).toBe('agent-builder');
		expect(internal.metadataValue).toEqual({
			agent_id: 'agent-1',
			project_id: 'project-1',
			user_id: 'user-1',
			thread_id: 'thread-1',
			model_id: 'anthropic/claude-sonnet-4-5',
		});
	});

	it('records the resolved model id when given a typed config object', () => {
		const telemetry = buildBuilderTelemetry(
			{ ...baseOptions, model: { id: 'openai/gpt-4o', apiKey: 'redacted' } },
			{ LANGSMITH_API_KEY: 'ls-key' },
		);
		const internal = telemetry as unknown as { metadataValue?: Record<string, unknown> };
		expect(internal.metadataValue?.model_id).toBe('openai/gpt-4o');
	});
});

describe('resolveModelIdForTelemetry', () => {
	it('returns the string id as-is', () => {
		expect(resolveModelIdForTelemetry('anthropic/claude-sonnet-4-5')).toBe(
			'anthropic/claude-sonnet-4-5',
		);
	});

	it('extracts `id` from a typed model config', () => {
		expect(resolveModelIdForTelemetry({ id: 'openai/gpt-4o', apiKey: 'k' })).toBe('openai/gpt-4o');
	});

	it('combines AI SDK LanguageModel provider + modelId', () => {
		const languageModel = { provider: 'anthropic', modelId: 'claude-3-5-sonnet' } as never;
		expect(resolveModelIdForTelemetry(languageModel)).toBe('anthropic/claude-3-5-sonnet');
	});

	it('falls back to modelId alone when provider is missing', () => {
		const languageModel = { modelId: 'claude-3-5-sonnet' } as never;
		expect(resolveModelIdForTelemetry(languageModel)).toBe('claude-3-5-sonnet');
	});

	it('returns "unknown" when neither id nor modelId is present', () => {
		expect(resolveModelIdForTelemetry({} as never)).toBe('unknown');
	});
});

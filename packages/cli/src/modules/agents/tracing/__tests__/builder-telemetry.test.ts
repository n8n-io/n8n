import { LangSmithTelemetry } from '@n8n/agents';

import { buildBuilderTelemetry, isLangSmithEnabled } from '../builder-telemetry';

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
});

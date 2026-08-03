import { describe, it, expect } from 'vitest';

import { redactLangSmithTelemetrySpan } from '../trace-payloads';

describe('redactLangSmithTelemetrySpan structural id preservation', () => {
	it('does not corrupt langsmith.span.parent_id (zero-prefixed UUID)', () => {
		const parentId = '00000000-0000-0000-1d18-3fc2f08b306f';
		const span = {
			name: 'agent: orchestrator',
			attributes: {
				'langsmith.span.parent_id': parentId,
				'langsmith.span.id': '00000000-0000-0000-7c26-0de606834ec1',
				'langsmith.trace.id': '00000000-0000-0000-936e-8d716ec46f0c',
				'langsmith.traceable': 'true',
			},
		};

		const redacted = redactLangSmithTelemetrySpan(span) as {
			attributes: Record<string, unknown>;
		};

		expect(redacted.attributes['langsmith.span.parent_id']).toBe(parentId);
		expect(redacted.attributes['langsmith.span.id']).toBe('00000000-0000-0000-7c26-0de606834ec1');
		expect(redacted.attributes['langsmith.trace.id']).toBe('00000000-0000-0000-936e-8d716ec46f0c');
	});

	it('does not corrupt zero-prefixed run IDs carried in trace metadata', () => {
		const span = {
			name: 'llm: orchestrator',
			attributes: {
				langsmith_root_run_id: '00000000-0000-0000-b505-a974af202164',
				langsmith_actor_run_id: '00000000-0000-0000-7f35-9c91c43d63bf',
				'langsmith.metadata.langsmith_root_run_id': '00000000-0000-0000-b505-a974af202164',
				'langsmith.metadata.continued_from_run_id': '00000000-0000-0000-1d18-3fc2f08b306f',
				'langsmith.metadata.spawned_by_span_id': '00000000-0000-0000-7c26-0de606834ec1',
				'langsmith.traceable': 'true',
			},
		};

		const redacted = redactLangSmithTelemetrySpan(span) as {
			attributes: Record<string, unknown>;
		};

		expect(redacted.attributes.langsmith_root_run_id).toBe('00000000-0000-0000-b505-a974af202164');
		expect(redacted.attributes.langsmith_actor_run_id).toBe('00000000-0000-0000-7f35-9c91c43d63bf');
		expect(redacted.attributes['langsmith.metadata.langsmith_root_run_id']).toBe(
			'00000000-0000-0000-b505-a974af202164',
		);
		expect(redacted.attributes['langsmith.metadata.continued_from_run_id']).toBe(
			'00000000-0000-0000-1d18-3fc2f08b306f',
		);
		expect(redacted.attributes['langsmith.metadata.spawned_by_span_id']).toBe(
			'00000000-0000-0000-7c26-0de606834ec1',
		);
	});

	it('still scrubs secrets in non-structural attributes', () => {
		const span = {
			name: 'llm: orchestrator',
			attributes: {
				'langsmith.span.parent_id': '00000000-0000-0000-1d18-3fc2f08b306f',
				authorization: 'Bearer sk-secret-value',
			},
		};

		const redacted = redactLangSmithTelemetrySpan(span) as {
			attributes: Record<string, unknown>;
		};

		expect(redacted.attributes['langsmith.span.parent_id']).toBe(
			'00000000-0000-0000-1d18-3fc2f08b306f',
		);
		expect(redacted.attributes.authorization).toBe('[redacted]');
	});
});

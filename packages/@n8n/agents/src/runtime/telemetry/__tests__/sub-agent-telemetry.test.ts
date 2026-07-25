import type { BuiltTelemetry } from '../../../types/telemetry';
import { deriveSubAgentTelemetry } from '../sub-agent-telemetry';

function builtTelemetry(overrides: Partial<BuiltTelemetry> = {}): BuiltTelemetry {
	return {
		enabled: true,
		recordInputs: true,
		recordOutputs: true,
		integrations: [],
		...overrides,
	};
}

describe('deriveSubAgentTelemetry()', () => {
	it('returns undefined when the parent has no telemetry', () => {
		expect(deriveSubAgentTelemetry(undefined)).toBeUndefined();
	});

	it('clears functionId, sets rootAnchored: false, and tags source: sub-agent while preserving other metadata', () => {
		const tracer = { startActiveSpan: () => {} };
		const parentTelemetry = builtTelemetry({
			tracer,
			functionId: 'parent-agent',
			metadata: { agent_id: 'agent-1', thread_id: 'thread-1' },
		});

		const derived = deriveSubAgentTelemetry(parentTelemetry);

		expect(derived).toEqual({
			...parentTelemetry,
			functionId: undefined,
			metadata: { agent_id: 'agent-1', thread_id: 'thread-1', source: 'sub-agent' },
			rootAnchored: false,
		});
		expect(derived?.tracer).toBe(tracer);
	});

	it('overrides an existing source in metadata to sub-agent', () => {
		const parentTelemetry = builtTelemetry({ metadata: { source: 'workflow' } });

		const derived = deriveSubAgentTelemetry(parentTelemetry);

		expect(derived?.metadata).toEqual({ source: 'sub-agent' });
	});
});

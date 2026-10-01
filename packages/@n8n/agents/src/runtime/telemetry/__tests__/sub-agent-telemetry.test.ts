import { Telemetry } from '../../../sdk/telemetry';
import type { BuiltTelemetry } from '../../../types/telemetry';
import { deriveSubAgentTelemetry } from '../sub-agent-telemetry';
import { buildAiSdkTelemetry } from '../telemetry-options';

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

	it('uses derived metadata for AI SDK OpenTelemetry spans', async () => {
		const tracer = {
			startSpan: vi.fn(() => ({ end: vi.fn() })),
			startActiveSpan: vi.fn(),
		};
		const parentTelemetry = await new Telemetry()
			.tracer(tracer)
			.metadata({ source: 'workflow' })
			.build();
		const derived = deriveSubAgentTelemetry(parentTelemetry);
		const options = buildAiSdkTelemetry(derived).telemetry;
		const integrations = Array.isArray(options?.integrations)
			? options.integrations
			: options?.integrations
				? [options.integrations]
				: [];

		integrations[0]?.onStart?.({
			operationId: 'ai.generateText',
			callId: 'call-1',
			provider: 'openai.responses',
			modelId: 'gpt-5',
			instructions: 'test',
			messages: [],
			maxRetries: 2,
			functionId: 'sub-agent',
			recordInputs: true,
			recordOutputs: true,
		} as never);

		expect(tracer.startSpan).toHaveBeenCalledWith(
			'ai.generateText',
			expect.objectContaining({
				attributes: expect.objectContaining({
					'ai.telemetry.metadata.source': 'sub-agent',
				}),
			}),
			undefined,
		);
	});
});

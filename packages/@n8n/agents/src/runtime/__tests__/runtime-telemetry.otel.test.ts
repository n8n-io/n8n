import { trace } from '@opentelemetry/api';

import { OtelTestProvider } from './support/otel-test-provider';
import type { BuiltTelemetry } from '../../types/telemetry';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';

const TEST_TRACER_NAME = 'runtime-telemetry-otel-test';

function builtTelemetry(overrides: Partial<BuiltTelemetry> = {}): BuiltTelemetry {
	return {
		enabled: true,
		recordInputs: true,
		recordOutputs: true,
		integrations: [],
		tracer: trace.getTracer(TEST_TRACER_NAME),
		...overrides,
	};
}

// Deliberately does not mock '@opentelemetry/api' or the tracer:
// runtime-telemetry.test.ts already covers the branching logic against a
// stubbed tracer. This file proves the real OTel path end-to-end — that a
// top-level run's root span really starts a new trace even inside an active
// ambient span, and a sub-agent run (rootAnchored: false) really nests under
// one, exactly as TRUST-308 requires.
describe('RuntimeTelemetry.withRootSpan (real OTel provider)', () => {
	it('anchors a top-level run as its own root, ignoring an active ambient span', async () => {
		const otel = OtelTestProvider.create();
		try {
			const config = { name: 'parent-agent' } as AgentRuntimeConfig;
			const runtimeTelemetry = new RuntimeTelemetry(config);
			const tracer = trace.getTracer(TEST_TRACER_NAME);

			await tracer.startActiveSpan('ambient-span', async (ambientSpan) => {
				await runtimeTelemetry.withRootSpan(
					'generate',
					{ telemetry: builtTelemetry() },
					'run-1',
					async () => await Promise.resolve('ok'),
				);
				ambientSpan.end();
			});

			const spans = otel.getFinishedSpans();
			const rootSpan = spans.find((span) => span.name === 'parent-agent.generate');
			const ambientSpan = spans.find((span) => span.name === 'ambient-span');
			expect(rootSpan).toBeDefined();
			expect(ambientSpan).toBeDefined();
			expect(rootSpan?.parentSpanContext).toBeUndefined();
			expect(rootSpan?.spanContext().traceId).not.toBe(ambientSpan?.spanContext().traceId);
		} finally {
			await otel.shutdown();
		}
	});

	it('nests a sub-agent run (rootAnchored: false) under the active parent tool-call span', async () => {
		const otel = OtelTestProvider.create();
		try {
			const config = { name: 'child-agent' } as AgentRuntimeConfig;
			const runtimeTelemetry = new RuntimeTelemetry(config);
			const tracer = trace.getTracer(TEST_TRACER_NAME);

			await tracer.startActiveSpan('execute_tool delegate_subagent', async (toolSpan) => {
				await runtimeTelemetry.withRootSpan(
					'generate',
					{ telemetry: builtTelemetry({ rootAnchored: false }) },
					'run-2',
					async () => await Promise.resolve('ok'),
				);
				toolSpan.end();
			});

			const spans = otel.getFinishedSpans();
			const childSpan = spans.find((span) => span.name === 'child-agent.generate');
			const toolSpan = spans.find((span) => span.name === 'execute_tool delegate_subagent');
			expect(childSpan).toBeDefined();
			expect(toolSpan).toBeDefined();
			expect(childSpan?.parentSpanContext?.spanId).toBe(toolSpan?.spanContext().spanId);
			expect(childSpan?.spanContext().traceId).toBe(toolSpan?.spanContext().traceId);
		} finally {
			await otel.shutdown();
		}
	});
});

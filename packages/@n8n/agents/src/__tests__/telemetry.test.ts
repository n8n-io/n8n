import type { TelemetryIntegration } from 'ai';

import { Telemetry } from '../sdk/telemetry';

describe('Telemetry builder', () => {
	it('builds with defaults', async () => {
		const built = await new Telemetry().build();
		expect(built.enabled).toBe(true);
		expect(built.recordInputs).toBe(true);
		expect(built.recordOutputs).toBe(true);
		expect(built.functionId).toBeUndefined();
		expect(built.metadata).toBeUndefined();
		expect(built.integrations).toEqual([]);
		expect(built.tracer).toBeUndefined();
		expect(built.provider).toBeUndefined();
	});

	it('sets all scalar fields', async () => {
		const built = await new Telemetry()
			.enabled(false)
			.functionId('my-agent')
			.metadata({ team: 'platform', version: 2 })
			.recordInputs(false)
			.recordOutputs(false)
			.build();

		expect(built.enabled).toBe(false);
		expect(built.functionId).toBe('my-agent');
		expect(built.metadata).toEqual({ team: 'platform', version: 2 });
		expect(built.recordInputs).toBe(false);
		expect(built.recordOutputs).toBe(false);
	});

	it('accepts a pre-built tracer', async () => {
		const fakeTracer = { startSpan: jest.fn() };
		const built = await new Telemetry().tracer(fakeTracer).build();
		expect(built.tracer).toBe(fakeTracer);
	});

	it('throws when both .tracer() and .otlpEndpoint() are set', async () => {
		await expect(
			new Telemetry()
				.tracer({ startSpan: jest.fn() })
				.otlpEndpoint('http://localhost:4318')
				.build(),
		).rejects.toThrow('Cannot set both .tracer() and .otlpEndpoint()');
	});

	it('collects multiple integrations', async () => {
		const int1: TelemetryIntegration = { onStart: jest.fn() };
		const int2: TelemetryIntegration = { onFinish: jest.fn() };
		const built = await new Telemetry().integration(int1).integration(int2).build();
		expect(built.integrations).toHaveLength(2);
	});
});

describe('Telemetry — redaction wrapping', () => {
	it('wraps integrations with redaction when .redact() is set', async () => {
		const receivedEvents: unknown[] = [];
		const integration: TelemetryIntegration = {
			onStart: (event) => {
				receivedEvents.push(event);
			},
			onFinish: (event) => {
				receivedEvents.push(event);
			},
		};

		const built = await new Telemetry()
			.redact((data) => {
				const filtered = { ...data };
				delete filtered.secret;
				return filtered;
			})
			.integration(integration)
			.build();

		// Call the wrapped onStart hook
		const startEvent = { model: { modelId: 'test' }, messages: { secret: 'hidden', safe: 'ok' } };
		built.integrations[0].onStart!(startEvent as never);
		// The secret should be redacted from nested objects
		const received = receivedEvents[0] as Record<string, unknown>;
		const messages = received.messages as Record<string, unknown>;
		expect(messages.secret).toBeUndefined();
		expect(messages.safe).toBe('ok');
	});

	it('does not wrap integrations when .redact() is not set', async () => {
		const integration: TelemetryIntegration = { onStart: jest.fn() };
		const built = await new Telemetry().integration(integration).build();
		// The integration should be a copy (not the same reference due to spread) but functionally identical
		expect(built.integrations[0].onStart).toBe(integration.onStart);
	});

	it('redacts top-level scalar fields via the redact callback', async () => {
		const receivedEvents: unknown[] = [];
		const integration: TelemetryIntegration = {
			onStart: (event) => {
				receivedEvents.push(event);
			},
		};

		const built = await new Telemetry()
			.redact((data) => {
				const filtered = { ...data };
				delete filtered.secret;
				return filtered;
			})
			.integration(integration)
			.build();

		const startEvent = { secret: 'top-level-secret', safe: 'ok', nested: { a: 1 } };
		built.integrations[0].onStart!(startEvent as never);
		const received = receivedEvents[0] as Record<string, unknown>;
		expect(received.secret).toBeUndefined();
		expect(received.safe).toBe('ok');
	});

	it('redacts objects inside arrays', async () => {
		const receivedEvents: unknown[] = [];
		const integration: TelemetryIntegration = {
			onStart: (event) => {
				receivedEvents.push(event);
			},
		};

		const built = await new Telemetry()
			.redact((data) => {
				const filtered = { ...data };
				delete filtered.secret;
				return filtered;
			})
			.integration(integration)
			.build();

		const startEvent = {
			items: [
				{ secret: 'hidden', safe: 'ok' },
				{ secret: 'also-hidden', value: 42 },
			],
		};
		built.integrations[0].onStart!(startEvent as never);
		const received = receivedEvents[0] as Record<string, unknown>;
		const items = received.items as Array<Record<string, unknown>>;
		expect(items[0].secret).toBeUndefined();
		expect(items[0].safe).toBe('ok');
		expect(items[1].secret).toBeUndefined();
		expect(items[1].value).toBe(42);
	});
});

describe('Telemetry.shutdown()', () => {
	it('calls provider.shutdown() when provider exists', async () => {
		const shutdownMock = jest.fn().mockResolvedValue(undefined);
		const built = await new Telemetry().build();
		// Manually inject a mock provider
		const withProvider = {
			...built,
			provider: { forceFlush: jest.fn(), shutdown: shutdownMock },
		};
		await Telemetry.shutdown(withProvider);
		expect(shutdownMock).toHaveBeenCalled();
	});

	it('does nothing when no provider exists', async () => {
		const built = await new Telemetry().build();
		// Should not throw
		await Telemetry.shutdown(built);
	});
});

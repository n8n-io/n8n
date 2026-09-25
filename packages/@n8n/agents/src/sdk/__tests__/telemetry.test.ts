import type { Telemetry as AiSdkTelemetry } from 'ai';

import { Telemetry } from '../telemetry';

describe('Telemetry builder', () => {
	it('builds with defaults', async () => {
		const built = await new Telemetry().build();
		expect(built.enabled).toBe(true);
		expect(built.recordInputs).toBe(true);
		expect(built.recordOutputs).toBe(true);
		expect(built.runtimeRootSpanEnabled).toBe(true);
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
			.runtimeRootSpan(false)
			.build();

		expect(built.enabled).toBe(false);
		expect(built.functionId).toBe('my-agent');
		expect(built.metadata).toEqual({ team: 'platform', version: 2 });
		expect(built.recordInputs).toBe(false);
		expect(built.recordOutputs).toBe(false);
		expect(built.runtimeRootSpanEnabled).toBe(false);
	});

	it('accepts a pre-built tracer', async () => {
		const fakeTracer = { startSpan: vi.fn(), startActiveSpan: vi.fn() };
		const built = await new Telemetry().tracer(fakeTracer).build();
		expect(built.tracer).toBe(fakeTracer);
		expect(built.integrations).toHaveLength(1);
		expect(built.integrations[0]).toEqual(
			expect.objectContaining({
				onStart: expect.any(Function),
				executeLanguageModelCall: expect.any(Function),
			}),
		);
	});

	it('preserves metadata on AI SDK 7 OpenTelemetry spans', async () => {
		const fakeTracer = {
			startSpan: vi.fn(() => ({ end: vi.fn() })),
			startActiveSpan: vi.fn(),
		};
		const built = await new Telemetry().metadata({ team: 'platform' }).tracer(fakeTracer).build();

		built.integrations[0].onStart?.({
			operationId: 'ai.generateText',
			callId: 'call-1',
			provider: 'openai.responses',
			modelId: 'gpt-5',
			instructions: 'test',
			messages: [],
			maxRetries: 2,
			functionId: 'agent',
			recordInputs: true,
			recordOutputs: true,
		} as never);

		expect(fakeTracer.startSpan).toHaveBeenCalledWith(
			'ai.generateText',
			expect.objectContaining({
				attributes: expect.objectContaining({
					'ai.telemetry.metadata.team': 'platform',
				}),
			}),
			undefined,
		);
	});

	it('throws when both .tracer() and .otlpEndpoint() are set', async () => {
		await expect(
			new Telemetry().tracer({ startSpan: vi.fn() }).otlpEndpoint('http://localhost:4318').build(),
		).rejects.toThrow('Cannot set both .tracer() and .otlpEndpoint()');
	});

	it('collects multiple integrations', async () => {
		const int1: AiSdkTelemetry = { onStart: vi.fn() };
		const int2: AiSdkTelemetry = { onEnd: vi.fn() };
		const built = await new Telemetry().integration(int1).integration(int2).build();
		expect(built.integrations).toHaveLength(2);
	});
});

describe('Telemetry — redaction wrapping', () => {
	it('redacts hooks on frozen integrations', async () => {
		const onStart = vi.fn();
		const integration: AiSdkTelemetry = Object.freeze({ onStart });
		const built = await new Telemetry()
			.redact((data) => {
				const filtered = { ...data };
				delete filtered.secret;
				return filtered;
			})
			.integration(integration)
			.build();

		built.integrations[0].onStart?.({ secret: 'hidden', safe: 'ok' } as never);

		expect(onStart).toHaveBeenCalledWith({ safe: 'ok' });
	});

	it('accepts immutable redactor results', async () => {
		const onStart = vi.fn();
		const built = await new Telemetry()
			.redact((data) => {
				const filtered = { ...data };
				delete filtered.secret;
				return Object.freeze(filtered);
			})
			.integration({ onStart })
			.build();

		built.integrations[0].onStart?.({ secret: 'hidden', safe: 'ok' } as never);

		expect(onStart).toHaveBeenCalledWith({ safe: 'ok' });
	});

	it('redacts future event hooks without requiring an explicit wrapper', async () => {
		type FutureTelemetry = AiSdkTelemetry & {
			onFutureEvent: (event: Record<string, unknown>) => void;
			readonly receivedEvents: Array<Record<string, unknown>>;
		};

		class FutureIntegration {
			readonly #receivedEvents: Array<Record<string, unknown>> = [];

			onStart() {}

			onFutureEvent(event: Record<string, unknown>) {
				this.#receivedEvents.push(event);
			}

			get receivedEvents() {
				return this.#receivedEvents;
			}
		}

		const integration: FutureTelemetry = new FutureIntegration();
		const built = await new Telemetry()
			.redact((data) => {
				const filtered = { ...data };
				delete filtered.secret;
				return filtered;
			})
			.integration(integration)
			.build();

		const wrapped = built.integrations[0] as FutureTelemetry;
		wrapped.onFutureEvent({ secret: 'hidden', safe: 'ok' });

		expect(integration.receivedEvents).toEqual([{ safe: 'ok' }]);
	});

	it('preserves executor control fields while redacting their event data', async () => {
		let modelOptions: Record<string, unknown> | undefined;
		let toolOptions: Record<string, unknown> | undefined;
		const integration: AiSdkTelemetry = {
			executeLanguageModelCall: (options) => {
				modelOptions = options;
				return options.execute();
			},
			executeTool: (options) => {
				toolOptions = options;
				return options.execute();
			},
		};
		const built = await new Telemetry()
			.redact((data) => {
				const filtered = { ...data };
				delete filtered.callId;
				delete filtered.toolCallId;
				delete filtered.execute;
				delete filtered.secret;
				return Object.freeze(filtered);
			})
			.integration(integration)
			.build();

		const modelExecute = vi.fn().mockResolvedValue('model-result');
		await expect(
			built.integrations[0].executeLanguageModelCall?.({
				callId: 'model-call',
				execute: modelExecute,
				secret: 'hidden',
			} as never),
		).resolves.toBe('model-result');
		expect(modelOptions).toEqual({ callId: 'model-call', execute: modelExecute });

		const toolExecute = vi.fn().mockResolvedValue('tool-result');
		await expect(
			built.integrations[0].executeTool?.({
				callId: 'model-call',
				toolCallId: 'tool-call',
				execute: toolExecute,
				secret: 'hidden',
			} as never),
		).resolves.toBe('tool-result');
		expect(toolOptions).toEqual({
			callId: 'model-call',
			toolCallId: 'tool-call',
			execute: toolExecute,
		});
	});

	it('preserves the receiver for stateful integration methods', async () => {
		class StatefulIntegration {
			readonly receivedEvents: unknown[] = [];

			onStart(event: Parameters<NonNullable<AiSdkTelemetry['onStart']>>[0]) {
				this.receivedEvents.push(event);
			}
		}

		const integration = new StatefulIntegration();
		const built = await new Telemetry()
			.redact((data) => data)
			.integration(integration)
			.build();

		built.integrations[0].onStart!({ operationId: 'ai.generateText' } as never);

		expect(integration.receivedEvents).toHaveLength(1);
	});

	it('wraps integrations with redaction when .redact() is set', async () => {
		const receivedEvents: unknown[] = [];
		const integration: AiSdkTelemetry = {
			onStart: (event) => {
				receivedEvents.push(event);
			},
			onEnd: (event) => {
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
		const integration: AiSdkTelemetry = { onStart: vi.fn() };
		const built = await new Telemetry().integration(integration).build();
		// The integration should be a copy (not the same reference due to spread) but functionally identical
		expect(built.integrations[0].onStart).toBe(integration.onStart);
	});

	it('redacts top-level scalar fields via the redact callback', async () => {
		const receivedEvents: unknown[] = [];
		const integration: AiSdkTelemetry = {
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
		const integration: AiSdkTelemetry = {
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
		const shutdownMock = vi.fn().mockResolvedValue(undefined);
		const built = await new Telemetry().build();
		// Manually inject a mock provider
		const withProvider = {
			...built,
			provider: { forceFlush: vi.fn(), shutdown: shutdownMock },
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

describe('Telemetry.forceFlush()', () => {
	it('calls provider.forceFlush() when provider exists', async () => {
		const forceFlushMock = vi.fn().mockResolvedValue(undefined);
		const built = await new Telemetry().build();
		const withProvider = {
			...built,
			provider: { forceFlush: forceFlushMock, shutdown: vi.fn() },
		};

		await Telemetry.forceFlush(withProvider);

		expect(forceFlushMock).toHaveBeenCalled();
	});

	it('swallows provider.forceFlush() errors', async () => {
		const built = await new Telemetry().build();
		const withProvider = {
			...built,
			provider: {
				forceFlush: vi.fn().mockRejectedValue(new Error('flush failed')),
				shutdown: vi.fn(),
			},
		};

		await expect(Telemetry.forceFlush(withProvider)).resolves.toBeUndefined();
	});

	it('does nothing when no provider exists', async () => {
		const built = await new Telemetry().build();

		await expect(Telemetry.forceFlush(built)).resolves.toBeUndefined();
	});
});

import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import type {
	HttpRequestClient,
	HttpRequestClientOptions,
	OutboundHttp,
} from '@n8n/backend-network';
import { EngineConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { ExecutionResponse, StartExecutionRequest, StepMessage, WorkQueue } from '@n8n/engine';
import {
	context,
	propagation,
	ROOT_CONTEXT,
	SpanKind,
	SpanStatusCode,
	trace,
} from '@opentelemetry/api';
import { AlwaysOffSampler, type ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import type { Request, Response } from 'express';
import type { InstanceSettings } from 'n8n-core';
import { EventEmitter } from 'node:events';
import { mock } from 'vitest-mock-extended';

import { EngineDataPlaneClient } from '../engine-data-plane-client';
import { createEngineRuntimeInstrumentation } from '../engine-runtime-instrumentation';
import {
	createEngineHttpTracingMiddleware,
	engineTracingEnabled,
	extractEngineTraceContext,
	injectEngineTraceHeaders,
	runEngineSpan,
	runEngineSpanSync,
} from '../engine-tracing';
import {
	deserializeExecutionResponse,
	serializeExecutionResponse,
} from '../response-channel/execution-response-frame';
import {
	RedisExecutionResponseReceiver,
	type RedisResponseSubscriber,
} from '../response-channel/redis-execution-response-receiver';
import {
	RedisExecutionResponseSender,
	SHUTDOWN_DRAIN_TIMEOUT_MS,
	type RedisResponsePublisher,
} from '../response-channel/redis-execution-response-sender';

import { OtelTestProvider } from '@/modules/otel/__tests__/support/otel-test-provider';
import { OtelConfig } from '@/modules/otel/otel.config';
import type { OtelSettingsService } from '@/modules/otel/otel-settings.service';
import { OtelService } from '@/modules/otel/otel.service';

const { configuredSpans } = vi.hoisted(() => ({ configuredSpans: [] as ReadableSpan[] }));

vi.mock('@opentelemetry/exporter-trace-otlp-proto', () => ({
	OTLPTraceExporter: vi.fn().mockImplementation(function () {
		return {
			export: (spans: ReadableSpan[], callback: (result: { code: number }) => void) => {
				configuredSpans.push(...spans);
				callback({ code: 0 });
			},
			shutdown: async () => {},
			forceFlush: async () => {},
		};
	}),
}));

vi.mock('@opentelemetry/sdk-trace-base', async (importActual) => {
	const actual = await importActual<typeof import('@opentelemetry/sdk-trace-base')>();
	return { ...actual, BatchSpanProcessor: actual.SimpleSpanProcessor };
});

vi.mock('@opentelemetry/resources', async (importActual) => {
	const actual = await importActual<typeof import('@opentelemetry/resources')>();
	return { ...actual, detectResources: () => actual.emptyResource() };
});

const firstTraceId = '1'.repeat(32);
const secondTraceId = '2'.repeat(32);
const parentId = '3'.repeat(16);
const headersFor = (traceId: string) => ({ traceparent: `00-${traceId}-${parentId}-01` });
const responseFor = (executionId: string): ExecutionResponse => ({
	type: 'response',
	executionId,
	payload: { value: 'private-payload' },
});
const channelFor = (executionId: string) => `responses:${executionId}`;

function httpResponse() {
	const emitter = new EventEmitter();
	const res = mock<Response>({
		statusCode: 200,
		writableFinished: false,
	});
	res.once.mockImplementation((event, listener) => {
		emitter.once(event, listener);
		return res;
	});
	res.off.mockImplementation((event, listener) => {
		emitter.off(event, listener);
		return res;
	});
	res.emit.mockImplementation(emitter.emit.bind(emitter));
	return res;
}

describe('engine tracing', () => {
	let otel: OtelTestProvider;
	let engineConfig: EngineConfig;
	let otelConfig: OtelConfig;

	beforeEach(() => {
		engineConfig = mockInstance(EngineConfig, { tracingEnabled: true });
		otelConfig = mockInstance(OtelConfig, { enabled: true });
		otel = OtelTestProvider.create({ withContextManager: true });
		Container.set(OtelService, otel.asOtelService());
	});

	afterEach(async () => {
		await otel.shutdown();
		vi.useRealTimers();
	});

	it('exports all engine span paths through the configured provider with a foreign AlwaysOff global', async () => {
		trace.disable();
		const foreign = new NodeTracerProvider({ sampler: new AlwaysOffSampler() });
		trace.setGlobalTracerProvider(foreign);
		configuredSpans.length = 0;
		const fetch = vi.fn().mockResolvedValue({ ok: true });
		const service = new OtelService(
			mock<OtelSettingsService>(),
			mock<InstanceSettings>({ instanceId: 'instance', instanceType: 'main' }),
			mockLogger(),
			mock<OutboundHttp>({
				transport: vi.fn().mockReturnValue({ asCustomFetch: () => fetch }),
			}),
		);
		Container.set(OtelService, service);
		try {
			await service.initFromConfig(
				mock<OtelConfig>({
					enabled: true,
					exporterProtocol: 'http/protobuf',
					exporterEndpoint: 'http://localhost:4318',
					exporterTracingPath: '/v1/traces',
					exporterHeaders: '',
					exporterServiceName: 'configured-engine',
					tracesSampleRate: 1,
					startupConnectivityTimeoutMs: 2_000,
				}),
			);
			const raw = mock<WorkQueue<StepMessage>>();
			raw.publish.mockResolvedValue(undefined);
			raw.stop.mockResolvedValue(undefined);
			const queue = createEngineRuntimeInstrumentation()!.wrapQueue('step', raw);
			const message: StepMessage = { type: 'step:ready', executionId: 'exec', stepId: 'step' };
			const publisher = mock<RedisResponsePublisher>();
			publisher.publish.mockResolvedValue(1);
			const sender = new RedisExecutionResponseSender(publisher, channelFor, mockLogger());
			const res = httpResponse();
			await context.with(extractEngineTraceContext(headersFor(firstTraceId)), async () => {
				await runEngineSpan('engine.async', {}, async () => {
					await Promise.resolve();
					runEngineSpanSync('engine.sync', {}, () => sender.send(responseFor('exec')));
					await queue.publish(message);
				});
			});
			queue.start(async () => {
				await Promise.resolve();
				expect(trace.getSpanContext(context.active())?.traceId).toBe(firstTraceId);
			});
			await raw.start.mock.calls[0][0](message);
			void createEngineHttpTracingMiddleware('engine.http')(
				mock<Request>({ method: 'POST', headers: headersFor(firstTraceId) }),
				res,
				() => expect(trace.getSpanContext(context.active())?.traceId).toBe(firstTraceId),
			);
			res.emit('finish');
			await sender.stop();
			await queue.stop();
			expect(configuredSpans.map(({ name }) => name).toSorted()).toEqual([
				'engine.async',
				'engine.http',
				'engine.queue.step.consume',
				'engine.queue.step.wait',
				'engine.response.publish',
				'engine.sync',
			]);
			expect(new Set(configuredSpans.map((span) => span.spanContext().traceId))).toEqual(
				new Set([firstTraceId]),
			);
			for (const span of configuredSpans) {
				expect(span.resource.attributes['service.name']).toBe('configured-engine');
			}
			const asyncSpan = configuredSpans.find(({ name }) => name === 'engine.async')!;
			const syncSpan = configuredSpans.find(({ name }) => name === 'engine.sync')!;
			const producer = configuredSpans.find(({ name }) => name === 'engine.response.publish')!;
			expect(asyncSpan.parentSpanContext?.spanId).toBe(parentId);
			expect(syncSpan.parentSpanContext?.spanId).toBe(asyncSpan.spanContext().spanId);
			expect(producer.parentSpanContext?.spanId).toBe(syncSpan.spanContext().spanId);
			expect(trace.getTracer('foreign').startSpan('foreign').isRecording()).toBe(false);
			expect(otel.getFinishedSpans()).toEqual([]);
		} finally {
			await service.shutdown();
			await foreign.shutdown();
		}
	});

	it.each([
		[false, false],
		[false, true],
		[true, false],
	])('requires both tracing flags (%s, %s)', async (engineEnabled, otelEnabled) => {
		engineConfig.tracingEnabled = engineEnabled;
		otelConfig.enabled = otelEnabled;
		expect(engineTracingEnabled()).toBe(false);
		expect(await runEngineSpan('async', {}, async () => 1)).toBe(1);
		expect(runEngineSpanSync('sync', {}, () => 2)).toBe(2);
		context.with(
			trace.setSpanContext(ROOT_CONTEXT, {
				traceId: firstTraceId,
				spanId: parentId,
				traceFlags: 1,
			}),
			() => {
				expect(injectEngineTraceHeaders()).toEqual({});
				expect(extractEngineTraceContext(headersFor(secondTraceId))).toBe(ROOT_CONTEXT);
			},
		);
		expect(otel.getFinishedSpans()).toEqual([]);
	});

	it('ends spans and marks failures without exception details', async () => {
		const error = new Error('secret-header-and-payload');
		await expect(
			runEngineSpan('async-failed', {}, async () => {
				throw error;
			}),
		).rejects.toBe(error);
		expect(() =>
			runEngineSpanSync('sync-failed', {}, () => {
				throw error;
			}),
		).toThrow(error);
		const spans = otel.getFinishedSpans();
		expect(spans).toHaveLength(2);
		for (const span of spans) {
			expect(span.status).toEqual({ code: SpanStatusCode.ERROR });
			expect(span.events).toEqual([]);
			expect(span.attributes).toEqual({});
		}
		expect(trace.getSpan(context.active())).toBeUndefined();
	});

	it('propagates only bounded W3C trace context, never baggage', () => {
		const parent = extractEngineTraceContext({
			...headersFor(firstTraceId),
			tracestate: 'vendor=value',
			baggage: 'secret=value',
		});
		const baggage = propagation.createBaggage({ secret: { value: 'private' } });
		context.with(propagation.setBaggage(parent, baggage), () => {
			expect(injectEngineTraceHeaders()).toEqual({
				...headersFor(firstTraceId),
				tracestate: 'vendor=value',
			});
		});
		expect(propagation.getBaggage(parent)).toBeUndefined();
	});

	it.each([
		{},
		{ traceparent: 'not-a-parent' },
		{ traceparent: ['valid-looking'] },
		{ traceparent: `00-${'0'.repeat(32)}-${parentId}-01` },
		{ traceparent: 'a'.repeat(10_000) },
	])('does not inherit connection context from invalid carrier case %#', (carrier) => {
		context.with(extractEngineTraceContext(headersFor(firstTraceId)), () => {
			expect(trace.getSpanContext(extractEngineTraceContext(carrier))).toBeUndefined();
		});
	});

	it('ignores oversized or malformed tracestate while keeping the traceparent', () => {
		for (const tracestate of ['x'.repeat(513), 'vendor=value\nsecret', 123]) {
			const extracted = extractEngineTraceContext({ ...headersFor(firstTraceId), tracestate });
			expect(trace.getSpanContext(extracted)?.traceId).toBe(firstTraceId);
			expect(trace.getSpanContext(extracted)?.traceState).toBeUndefined();
		}
	});

	describe('HTTP', () => {
		it('keeps interleaved request traces separate and ends spans on response finish', async () => {
			const middleware = createEngineHttpTracingMiddleware('engine.cp.webhook');
			const firstResponse = httpResponse();
			const secondResponse = httpResponse();
			const requests: Array<Promise<void>> = [];
			let releaseFirst!: () => void;
			let releaseSecond!: () => void;
			const firstGate = new Promise<void>((resolve) => {
				releaseFirst = resolve;
			});
			const secondGate = new Promise<void>((resolve) => {
				releaseSecond = resolve;
			});
			const seen: string[] = [];
			void middleware(
				mock<Request>({
					method: 'POST',
					headers: headersFor(firstTraceId),
					url: '/webhook/private?secret=value',
				}),
				firstResponse,
				() => {
					requests.push(
						(async () => {
							await firstGate;
							seen.push(trace.getSpanContext(context.active())!.traceId);
							firstResponse.emit('finish');
						})(),
					);
				},
			);
			void middleware(
				mock<Request>({ method: 'POST', headers: headersFor(secondTraceId) }),
				secondResponse,
				() => {
					requests.push(
						(async () => {
							await secondGate;
							seen.push(trace.getSpanContext(context.active())!.traceId);
							secondResponse.emit('finish');
						})(),
					);
				},
			);
			expect(otel.getFinishedSpans()).toHaveLength(0);
			expect(trace.getSpan(context.active())).toBeUndefined();
			releaseSecond();
			await requests[1];
			expect(otel.getFinishedSpans()).toHaveLength(1);
			releaseFirst();
			await Promise.all(requests);
			expect(seen).toEqual([secondTraceId, firstTraceId]);
			for (const span of otel.getFinishedSpans()) {
				expect(span.kind).toBe(SpanKind.SERVER);
				expect(span.parentSpanContext?.spanId).toBe(parentId);
				expect(span.attributes).toEqual({
					'http.request.method': 'POST',
					'http.response.status_code': 200,
				});
			}
			expect(injectEngineTraceHeaders()).toEqual({});
		});

		it.each(['close', 'error'])('marks an aborted response as an error on %s', (event) => {
			const res = httpResponse();
			void createEngineHttpTracingMiddleware('request')(
				mock<Request>({ method: 'POST', headers: {} }),
				res,
				vi.fn(),
			);
			res.emit(event, new Error('private-error'));
			res.emit('finish');
			expect(otel.getFinishedSpans()).toHaveLength(1);
			expect(otel.getFinishedSpans()[0].status).toEqual({ code: SpanStatusCode.ERROR });
			expect(otel.getFinishedSpans()[0].events).toEqual([]);
		});

		it('records server status errors and sanitizes unknown methods', () => {
			const res = httpResponse();
			res.statusCode = 503;
			void createEngineHttpTracingMiddleware('request')(
				mock<Request>({ method: 'private-method', headers: {} }),
				res,
				vi.fn(),
			);
			res.emit('finish');
			expect(otel.getFinishedSpans()[0].attributes).toEqual({
				'http.request.method': '_OTHER',
				'http.response.status_code': 503,
			});
			expect(otel.getFinishedSpans()[0].status).toEqual({ code: SpanStatusCode.ERROR });
		});

		it('starts an unrelated request on a new trace even inside a stale active context', () => {
			context.with(extractEngineTraceContext(headersFor(firstTraceId)), () => {
				const res = httpResponse();
				void createEngineHttpTracingMiddleware('request')(
					mock<Request>({ method: 'GET', headers: {} }),
					res,
					() => {
						expect(trace.getSpanContext(context.active())?.traceId).not.toBe(firstTraceId);
					},
				);
				res.emit('finish');
			});
			expect(otel.getFinishedSpans()[0].parentSpanContext).toBeUndefined();
		});

		it('does not change HTTP behavior when tracing is off', () => {
			engineConfig.tracingEnabled = false;
			const next = vi.fn();
			const res = httpResponse();
			void createEngineHttpTracingMiddleware('request')(mock<Request>(), res, next);
			expect(next).toHaveBeenCalledOnce();
			expect(res.once).not.toHaveBeenCalled();
			expect(otel.getFinishedSpans()).toEqual([]);
		});

		it('injects the CLIENT span at request time and keeps mapped errors out of spans', async () => {
			let options: HttpRequestClientOptions | undefined;
			const received: Array<Record<string, string | undefined> | undefined> = [];
			const http = mock<HttpRequestClient>();
			http.request.mockImplementation(async () => {
				const headers = options?.headers;
				received.push(typeof headers === 'function' ? headers() : headers);
				return {
					statusCode: 400,
					headers: {},
					body: { error: 'private-error', reason: 'private-reason' },
				};
			});
			const client = new EngineDataPlaneClient(
				mock<EngineConfig>({ authSecret: 'a'.repeat(32), port: 3000 }),
				mock<OutboundHttp>({
					requests: vi.fn((input) => {
						options = input;
						return http;
					}),
				}),
				mock<InstanceSettings>({ instanceId: 'instance' }),
			);
			const request: StartExecutionRequest = {
				workflowId: 'wf',
				executionId: 'exec',
				graph: { nodes: [], edges: [] },
				workflow: {},
				callerContext: { hostMode: 'webhook' },
			};
			await context.with(extractEngineTraceContext(headersFor(firstTraceId)), async () => {
				await expect(client.startExecution(request)).rejects.toThrow('private-reason');
			});
			const [span] = otel.getFinishedSpans();
			expect(span.kind).toBe(SpanKind.CLIENT);
			expect(span.spanContext().traceId).toBe(firstTraceId);
			expect(received[0]?.traceparent).toBe(`00-${firstTraceId}-${span.spanContext().spanId}-01`);
			expect(received[0]?.authorization).toMatch(/^Bearer /);
			expect(span.status).toEqual({ code: SpanStatusCode.ERROR });
			expect(span.attributes).toEqual({ 'n8n.workflow.id': 'wf', 'n8n.execution.mode': 'webhook' });
			expect(span.events).toEqual([]);
			expect(http.request).toHaveBeenCalledWith(
				expect.objectContaining({ disableFollowRedirect: true }),
			);
		});

		it('keeps one trace from the CP webhook through the DP and Redis response', async () => {
			const cpResponse = httpResponse();
			const dpResponse = httpResponse();
			const publisher = mock<RedisResponsePublisher>();
			publisher.publish.mockResolvedValue(1);
			const sender = new RedisExecutionResponseSender(publisher, channelFor, mockLogger());
			const subscriber = mock<RedisResponseSubscriber>();
			subscriber.subscribe.mockResolvedValue(1);
			const receiver = new RedisExecutionResponseReceiver(subscriber, channelFor, mockLogger());
			await receiver.start();
			await receiver.receive('exec', () => cpResponse.emit('finish'));
			let options: HttpRequestClientOptions | undefined;
			const http = mock<HttpRequestClient>();
			http.request.mockImplementation(async () => {
				const headers = options?.headers;
				const incoming = typeof headers === 'function' ? headers() : headers;
				void createEngineHttpTracingMiddleware('engine.dp.http')(
					mock<Request>({ method: 'POST', headers: incoming }),
					dpResponse,
					() => sender.send(responseFor('exec')),
				);
				dpResponse.emit('finish');
				return { statusCode: 201, headers: {}, body: { executionId: 'exec' } };
			});
			const client = new EngineDataPlaneClient(
				mock<EngineConfig>({ authSecret: 'a'.repeat(32), port: 3000 }),
				mock<OutboundHttp>({
					requests: vi.fn((input) => {
						options = input;
						return http;
					}),
				}),
				mock<InstanceSettings>({ instanceId: 'instance' }),
			);
			const request: StartExecutionRequest = {
				workflowId: 'wf',
				executionId: 'exec',
				graph: { nodes: [], edges: [] },
				workflow: {},
				callerContext: { hostMode: 'webhook' },
			};
			let admission: Promise<unknown> | undefined;
			void createEngineHttpTracingMiddleware('engine.cp.webhook')(
				mock<Request>({ method: 'POST', headers: {} }),
				cpResponse,
				() => {
					admission = client.startExecution(request);
				},
			);
			await admission;
			expect(otel.getFinishedSpans().some((span) => span.name === 'engine.cp.webhook')).toBe(false);
			const onMessage = subscriber.on.mock.calls.find(([event]) => event === 'message')![1];
			const [channel, frame] = publisher.publish.mock.calls[0];
			onMessage(channel, frame);
			await sender.stop();
			await receiver.stop();
			const spans = otel.getFinishedSpans();
			expect(spans.map((span) => span.name).toSorted()).toEqual([
				'engine.cp.start_execution',
				'engine.cp.webhook',
				'engine.dp.http',
				'engine.response.publish',
				'engine.response.receive',
			]);
			expect(new Set(spans.map((span) => span.spanContext().traceId)).size).toBe(1);
			const cp = spans.find((span) => span.name === 'engine.cp.webhook')!;
			const clientSpan = spans.find((span) => span.kind === SpanKind.CLIENT)!;
			const dp = spans.find((span) => span.name === 'engine.dp.http')!;
			const producer = spans.find((span) => span.kind === SpanKind.PRODUCER)!;
			const consumer = spans.find((span) => span.kind === SpanKind.CONSUMER)!;
			expect(clientSpan.parentSpanContext?.spanId).toBe(cp.spanContext().spanId);
			expect(dp.parentSpanContext?.spanId).toBe(clientSpan.spanContext().spanId);
			expect(producer.parentSpanContext?.spanId).toBe(dp.spanContext().spanId);
			expect(consumer.parentSpanContext?.spanId).toBe(producer.spanContext().spanId);
			expect(trace.getSpan(context.active())).toBeUndefined();
		});
	});

	describe('Redis', () => {
		it('ends a PRODUCER span only after Redis acknowledges the publish', async () => {
			let acknowledge!: () => void;
			const publisher = mock<RedisResponsePublisher>();
			publisher.publish.mockReturnValue(
				new Promise((resolve) => {
					acknowledge = () => resolve(1);
				}),
			);
			const sender = new RedisExecutionResponseSender(publisher, channelFor, mockLogger());
			context.with(extractEngineTraceContext(headersFor(firstTraceId)), () => {
				expect(sender.send(responseFor('exec-1'))).toEqual({ ok: true, result: undefined });
			});
			expect(publisher.publish).toHaveBeenCalledTimes(1);
			expect(otel.getFinishedSpans()).toEqual([]);
			const frame = JSON.parse(publisher.publish.mock.calls[0][1]) as {
				traceContext: Record<string, string>;
			};
			expect(trace.getSpanContext(extractEngineTraceContext(frame.traceContext))?.traceId).toBe(
				firstTraceId,
			);
			acknowledge();
			await sender.stop();
			expect(otel.getFinishedSpans()).toHaveLength(1);
			expect(otel.getFinishedSpans()[0].kind).toBe(SpanKind.PRODUCER);
			expect(otel.getFinishedSpans()[0].attributes).toEqual({
				'n8n.execution.id': 'exec-1',
				'n8n.response.type': 'response',
			});
		});

		it('restores each interleaved response context instead of the subscriber context', async () => {
			const publisher = mock<RedisResponsePublisher>();
			publisher.publish.mockResolvedValue(1);
			const sender = new RedisExecutionResponseSender(publisher, channelFor, mockLogger());
			const subscriber = mock<RedisResponseSubscriber>();
			subscriber.subscribe.mockResolvedValue(1);
			const receiver = new RedisExecutionResponseReceiver(subscriber, channelFor, mockLogger());
			const received: Array<string | undefined> = [];
			await context.with(extractEngineTraceContext(headersFor(firstTraceId)), async () => {
				await receiver.start();
				await receiver.receive('exec-1', () =>
					received.push(trace.getSpanContext(context.active())?.traceId),
				);
				await receiver.receive('exec-2', () =>
					received.push(trace.getSpanContext(context.active())?.traceId),
				);
			});
			context.with(extractEngineTraceContext(headersFor(firstTraceId)), () =>
				sender.send(responseFor('exec-1')),
			);
			context.with(extractEngineTraceContext(headersFor(secondTraceId)), () =>
				sender.send(responseFor('exec-2')),
			);
			const onMessage = subscriber.on.mock.calls.find(([event]) => event === 'message')![1];
			context.with(extractEngineTraceContext(headersFor(firstTraceId)), () => {
				for (const [channel, frame] of publisher.publish.mock.calls.toReversed())
					onMessage(channel, frame);
				onMessage(channelFor('exec-1'), JSON.stringify(responseFor('exec-1')));
			});
			await sender.stop();
			await receiver.stop();
			expect(received.slice(0, 2)).toEqual([secondTraceId, firstTraceId]);
			expect(received[2]).not.toBe(firstTraceId);
			expect(received[2]).not.toBe(secondTraceId);
			const consumers = otel.getFinishedSpans().filter((span) => span.kind === SpanKind.CONSUMER);
			const producers = otel.getFinishedSpans().filter((span) => span.kind === SpanKind.PRODUCER);
			for (const consumer of consumers.slice(0, 2)) {
				const producer = producers.find(
					(span) => span.spanContext().traceId === consumer.spanContext().traceId,
				);
				expect(consumer.parentSpanContext?.spanId).toBe(producer?.spanContext().spanId);
			}
			expect(consumers[2].parentSpanContext).toBeUndefined();
			expect(trace.getSpan(context.active())).toBeUndefined();
		});

		it.each([
			null,
			'not-an-object',
			{ traceparent: 123 },
			{ traceparent: 'x'.repeat(10_000) },
			{ traceparent: 'bad', baggage: 'private' },
		])('delivers a valid response with invalid metadata case %#', async (traceContext) => {
			const subscriber = mock<RedisResponseSubscriber>();
			subscriber.subscribe.mockResolvedValue(1);
			const receiver = new RedisExecutionResponseReceiver(subscriber, channelFor, mockLogger());
			const handler = vi.fn();
			await receiver.start();
			await receiver.receive('exec', handler);
			const onMessage = subscriber.on.mock.calls.find(([event]) => event === 'message')![1];
			onMessage(channelFor('exec'), JSON.stringify({ ...responseFor('exec'), traceContext }));
			expect(handler).toHaveBeenCalledExactlyOnceWith(responseFor('exec'));
			expect(otel.getFinishedSpans()[0].parentSpanContext).toBeUndefined();
			await receiver.stop();
		});

		it('marks publish failures without recording raw error details', async () => {
			const publisher = mock<RedisResponsePublisher>();
			publisher.publish.mockRejectedValue(new Error('private-error-message'));
			const sender = new RedisExecutionResponseSender(publisher, channelFor, mockLogger());
			expect(sender.send(responseFor('exec'))).toEqual({ ok: true, result: undefined });
			await sender.stop();
			const [span] = otel.getFinishedSpans();
			expect(span.status).toEqual({ code: SpanStatusCode.ERROR });
			expect(span.events).toEqual([]);
			expect(JSON.stringify(span.attributes)).not.toContain('private');
		});

		it('ends a pending producer before shutdown returns and handles a later disconnect rejection once', async () => {
			vi.useFakeTimers();
			let rejectPublish!: (error: Error) => void;
			const logger = mockLogger();
			const publisher = mock<RedisResponsePublisher>();
			let end: (() => void) | undefined;
			publisher.publish.mockImplementation(
				async () =>
					await new Promise((_, reject) => {
						rejectPublish = reject;
						end = vi.spyOn(trace.getSpan(context.active())!, 'end');
					}),
			);
			let finishedBeforeDisconnect = 0;
			publisher.disconnect.mockImplementation(() => {
				finishedBeforeDisconnect = otel.getFinishedSpans().length;
				setTimeout(() => rejectPublish(new Error('private-disconnect-error')), 10);
			});
			const sender = new RedisExecutionResponseSender(publisher, channelFor, logger);
			expect(sender.send(responseFor('exec'))).toEqual({ ok: true, result: undefined });
			expect(otel.getFinishedSpans()).toEqual([]);
			const stopping = sender.stop();
			await vi.advanceTimersByTimeAsync(SHUTDOWN_DRAIN_TIMEOUT_MS - 1);
			expect(publisher.disconnect).not.toHaveBeenCalled();
			expect(otel.getFinishedSpans()).toEqual([]);
			await vi.advanceTimersByTimeAsync(1);
			await stopping;
			expect(finishedBeforeDisconnect).toBe(1);
			const [span] = otel.getFinishedSpans();
			expect(span.kind).toBe(SpanKind.PRODUCER);
			expect(span.status).toEqual({ code: SpanStatusCode.ERROR });
			expect(span.events).toEqual([]);
			expect(end).toHaveBeenCalledOnce();
			expect(logger.error).not.toHaveBeenCalled();
			await vi.advanceTimersByTimeAsync(10);
			expect(logger.error).toHaveBeenCalledOnce();
			expect(end).toHaveBeenCalledOnce();
			expect(otel.getFinishedSpans()).toHaveLength(1);
			await sender.stop();
			expect(publisher.disconnect).toHaveBeenCalledOnce();
		});

		it('preserves a synchronous publish failure and ends its span', () => {
			const publisher = mock<RedisResponsePublisher>();
			const error = new Error('private-error');
			publisher.publish.mockImplementation(() => {
				throw error;
			});
			const sender = new RedisExecutionResponseSender(publisher, channelFor, mockLogger());
			expect(() => sender.send(responseFor('exec'))).toThrow(error);
			expect(otel.getFinishedSpans()).toHaveLength(1);
			expect(otel.getFinishedSpans()[0].status).toEqual({ code: SpanStatusCode.ERROR });
			expect(otel.getFinishedSpans()[0].events).toEqual([]);
		});

		it('ends the CONSUMER span when its handler fails', async () => {
			const subscriber = mock<RedisResponseSubscriber>();
			subscriber.subscribe.mockResolvedValue(1);
			const receiver = new RedisExecutionResponseReceiver(subscriber, channelFor, mockLogger());
			await receiver.start();
			await receiver.receive('exec', () => {
				throw new Error('private-handler-error');
			});
			const onMessage = subscriber.on.mock.calls.find(([event]) => event === 'message')![1];
			expect(() =>
				onMessage(channelFor('exec'), JSON.stringify(responseFor('exec'))),
			).not.toThrow();
			expect(otel.getFinishedSpans()[0].status).toEqual({ code: SpanStatusCode.ERROR });
			expect(otel.getFinishedSpans()[0].events).toEqual([]);
			await receiver.stop();
		});

		it('keeps the exact wire format and synchronous result with tracing off', async () => {
			engineConfig.tracingEnabled = false;
			const publisher = mock<RedisResponsePublisher>();
			publisher.publish.mockResolvedValue(1);
			const sender = new RedisExecutionResponseSender(publisher, channelFor, mockLogger());
			expect(sender.send(responseFor('exec'))).toEqual({ ok: true, result: undefined });
			expect(publisher.publish).toHaveBeenCalledExactlyOnceWith(
				channelFor('exec'),
				JSON.stringify(responseFor('exec')),
			);
			await sender.stop();
			expect(otel.getFinishedSpans()).toEqual([]);
		});

		it('counts metadata in the frame budget and preserves context on fallback', () => {
			const response: ExecutionResponse = {
				type: 'response',
				executionId: 'exec',
				payload: 'x'.repeat(400),
			};
			const budget = Buffer.byteLength(JSON.stringify(response));
			const result = serializeExecutionResponse(
				response,
				mockLogger(),
				budget,
				headersFor(firstTraceId),
			);
			expect(result.ok).toBe(false);
			expect(Buffer.byteLength(result.frame)).toBeLessThanOrEqual(budget);
			const frame = JSON.parse(result.frame) as {
				type: string;
				traceContext: Record<string, string>;
			};
			expect(frame.type).toBe('undeliverable');
			expect(frame.traceContext).toEqual(headersFor(firstTraceId));
			expect(deserializeExecutionResponse(result.frame, mockLogger()).ok).toBe(true);
		});

		it('preserves fallback context after serialization fails', () => {
			const response = responseFor('exec') as ExecutionResponse & { circular?: unknown };
			response.circular = response;
			const result = serializeExecutionResponse(
				response,
				mockLogger(),
				undefined,
				headersFor(firstTraceId),
			);
			expect(result.ok).toBe(false);
			expect(JSON.parse(result.frame)).toMatchObject({
				type: 'undeliverable',
				traceContext: headersFor(firstTraceId),
				error: { code: 'RESPONSE_SERIALIZATION_FAILED' },
			});
		});

		it('omits fallback metadata when it does not fit the frame budget', () => {
			const response: ExecutionResponse = {
				type: 'response',
				executionId: 'exec',
				payload: 'x'.repeat(200),
			};
			const result = serializeExecutionResponse(
				response,
				mockLogger(),
				220,
				headersFor(firstTraceId),
			);
			expect(result.ok).toBe(false);
			expect(Buffer.byteLength(result.frame)).toBeLessThanOrEqual(220);
			expect(JSON.parse(result.frame)).not.toHaveProperty('traceContext');
		});
	});
});

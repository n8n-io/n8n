import { EngineConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type {
	NodeExecutionTraceContext,
	V1StepExecutorInstrumentation,
} from '@n8n/node-engine-compatibility';
import {
	V1_STEP_EXECUTOR_PHASES,
	V1StepExecutor,
	V1WorkflowConverter,
} from '@n8n/node-engine-compatibility';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { context, ROOT_CONTEXT, SpanStatusCode, trace } from '@opentelemetry/api';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { OtelTestProvider } from '../../otel/__tests__/support/otel-test-provider';
import { OtelConfig } from '../../otel/otel.config';
import { OtelService } from '../../otel/otel.service';
import { createEngineExecutorInstrumentation } from '../engine-executor-instrumentation';
import { runEngineSpan } from '../engine-tracing';
import { traceEngineStepExecutor } from '../engine-runtime-instrumentation';
import {
	items,
	stepRequest,
	testAdditionalDataFactory,
	testNodeTypes,
	v1Workflow,
} from '../../../../../@n8n/node-engine-compatibility/src/__tests__/fixtures';
import '../../../../../@n8n/node-engine-compatibility/src/__tests__/setup-vm-evaluator';

const metadata: NodeExecutionTraceContext = {
	executionId: 'exec-1',
	stepId: 'step-1',
	workflowId: 'wf-1',
	nodeId: 'node-1',
	nodeType: 'n8n-nodes-base.noOp',
	iteration: 3,
};

function hooks(): V1StepExecutorInstrumentation {
	const result = createEngineExecutorInstrumentation();
	if (!result) throw new Error('Test requires executor instrumentation');
	return result;
}

describe('engine executor instrumentation', () => {
	let otel: OtelTestProvider;
	beforeAll(() => {
		otel = OtelTestProvider.create({ withContextManager: true });
		Container.set(OtelService, otel.asOtelService());
	});
	afterAll(async () => await otel.shutdown());
	beforeEach(() => {
		otel.reset();
		vi.restoreAllMocks();
		Container.get(EngineConfig).tracingEnabled = true;
		Container.get(OtelConfig).enabled = true;
	});

	it.each([
		[false, false],
		[false, true],
		[true, false],
	])(
		'does not allocate hooks or look up a tracer with engine=%s and otel=%s',
		(engine, enabled) => {
			Container.get(EngineConfig).tracingEnabled = engine;
			Container.get(OtelConfig).enabled = enabled;
			const getTracer = vi.spyOn(Container.get(OtelService), 'getTracer');
			expect(createEngineExecutorInstrumentation()).toBeUndefined();
			expect(getTracer).not.toHaveBeenCalled();
			expect(otel.getFinishedSpans()).toEqual([]);
		},
	);

	it('measures every canonical phase and keeps store calls below the active data phase', async () => {
		const instrumentation = hooks();
		await runEngineSpan('engine.node.execute', {}, async () => {
			for (const phase of V1_STEP_EXECUTOR_PHASES) {
				if (phase === 'load-data') {
					await instrumentation.run(
						phase,
						metadata,
						async () =>
							await runEngineSpan('engine.store.execution.loadExecution', {}, async () => 42),
					);
				} else {
					expect(instrumentation.runSync(phase, metadata, () => 42)).toBe(42);
				}
			}
		});
		const spans = otel.getFinishedSpans();
		const executor = spans.find(({ name }) => name === 'engine.node.execute')!;
		const phases = spans.filter(({ name }) => name.startsWith('engine.node.executor.'));
		expect(phases.map(({ name }) => name)).toEqual(
			V1_STEP_EXECUTOR_PHASES.map((phase) => `engine.node.executor.${phase}`),
		);
		for (const span of phases) {
			expect(span.parentSpanContext?.spanId).toBe(executor.spanContext().spanId);
			expect(span.attributes).toEqual({
				'engine.execution.id': 'exec-1',
				'engine.step.id': 'step-1',
				'engine.workflow.id': 'wf-1',
				'engine.node.id': 'node-1',
				'engine.node.type': 'n8n-nodes-base.noOp',
				'engine.step.iteration': 3,
				'engine.node.boundary': 'phase',
				'engine.node.phase': span.name.split('.').at(-1),
			});
		}
		expect(spans[0].parentSpanContext?.spanId).toBe(phases[0].spanContext().spanId);
	});

	it('keeps async phases open until the operation settles and restores the executor context', async () => {
		const instrumentation = hooks();
		const gate = createDeferredPromise();
		await runEngineSpan('engine.node.execute', {}, async () => {
			const parent = trace.getSpan(context.active());
			const pending = instrumentation.run('additional-data', metadata, async () => {
				expect(trace.getSpan(context.active())).not.toBe(parent);
				await gate.promise;
				return 42;
			});
			expect(otel.getFinishedSpans()).toEqual([]);
			expect(trace.getSpan(context.active())).toBe(parent);
			gate.resolve();
			await expect(pending).resolves.toBe(42);
			expect(otel.getFinishedSpans()[0].name).toBe('engine.node.executor.additional-data');
		});
	});

	it('never makes isolate tokens active and ends each token only once', async () => {
		const instrumentation = hooks();
		await runEngineSpan('engine.node.execute', {}, async () => {
			const parent = trace.getSpan(context.active());
			const entry = instrumentation.start('isolate-enter', metadata);
			expect(trace.getSpan(context.active())).toBe(parent);
			entry.end();
			entry.end();
			entry.fail();
			await runEngineSpan('engine.node.body', {}, async () => 42);
			const exit = instrumentation.start('isolate-exit', metadata);
			expect(trace.getSpan(context.active())).toBe(parent);
			exit.fail();
			exit.end();
			exit.end();
		});
		const spans = otel.getFinishedSpans();
		expect(spans.map(({ name }) => name)).toEqual([
			'engine.node.executor.isolate-enter',
			'engine.node.body',
			'engine.node.executor.isolate-exit',
			'engine.node.execute',
		]);
		for (const span of spans.slice(0, 3)) {
			expect(span.parentSpanContext?.spanId).toBe(spans[3].spanContext().spanId);
		}
		expect(spans[0].status.code).toBe(SpanStatusCode.UNSET);
		expect(spans[2].status).toEqual({ code: SpanStatusCode.ERROR });
	});

	it.each(['async', 'sync'] as const)(
		'preserves %s errors without exporting exception details',
		async (kind) => {
			const instrumentation = hooks();
			const error = new Error('private-payload-value');
			if (kind === 'async') {
				await expect(
					instrumentation.run('load-data', metadata, async () => {
						throw error;
					}),
				).rejects.toBe(error);
			} else {
				try {
					instrumentation.runSync('context-setup', metadata, () => {
						throw error;
					});
					throw new Error('Expected the operation to throw');
				} catch (thrown) {
					expect(thrown).toBe(error);
				}
			}
			const span = otel.getFinishedSpans()[0];
			expect(span.status).toEqual({ code: SpanStatusCode.ERROR });
			expect(span.events).toEqual([]);
			expect(JSON.stringify(span.attributes)).not.toContain(error.message);
		},
	);

	it('drops identifiers and node types that do not meet the bounded identifier policy', () => {
		hooks().runSync(
			'context-setup',
			{
				executionId: 'user@example.com',
				stepId: 'x'.repeat(129),
				workflowId: 'a\nb',
				nodeId: 'user node name',
				nodeType: 'node?password=secret',
				iteration: Number.NaN,
			},
			() => 42,
		);
		expect(otel.getFinishedSpans()[0].attributes).toEqual({
			'engine.node.boundary': 'phase',
			'engine.node.phase': 'context-setup',
		});
	});

	it('keeps interleaved phase and token parents separate after one execution fails', async () => {
		const instrumentation = hooks();
		const firstEntered = createDeferredPromise();
		const gate = createDeferredPromise();
		const error = new Error('private failure');
		const a = trace.getTracer('test').startSpan('executor-a', {}, ROOT_CONTEXT);
		const b = trace.getTracer('test').startSpan('executor-b', {}, ROOT_CONTEXT);
		const first = context.with(trace.setSpan(ROOT_CONTEXT, a), async () => {
			const token = instrumentation.start('isolate-enter', { ...metadata, executionId: 'exec-a' });
			try {
				return await instrumentation.run(
					'load-data',
					{ ...metadata, executionId: 'exec-a' },
					async () => {
						firstEntered.resolve();
						await gate.promise;
						throw error;
					},
				);
			} finally {
				token.fail();
				token.end();
			}
		});
		const rejected = expect(first).rejects.toBe(error);
		await firstEntered.promise;
		await context.with(trace.setSpan(ROOT_CONTEXT, b), async () => {
			const token = instrumentation.start('isolate-enter', { ...metadata, executionId: 'exec-b' });
			token.end();
			await instrumentation.run(
				'load-data',
				{ ...metadata, executionId: 'exec-b' },
				async () => 42,
			);
		});
		gate.resolve();
		await rejected;
		a.end();
		b.end();
		for (const span of otel
			.getFinishedSpans()
			.filter(({ name }) => name.startsWith('engine.node.executor.'))) {
			expect(span.parentSpanContext?.spanId).toBe(
				span.attributes['engine.execution.id'] === 'exec-a'
					? a.spanContext().spanId
					: b.spanContext().spanId,
			);
		}
		expect(trace.getSpan(context.active())).toBeUndefined();
	});

	it.each([
		['test.echoParam', false, false, false],
		['test.alwaysFails', false, true, false],
		['test.succeedsWithFailingCleanup', false, true, true],
		['test.failsWithFailingCleanup', true, false, true],
	] as const)(
		'keeps real VM executor boundaries for %s with continueOnFail=%s',
		async (type, continueOnFail, failed, cleanup) => {
			const graph = new V1WorkflowConverter().convert(
				v1Workflow(
					[
						{ id: 't', name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
						{ id: 'n', name: 'Subject', type, parameters: { message: '={{ $json.value }}' } },
					],
					{ Manual: { main: [[{ node: 'Subject', type: 'main', index: 0 }]] } },
				),
			);
			const request = stepRequest(graph, 'n', items({ value: 'private-payload-value' }));
			request.node.config = { ...(request.node.config as object), continueOnFail };
			const executor = traceEngineStepExecutor(
				new V1StepExecutor({
					nodeTypes: testNodeTypes,
					loadStepData: async () =>
						await runEngineSpan('engine.store.execution.loadExecution', {}, async () => ({
							graph,
							outputsByNode: {},
						})),
					additionalDataFactory: testAdditionalDataFactory,
					instrumentation: hooks(),
					traceNodeExecution: async (_metadata, run) =>
						await runEngineSpan('engine.node.body', {}, run),
				}),
			);
			if (failed) {
				await expect(executor.execute(request)).rejects.toThrow();
			} else {
				await expect(executor.execute(request)).resolves.toEqual({
					outputs: items(
						continueOnFail
							? { value: 'private-payload-value' }
							: { message: 'private-payload-value' },
					),
				});
			}
			const spans = otel.getFinishedSpans();
			const executorSpan = spans.find(({ name }) => name === 'engine.node.execute')!;
			const phases = spans.filter(({ name }) => name.startsWith('engine.node.executor.'));
			const body = spans.find(({ name }) => name === 'engine.node.body')!;
			expect(body.parentSpanContext?.spanId).toBe(executorSpan.spanContext().spanId);
			for (const phase of phases) {
				expect(phase.parentSpanContext?.spanId).toBe(executorSpan.spanContext().spanId);
			}
			const data = phases.find(({ name }) => name.endsWith('.load-data'))!;
			expect(spans[0].parentSpanContext?.spanId).toBe(data.spanContext().spanId);
			expect(phases.some(({ name }) => name.endsWith('.cleanup'))).toBe(cleanup);
			expect(phases.find(({ name }) => name.endsWith('.isolate-exit'))?.status.code).toBe(
				SpanStatusCode.UNSET,
			);
			expect(executorSpan.status.code).toBe(failed ? SpanStatusCode.ERROR : SpanStatusCode.UNSET);
			if (continueOnFail) {
				expect(body.status.code).toBe(SpanStatusCode.ERROR);
				expect(phases.find(({ name }) => name.endsWith('.cleanup'))?.status.code).toBe(
					SpanStatusCode.UNSET,
				);
			}
			for (const span of spans) {
				expect(span.events).toEqual([]);
				expect(JSON.stringify({ attributes: span.attributes, status: span.status })).not.toContain(
					'private-payload-value',
				);
			}
		},
	);
});

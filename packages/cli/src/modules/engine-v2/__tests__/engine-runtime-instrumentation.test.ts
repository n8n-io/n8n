import { EngineConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type {
	EngineRuntimeInstrumentation,
	EngineStores,
	ExecutionRecord,
	ExecutionStore,
	ExecutionViewStore,
	IStepExecutor,
	NewExecutionRecord,
	StepExecutionRequest,
	StepExecutionResult,
	StepMessage,
	StepStore,
	WorkQueue,
} from '@n8n/engine';
import { context, ROOT_CONTEXT, SpanStatusCode, trace } from '@opentelemetry/api';
import { hrTimeToMilliseconds } from '@opentelemetry/core';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { OtelTestProvider } from '../../otel/__tests__/support/otel-test-provider';
import { OtelConfig } from '../../otel/otel.config';
import { OtelService } from '../../otel/otel.service';
import {
	createEngineRuntimeInstrumentation,
	traceEngineStepExecutor,
} from '../engine-runtime-instrumentation';
import { InMemoryWorkQueue } from '../../../../../@n8n/engine/src/queue/in-memory-work-queue';

function deferred() {
	let resolve = () => {};
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

function enabledInstrumentation(): EngineRuntimeInstrumentation {
	const instrumentation = createEngineRuntimeInstrumentation();
	if (!instrumentation) throw new Error('Test requires instrumentation');
	return instrumentation;
}

const stores: EngineStores = {
	executionStore: mock<ExecutionStore>(),
	stepStore: mock<StepStore>(),
	executionViewStore: mock<ExecutionViewStore>(),
};
const secret = 'private-payload-value';
const stepRequest: StepExecutionRequest = {
	node: { id: 'node-1', name: secret, type: 'v1-node', config: { password: secret } },
	inputs: [[{ password: secret }]],
	context: {
		executionId: 'exec-1',
		stepId: 'step-1',
		workflowId: 'wf-1',
		iteration: 3,
		mode: 'production',
		callerContext: { hostMode: 'trigger', userId: secret },
		responseExpectation: { kind: 'none' },
	},
	respond: mock<StepExecutionRequest['respond']>(),
};

describe('engine runtime instrumentation', () => {
	let otel: OtelTestProvider;
	beforeAll(() => {
		otel = OtelTestProvider.create({ withContextManager: true });
		Container.set(OtelService, otel.asOtelService());
	});
	afterAll(async () => {
		await otel.shutdown();
	});
	beforeEach(() => {
		otel.reset();
		vi.clearAllMocks();
		Container.get(EngineConfig).tracingEnabled = true;
		Container.get(OtelConfig).enabled = true;
	});

	it.each([
		[false, false],
		[false, true],
		[true, false],
	])('keeps the off path unchanged with engine=%s and otel=%s', (engine, enabled) => {
		Container.get(EngineConfig).tracingEnabled = engine;
		Container.get(OtelConfig).enabled = enabled;
		const executor = mock<IStepExecutor>();
		expect(createEngineRuntimeInstrumentation()).toBeUndefined();
		expect(traceEngineStepExecutor(executor)).toBe(executor);
		expect(otel.getFinishedSpans()).toEqual([]);
	});

	it('keeps bound store methods stable and preserves arguments, results, and failures', async () => {
		const record = mock<ExecutionRecord>({
			graph: { nodes: [], edges: [] },
			workflow: { password: secret },
		});
		vi.mocked(stores.executionStore.loadExecution).mockImplementation(async function (
			this: ExecutionStore,
			id,
		) {
			expect(this).toBe(stores.executionStore);
			expect(id).toBe(secret);
			return record;
		});
		const error = new Error(secret);
		vi.mocked(stores.stepStore.claimStep).mockRejectedValue(error);
		const wrapped = enabledInstrumentation().wrapStores(stores);
		expect(wrapped.executionStore.loadExecution).toBe(wrapped.executionStore.loadExecution);
		expect(wrapped.stepStore.claimStep).toBe(wrapped.stepStore.claimStep);
		const load = wrapped.executionStore.loadExecution;
		await expect(load(secret)).resolves.toBe(record);
		await expect(wrapped.stepStore.claimStep(secret)).rejects.toBe(error);
		const spans = otel.getFinishedSpans();
		expect(spans.map(({ name }) => name)).toEqual([
			'engine.store.execution.loadExecution',
			'engine.store.step.claimStep',
		]);
		expect(spans[1].status).toEqual({ code: SpanStatusCode.ERROR });
		for (const span of spans) {
			expect(span.attributes['engine.store.boundary']).toBe('api');
			expect(span.events).toEqual([]);
			expect(
				JSON.stringify({ attributes: span.attributes, status: span.status, events: span.events }),
			).not.toContain(secret);
		}
	});

	it('measures the awaited write, gather, and finish calls without recording data', async () => {
		const gate = deferred();
		const record = mock<NewExecutionRecord>({ workflow: { password: secret } });
		vi.mocked(stores.executionStore.createExecution).mockReturnValue(gate.promise);
		vi.mocked(stores.stepStore.loadStepsByKeys).mockResolvedValue({});
		vi.mocked(stores.stepStore.completeStep).mockResolvedValue(true);
		const finished = { finishedAt: new Date() };
		vi.mocked(stores.executionStore.finishExecution).mockResolvedValue(finished);
		const wrapped = enabledInstrumentation().wrapStores(stores);
		const writing = wrapped.executionStore.createExecution(record);
		expect(otel.getFinishedSpans()).toEqual([]);
		gate.resolve();
		await writing;
		expect(stores.executionStore.createExecution).toHaveBeenCalledExactlyOnceWith(record);
		await expect(
			wrapped.stepStore.loadStepsByKeys('exec-1', [{ nodeId: 'node-1', iteration: 0 }]),
		).resolves.toEqual({});
		await expect(wrapped.stepStore.completeStep('step-1', [[{ password: secret }]])).resolves.toBe(
			true,
		);
		await expect(wrapped.executionStore.finishExecution('exec-1', 'completed')).resolves.toBe(
			finished,
		);
		expect(otel.getFinishedSpans().map(({ name }) => name)).toEqual([
			'engine.store.execution.createExecution',
			'engine.store.step.loadStepsByKeys',
			'engine.store.step.completeStep',
			'engine.store.execution.finishExecution',
		]);
		expect(
			JSON.stringify(otel.getFinishedSpans().map(({ attributes }) => attributes)),
		).not.toContain(secret);
	});

	it('traces read-side operations without recording query filters', async () => {
		vi.mocked(stores.executionViewStore.countExecutionViews).mockResolvedValue(42);
		const wrapped = enabledInstrumentation().wrapStores(stores);
		await expect(
			wrapped.executionViewStore.countExecutionViews({ workflowIds: [secret], limit: 10 }),
		).resolves.toBe(42);
		expect(otel.getFinishedSpans()[0].name).toBe('engine.store.view.countExecutionViews');
		expect(JSON.stringify(otel.getFinishedSpans()[0].attributes)).not.toContain(secret);
	});

	it('keeps per-publication parents across interleaved executions and nested publications', async () => {
		const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
		const queue = enabledInstrumentation().wrapQueue(
			'step',
			new InMemoryWorkQueue<StepMessage>(logger),
		);
		const tracer = trace.getTracer('test');
		const a = tracer.startSpan('publisher-a', {}, ROOT_CONTEXT);
		const b = tracer.startSpan('publisher-b', {}, ROOT_CONTEXT);
		const entered = deferred();
		const release = deferred();
		const complete = deferred();
		const seen: Array<{ stepId: string; traceId?: string; spanId?: string }> = [];
		let activeHandlers = 0;
		let maximumHandlers = 0;
		queue.start(async (message) => {
			activeHandlers++;
			maximumHandlers = Math.max(maximumHandlers, activeHandlers);
			const active = trace.getSpan(context.active())?.spanContext();
			seen.push({ stepId: message.stepId, traceId: active?.traceId, spanId: active?.spanId });
			if (message.stepId === 'a') {
				entered.resolve();
				await release.promise;
				await queue.publish({ type: 'step:ready', executionId: 'exec-a', stepId: 'a-child' });
			}
			activeHandlers--;
			if (message.stepId === 'a-child') complete.resolve();
		});
		await context.with(
			trace.setSpan(ROOT_CONTEXT, a),
			async () => await queue.publish({ type: 'step:ready', executionId: 'exec-a', stepId: 'a' }),
		);
		await entered.promise;
		await context.with(
			trace.setSpan(ROOT_CONTEXT, b),
			async () => await queue.publish({ type: 'step:ready', executionId: 'exec-b', stepId: 'b' }),
		);
		await new Promise((resolve) => setTimeout(resolve, 10));
		release.resolve();
		await complete.promise;
		await queue.stop();
		a.end();
		b.end();
		expect(maximumHandlers).toBe(1);
		expect(seen.map(({ stepId, traceId }) => ({ stepId, traceId }))).toEqual([
			{ stepId: 'a', traceId: a.spanContext().traceId },
			{ stepId: 'b', traceId: b.spanContext().traceId },
			{ stepId: 'a-child', traceId: a.spanContext().traceId },
		]);
		const spans = otel.getFinishedSpans();
		const queueSpans = spans.filter(({ name }) => name.startsWith('engine.queue.'));
		expect(queueSpans).toHaveLength(6);
		for (const span of queueSpans) {
			const id = span.attributes['engine.step.id'];
			const parent =
				id === 'a' ? a.spanContext().spanId : id === 'b' ? b.spanContext().spanId : seen[0].spanId;
			expect(span.parentSpanContext?.spanId).toBe(parent);
		}
		const waitingB = queueSpans.find(
			({ name, attributes }) => name.endsWith('.wait') && attributes['engine.step.id'] === 'b',
		);
		expect(waitingB).toBeDefined();
		expect(hrTimeToMilliseconds(waitingB!.duration)).toBeGreaterThanOrEqual(5);
		const consumptionA = queueSpans.find(
			({ name, attributes }) => name.endsWith('.consume') && attributes['engine.step.id'] === 'a',
		)!;
		const consumptionB = queueSpans.find(
			({ name, attributes }) => name.endsWith('.consume') && attributes['engine.step.id'] === 'b',
		)!;
		// OTel start timestamps have millisecond precision; end timestamps can be finer.
		expect(hrTimeToMilliseconds(consumptionB.startTime) + 1).toBeGreaterThanOrEqual(
			hrTimeToMilliseconds(consumptionA.endTime),
		);
		expect(logger.error).not.toHaveBeenCalled();
	});

	it('captures distinct contexts when the same message object is queued twice', async () => {
		const queue = enabledInstrumentation().wrapQueue('step', new InMemoryWorkQueue<StepMessage>());
		const a = trace.getTracer('test').startSpan('a');
		const b = trace.getTracer('test').startSpan('b');
		const message: StepMessage = { type: 'step:ready', executionId: 'exec-1', stepId: 'same' };
		await context.with(trace.setSpan(ROOT_CONTEXT, a), async () => await queue.publish(message));
		await context.with(trace.setSpan(ROOT_CONTEXT, b), async () => await queue.publish(message));
		const done = deferred();
		const contexts: string[] = [];
		queue.start(async (given) => {
			expect(given).toBe(message);
			contexts.push(trace.getSpan(context.active())!.spanContext().traceId);
			if (contexts.length === 2) done.resolve();
		});
		await done.promise;
		await queue.stop();
		a.end();
		b.end();
		expect(contexts).toEqual([a.spanContext().traceId, b.spanContext().traceId]);
		expect(otel.getFinishedSpans().filter(({ name }) => name.endsWith('.wait'))).toHaveLength(2);
		expect(message).toEqual({ type: 'step:ready', executionId: 'exec-1', stepId: 'same' });
	});

	it('contains handler errors as before and lets the next publication run', async () => {
		const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
		const queue = enabledInstrumentation().wrapQueue(
			'orchestration',
			new InMemoryWorkQueue<StepMessage>(logger),
		);
		const done = deferred();
		const error = new Error(secret);
		queue.start(async (message) => {
			if (message.stepId === 'bad') throw error;
			done.resolve();
		});
		await queue.publish({ type: 'step:ready', executionId: 'exec-1', stepId: 'bad' });
		await queue.publish({ type: 'step:ready', executionId: 'exec-1', stepId: 'good' });
		await done.promise;
		await queue.stop();
		expect(logger.error).toHaveBeenCalledExactlyOnceWith('work queue handler failed', { error });
		const failed = otel
			.getFinishedSpans()
			.find(({ status }) => status.code === SpanStatusCode.ERROR)!;
		expect(failed.name).toBe('engine.queue.orchestration.consume');
		expect(failed.status).toEqual({ code: SpanStatusCode.ERROR });
		expect(failed.events).toEqual([]);
	});

	it('ends pending waits on stop without waiting for queued messages or retaining their parent contexts', async () => {
		const queue = enabledInstrumentation().wrapQueue('step', new InMemoryWorkQueue<StepMessage>());
		const parent = trace.getTracer('test').startSpan('old-publisher');
		const message: StepMessage = { type: 'step:ready', executionId: 'exec-1', stepId: 'pending' };
		await context.with(
			trace.setSpan(ROOT_CONTEXT, parent),
			async () => await queue.publish(message),
		);
		expect(otel.getFinishedSpans()).toEqual([]);
		await queue.stop();
		expect(otel.getFinishedSpans().map(({ name }) => name)).toEqual(['engine.queue.step.wait']);
		const done = deferred();
		let restartedTrace: string | undefined;
		queue.start(async () => {
			restartedTrace = trace.getSpan(context.active())?.spanContext().traceId;
			done.resolve();
		});
		await done.promise;
		await queue.stop();
		parent.end();
		expect(restartedTrace).not.toBe(parent.spanContext().traceId);
	});

	it('waits only for the in-flight handler and clears publications made while stopping', async () => {
		const queue = enabledInstrumentation().wrapQueue('step', new InMemoryWorkQueue<StepMessage>());
		const entered = deferred();
		const release = deferred();
		const handler = vi.fn(async () => {
			entered.resolve();
			await release.promise;
			await queue.publish({ type: 'step:ready', executionId: 'exec-1', stepId: 'late' });
		});
		queue.start(handler);
		await queue.publish({ type: 'step:ready', executionId: 'exec-1', stepId: 'running' });
		await entered.promise;
		await queue.publish({ type: 'step:ready', executionId: 'exec-1', stepId: 'pending' });
		let stopped = false;
		const stopping = queue.stop().then(() => {
			stopped = true;
		});
		await Promise.resolve();
		expect(stopped).toBe(false);
		release.resolve();
		await stopping;
		expect(handler).toHaveBeenCalledOnce();
		expect(otel.getFinishedSpans().filter(({ name }) => name.endsWith('.wait'))).toHaveLength(2);
		expect(otel.getFinishedSpans().filter(({ name }) => name.endsWith('.consume'))).toHaveLength(1);
	});

	it('does not assign a new publication context to old queued copies after restart', async () => {
		const queue = enabledInstrumentation().wrapQueue('step', new InMemoryWorkQueue<StepMessage>());
		const old = trace.getTracer('test').startSpan('old');
		const current = trace.getTracer('test').startSpan('current');
		const message: StepMessage = { type: 'step:ready', executionId: 'exec-1', stepId: 'same' };
		await context.with(trace.setSpan(ROOT_CONTEXT, old), async () => {
			await queue.publish(message);
			await queue.publish(message);
		});
		await queue.stop();
		const entered = deferred();
		const release = deferred();
		const done = deferred();
		const contexts: Array<string | undefined> = [];
		queue.start(async () => {
			contexts.push(trace.getSpan(context.active())?.spanContext().traceId);
			if (contexts.length === 1) {
				entered.resolve();
				await release.promise;
			}
			if (contexts.length === 3) done.resolve();
		});
		await entered.promise;
		await context.with(
			trace.setSpan(ROOT_CONTEXT, current),
			async () => await queue.publish(message),
		);
		release.resolve();
		await done.promise;
		await queue.stop();
		old.end();
		current.end();
		expect(contexts[0]).not.toBe(old.spanContext().traceId);
		expect(contexts[1]).not.toBe(current.spanContext().traceId);
		expect(contexts[2]).toBe(current.spanContext().traceId);
	});

	it('ends and removes the specific publication when publish fails', async () => {
		const error = new Error(secret);
		const raw = mock<WorkQueue<StepMessage>>();
		vi.mocked(raw.publish).mockRejectedValueOnce(error).mockResolvedValue(undefined);
		const queue = enabledInstrumentation().wrapQueue('step', raw);
		const a = trace.getTracer('test').startSpan('failed-publisher');
		const b = trace.getTracer('test').startSpan('next-publisher');
		const message: StepMessage = { type: 'step:ready', executionId: 'exec-1', stepId: 'same' };
		await expect(
			context.with(trace.setSpan(ROOT_CONTEXT, a), async () => await queue.publish(message)),
		).rejects.toBe(error);
		expect(otel.getFinishedSpans()).toHaveLength(1);
		await context.with(trace.setSpan(ROOT_CONTEXT, b), async () => await queue.publish(message));
		queue.start(async () => {});
		const consume = vi.mocked(raw.start).mock.calls[0][0];
		await consume(message);
		await queue.stop();
		a.end();
		b.end();
		const span = otel.getFinishedSpans().find(({ name }) => name.endsWith('.consume'))!;
		expect(span.parentSpanContext?.spanId).toBe(b.spanContext().spanId);
		expect(otel.getFinishedSpans().filter(({ name }) => name.endsWith('.wait'))).toHaveLength(2);
	});

	it('drops invalid queue identifiers and never mutates the message', async () => {
		const queue = enabledInstrumentation().wrapQueue('step', new InMemoryWorkQueue<StepMessage>());
		const message = Object.freeze({
			type: 'step:ready' as const,
			executionId: 'user@example.com',
			stepId: 'x'.repeat(129),
		});
		await queue.publish(message);
		await queue.stop();
		expect(otel.getFinishedSpans()[0].attributes).toEqual({
			'engine.queue.name': 'step',
			'engine.message.type': 'step:ready',
		});
	});

	it('ends the node span after the executor settles and preserves its request and result', async () => {
		const gate = deferred();
		const result: StepExecutionResult = { outputs: [[{ password: secret }]] };
		const executor = mock<IStepExecutor>();
		vi.mocked(executor.execute).mockImplementation(async function (this: IStepExecutor, request) {
			expect(this).toBe(executor);
			expect(request).toBe(stepRequest);
			await gate.promise;
			return result;
		});
		const executing = traceEngineStepExecutor(executor).execute(stepRequest);
		expect(otel.getFinishedSpans()).toEqual([]);
		gate.resolve();
		await expect(executing).resolves.toBe(result);
		const span = otel.getFinishedSpans()[0];
		expect(span.name).toBe('engine.node.execute');
		expect(span.attributes).toEqual({
			'engine.execution.id': 'exec-1',
			'engine.step.id': 'step-1',
			'engine.workflow.id': 'wf-1',
			'engine.node.id': 'node-1',
			'engine.node.type': 'v1-node',
			'engine.step.iteration': 3,
			'engine.node.boundary': 'executor',
		});
		expect(JSON.stringify(span.attributes)).not.toContain(secret);
		expect(span.events).toEqual([]);
	});

	it('preserves node failures without exporting their messages', async () => {
		const error = new Error(secret);
		const executor = mock<IStepExecutor>();
		vi.mocked(executor.execute).mockRejectedValue(error);
		await expect(traceEngineStepExecutor(executor).execute(stepRequest)).rejects.toBe(error);
		const span = otel.getFinishedSpans()[0];
		expect(span.status).toEqual({ code: SpanStatusCode.ERROR });
		expect(span.events).toEqual([]);
		expect(JSON.stringify({ attributes: span.attributes, status: span.status })).not.toContain(
			secret,
		);
	});
});

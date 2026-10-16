import type {
	EngineRuntimeInstrumentation,
	EngineStores,
	IStepExecutor,
	OrchestrationMessage,
	StepMessage,
	WorkQueue,
} from '@n8n/engine';
import {
	context,
	ROOT_CONTEXT,
	SpanStatusCode,
	type Attributes,
	type Context,
	type Span,
} from '@opentelemetry/api';

import { engineTracingEnabled, getEngineTracer, runEngineSpan } from './engine-tracing';

type WorkMessage = OrchestrationMessage | StepMessage;
type QueueName = 'orchestration' | 'step';

function identifier(value: string): string | undefined {
	return /^[\w.-]{1,128}$/.test(value) ? value : undefined;
}

function queueAttributes(name: QueueName, message: WorkMessage): Attributes {
	return {
		'engine.queue.name': name,
		'engine.message.type': message.type,
		'engine.execution.id': identifier(message.executionId),
		'engine.step.id': 'stepId' in message ? identifier(message.stepId) : undefined,
	};
}

function storeOperation<TArgs extends unknown[], TResult>(
	store: 'execution' | 'step' | 'view',
	method: string,
	operation: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
	return async (...args) =>
		await runEngineSpan(
			`engine.store.${store}.${method}`,
			{
				'engine.store.name': store,
				'engine.store.operation': method,
				'engine.store.boundary': 'api',
			},
			async () => await operation(...args),
		);
}

function wrapStores({ executionStore, stepStore, executionViewStore }: EngineStores): EngineStores {
	// These spans measure the store API call, not just the SQL inside it.
	return {
		executionStore: {
			createExecution: storeOperation(
				'execution',
				'createExecution',
				executionStore.createExecution.bind(executionStore),
			),
			loadExecution: storeOperation(
				'execution',
				'loadExecution',
				executionStore.loadExecution.bind(executionStore),
			),
			loadTriggerOutputs: storeOperation(
				'execution',
				'loadTriggerOutputs',
				executionStore.loadTriggerOutputs.bind(executionStore),
			),
			transitionStatus: storeOperation(
				'execution',
				'transitionStatus',
				executionStore.transitionStatus.bind(executionStore),
			),
			finishExecution: storeOperation(
				'execution',
				'finishExecution',
				executionStore.finishExecution.bind(executionStore),
			),
			cancelExecution: storeOperation(
				'execution',
				'cancelExecution',
				executionStore.cancelExecution.bind(executionStore),
			),
			refreshLiveStatus: storeOperation(
				'execution',
				'refreshLiveStatus',
				executionStore.refreshLiveStatus.bind(executionStore),
			),
		},
		stepStore: {
			createSteps: storeOperation('step', 'createSteps', stepStore.createSteps.bind(stepStore)),
			loadStep: storeOperation('step', 'loadStep', stepStore.loadStep.bind(stepStore)),
			claimStep: storeOperation('step', 'claimStep', stepStore.claimStep.bind(stepStore)),
			completeStep: storeOperation('step', 'completeStep', stepStore.completeStep.bind(stepStore)),
			suspendStep: storeOperation('step', 'suspendStep', stepStore.suspendStep.bind(stepStore)),
			resumeStep: storeOperation('step', 'resumeStep', stepStore.resumeStep.bind(stepStore)),
			resumeDueSteps: storeOperation(
				'step',
				'resumeDueSteps',
				stepStore.resumeDueSteps.bind(stepStore),
			),
			nextWaitDeadline: storeOperation(
				'step',
				'nextWaitDeadline',
				stepStore.nextWaitDeadline.bind(stepStore),
			),
			failStep: storeOperation('step', 'failStep', stepStore.failStep.bind(stepStore)),
			cancelStep: storeOperation('step', 'cancelStep', stepStore.cancelStep.bind(stepStore)),
			cancelPendingSteps: storeOperation(
				'step',
				'cancelPendingSteps',
				stepStore.cancelPendingSteps.bind(stepStore),
			),
			loadStepsByKeys: storeOperation(
				'step',
				'loadStepsByKeys',
				stepStore.loadStepsByKeys.bind(stepStore),
			),
			loadStepSummariesByKeys: storeOperation(
				'step',
				'loadStepSummariesByKeys',
				stepStore.loadStepSummariesByKeys.bind(stepStore),
			),
			loadLatestStepSummaries: storeOperation(
				'step',
				'loadLatestStepSummaries',
				stepStore.loadLatestStepSummaries.bind(stepStore),
			),
			loadCompletedStepOutputs: storeOperation(
				'step',
				'loadCompletedStepOutputs',
				stepStore.loadCompletedStepOutputs.bind(stepStore),
			),
			countSettledSteps: storeOperation(
				'step',
				'countSettledSteps',
				stepStore.countSettledSteps.bind(stepStore),
			),
			hasFailedSteps: storeOperation(
				'step',
				'hasFailedSteps',
				stepStore.hasFailedSteps.bind(stepStore),
			),
		},
		executionViewStore: {
			listExecutionViews: storeOperation(
				'view',
				'listExecutionViews',
				executionViewStore.listExecutionViews.bind(executionViewStore),
			),
			countExecutionViews: storeOperation(
				'view',
				'countExecutionViews',
				executionViewStore.countExecutionViews.bind(executionViewStore),
			),
			loadExecutionView: storeOperation(
				'view',
				'loadExecutionView',
				executionViewStore.loadExecutionView.bind(executionViewStore),
			),
			loadExecutionWithStepsView: storeOperation(
				'view',
				'loadExecutionWithStepsView',
				executionViewStore.loadExecutionWithStepsView.bind(executionViewStore),
			),
		},
	};
}

interface Publication {
	parent?: Context;
	wait?: Span;
}

function wrapQueue<TMessage extends WorkMessage>(
	name: QueueName,
	queue: WorkQueue<TMessage>,
): WorkQueue<TMessage> {
	// Each publication has its own context, even when the message object is reused.
	const publicationsByMessage = new WeakMap<TMessage, Publication[]>();
	const pending = new Set<Publication>();
	let stopped = false;
	const clearPending = () => {
		for (const publication of pending) {
			publication.wait?.end();
			publication.wait = undefined;
			publication.parent = undefined;
		}
		pending.clear();
	};
	const remove = (message: TMessage, publication: Publication) => {
		pending.delete(publication);
		const publications = publicationsByMessage.get(message);
		if (!publications) return;
		const index = publications.indexOf(publication);
		if (index !== -1) publications.splice(index, 1);
		if (publications.length === 0) publicationsByMessage.delete(message);
	};
	return {
		async publish(message) {
			const parent = stopped ? undefined : context.active();
			const publication: Publication = parent
				? {
						parent,
						wait: getEngineTracer().startSpan(
							`engine.queue.${name}.wait`,
							{ attributes: queueAttributes(name, message) },
							parent,
						),
					}
				: {};
			// Cleared slots preserve order after restart without retaining trace contexts.
			const publications = publicationsByMessage.get(message) ?? [];
			publications.push(publication);
			publicationsByMessage.set(message, publications);
			if (parent) pending.add(publication);
			try {
				await queue.publish(message);
			} catch (error) {
				remove(message, publication);
				publication.wait?.setStatus({ code: SpanStatusCode.ERROR });
				publication.wait?.end();
				throw error;
			}
		},
		start(handler) {
			stopped = false;
			queue.start(async (message) => {
				const publication = publicationsByMessage.get(message)?.[0];
				if (publication) {
					remove(message, publication);
					publication.wait?.end();
					publication.wait = undefined;
				}
				// A restart can dispatch work retained by the queue after stop cleared tracing state.
				await context.with(
					publication?.parent ?? ROOT_CONTEXT,
					async () =>
						await runEngineSpan(
							`engine.queue.${name}.consume`,
							queueAttributes(name, message),
							async () => await handler(message),
						),
				);
			});
		},
		async stop() {
			stopped = true;
			try {
				const stopped = queue.stop();
				clearPending();
				await stopped;
			} finally {
				// In-flight handlers can publish after stop disables the consumer.
				clearPending();
			}
		},
	};
}

export function createEngineRuntimeInstrumentation(): EngineRuntimeInstrumentation | undefined {
	if (!engineTracingEnabled()) return undefined;
	return { wrapStores, wrapQueue };
}

/** Measures the executor boundary, which includes host context setup and data reads. */
export function traceEngineStepExecutor(executor: IStepExecutor): IStepExecutor {
	if (!engineTracingEnabled()) return executor;
	return {
		async execute(request) {
			return await runEngineSpan(
				'engine.node.execute',
				{
					'engine.execution.id': identifier(request.context.executionId),
					'engine.step.id': identifier(request.context.stepId),
					'engine.workflow.id': identifier(request.context.workflowId),
					'engine.node.id': identifier(request.node.id),
					'engine.node.type': request.node.type,
					'engine.step.iteration': request.context.iteration,
					'engine.node.boundary': 'executor',
				},
				async () => await executor.execute(request),
			);
		},
	};
}

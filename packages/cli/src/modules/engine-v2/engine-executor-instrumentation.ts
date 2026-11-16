import type {
	NodeExecutionTraceContext,
	V1StepExecutorInstrumentation,
	V1StepExecutorPhase,
} from '@n8n/node-engine-compatibility';
import type { Attributes } from '@opentelemetry/api';
import { SpanStatusCode } from '@opentelemetry/api';

import {
	engineTracingEnabled,
	getEngineTracer,
	runEngineSpan,
	runEngineSpanSync,
} from './engine-tracing';

function phaseAttributes(
	phase: V1StepExecutorPhase,
	metadata: NodeExecutionTraceContext,
): Attributes {
	const attributes: Attributes = {
		'engine.node.boundary': 'phase',
		'engine.node.phase': phase,
	};
	// Use the store and queue adapter's bounded identifier policy.
	for (const [key, value] of Object.entries({
		'engine.execution.id': metadata.executionId,
		'engine.step.id': metadata.stepId,
		'engine.workflow.id': metadata.workflowId,
		'engine.node.id': metadata.nodeId,
		'engine.node.type': metadata.nodeType,
	})) {
		if (/^[\w.-]{1,128}$/.test(value)) attributes[key] = value;
	}
	if (Number.isSafeInteger(metadata.iteration) && metadata.iteration >= 0) {
		attributes['engine.step.iteration'] = metadata.iteration;
	}
	return attributes;
}

export function createEngineExecutorInstrumentation(): V1StepExecutorInstrumentation | undefined {
	if (!engineTracingEnabled()) return undefined;

	return {
		async run(phase, metadata, operation) {
			return await runEngineSpan(
				`engine.node.executor.${phase}`,
				phaseAttributes(phase, metadata),
				operation,
			);
		},
		runSync(phase, metadata, operation) {
			return runEngineSpanSync(
				`engine.node.executor.${phase}`,
				phaseAttributes(phase, metadata),
				operation,
			);
		},
		start(phase, metadata) {
			// An active isolate span would become the node body's parent.
			const span = getEngineTracer().startSpan(`engine.node.executor.${phase}`, {
				attributes: phaseAttributes(phase, metadata),
			});
			let ended = false;
			return {
				end() {
					if (ended) return;
					ended = true;
					span.end();
				},
				fail() {
					if (!ended) span.setStatus({ code: SpanStatusCode.ERROR });
				},
			};
		},
	};
}

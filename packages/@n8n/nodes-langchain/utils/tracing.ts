import type { BaseCallbackConfig, Callbacks } from '@langchain/core/callbacks/manager';
import { propagation, context as otelContext, trace } from '@opentelemetry/api';
import type { FieldType, IExecuteFunctions, ISupplyDataFunctions, Logger } from 'n8n-workflow';
import { jsonParse, validateFieldType } from 'n8n-workflow';

import { OtelAiCallbackHandler } from './otel-ai-callback-handler';

interface TracingConfig {
	additionalMetadata?: Record<string, unknown>;
}

export type TracingMetadataEntry = {
	key: string;
	type?: 'stringValue' | 'numberValue' | 'booleanValue' | 'arrayValue' | 'objectValue';
	stringValue?: string;
	numberValue?: string;
	booleanValue?: string;
	arrayValue?: string;
	objectValue?: string;
};

export function buildTracingMetadata(
	entries: TracingMetadataEntry[] | undefined,
	logger?: Logger,
): Record<string, unknown> {
	const additionalMetadata: Record<string, unknown> = {};

	for (const entry of entries ?? []) {
		const key = entry.key?.trim();
		if (!key) {
			continue;
		}

		// Handle new typed format
		if (entry.type) {
			const fieldType = entry.type.replace('Value', '') as FieldType;
			const rawValue = entry[entry.type];

			if (rawValue === undefined || rawValue === null) {
				continue;
			}

			// For string type, skip empty values
			if (fieldType === 'string' && rawValue === '') {
				continue;
			}

			// Convert value based on type
			let value: unknown;
			try {
				if (fieldType === 'string') {
					value = String(rawValue);
				} else if (fieldType === 'object') {
					value = typeof rawValue === 'string' ? jsonParse(rawValue) : rawValue;
				} else {
					const validationResult = validateFieldType(key, rawValue, fieldType);
					if (validationResult.valid) {
						value = validationResult.newValue;
					} else {
						logger?.warn(`Tracing metadata entry '${key}' skipped: failed ${fieldType} validation`);
						continue;
					}
				}
			} catch (error) {
				logger?.warn(`Tracing metadata entry '${key}' skipped: ${(error as Error).message}`);
				continue;
			}

			additionalMetadata[key] = value;
		} else {
			// Handle legacy untyped format (backwards compatibility)
			const value = (entry as any).value;
			if (value === undefined) {
				continue;
			}
			if (typeof value === 'string' && value === '') {
				continue;
			}
			additionalMetadata[key] = value;
		}
	}

	return additionalMetadata;
}

export function getTracingConfig(
	context: IExecuteFunctions | ISupplyDataFunctions,
	config: TracingConfig = {},
): BaseCallbackConfig {
	const parentRunManager =
		'getParentCallbackManager' in context && context.getParentCallbackManager
			? context.getParentCallbackManager()
			: undefined;

	// Build callbacks array, including OTEL handler when the node has an active OTEL span.
	// We retrieve the span's traceparent via getOtelTraceparent() (available on IExecuteFunctions)
	// and reconstruct a remote span context from it. This is necessary because the node execution
	// doesn't run within the span's async context — spans are managed externally by lifecycle hooks.
	// The N8N_OTEL_TRACES_INCLUDE_AI_SPANS env var (default: true) allows explicit opt-out.
	let callbacks: Callbacks | undefined = parentRunManager;
	const includeAiSpans = process.env.N8N_OTEL_TRACES_INCLUDE_AI_SPANS !== 'false';
	if (includeAiSpans && 'getOtelTraceparent' in context) {
		const traceparent = (context as IExecuteFunctions).getOtelTraceparent();
		if (traceparent) {
			const parentCtx = propagation.extract(otelContext.active(), traceparent);
			const parentSpan = trace.getSpan(parentCtx);
			const otelHandler = new OtelAiCallbackHandler(parentSpan);
			callbacks = parentRunManager ? [parentRunManager, otelHandler] : [otelHandler];
		}
	}

	return {
		runName: `[${context.getWorkflow().name}] ${context.getNode().name}`,
		metadata: {
			execution_id: context.getExecutionId(),
			workflow: context.getWorkflow(),
			node: context.getNode().name,
			...(config.additionalMetadata ?? {}),
		},
		callbacks,
	};
}

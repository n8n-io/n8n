import type { BaseCallbackConfig, Callbacks } from '@langchain/core/callbacks/manager';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { Client } from 'langsmith';
import type { FieldType, IExecuteFunctions, ISupplyDataFunctions, Logger } from 'n8n-workflow';
import { jsonParse, validateFieldType } from 'n8n-workflow';

interface LangSmithConfig {
	apiKey: string;
	apiUrl?: string;
	project?: string;
}

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

function getLangSmithConfigFromContext(
	context: IExecuteFunctions | ISupplyDataFunctions,
): LangSmithConfig | undefined {
	// Access langsmithConfig from additionalData via duck-typing.
	// The execution context internally holds additionalData which is populated
	// during workflow execution setup in packages/cli.
	const ctx = context as unknown as {
		additionalData?: { langsmithConfig?: LangSmithConfig };
	};
	if (!ctx.additionalData) return undefined;
	return ctx.additionalData.langsmithConfig;
}

export function getTracingConfig(
	context: IExecuteFunctions | ISupplyDataFunctions,
	config: TracingConfig = {},
): BaseCallbackConfig {
	const parentRunManager =
		'getParentCallbackManager' in context && context.getParentCallbackManager
			? context.getParentCallbackManager()
			: undefined;

	const langsmithConfig = getLangSmithConfigFromContext(context);

	let callbacks: Callbacks | undefined = parentRunManager;

	if (langsmithConfig?.apiKey) {
		const client = new Client({
			apiKey: langsmithConfig.apiKey,
			apiUrl: langsmithConfig.apiUrl || undefined,
		});

		const tracer = new LangChainTracer({
			client,
			projectName: langsmithConfig.project ?? 'default',
		});

		callbacks = parentRunManager ? [parentRunManager, tracer] : [tracer];
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

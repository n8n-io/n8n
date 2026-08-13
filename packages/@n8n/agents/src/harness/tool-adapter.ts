import type { ToolSet } from 'ai';
import { UserError } from 'n8n-workflow';

import { loadAi } from '../runtime/model/lazy-ai';
import { executeTool } from '../runtime/tools/tool-adapter';
import type {
	AgentPersistenceOptions,
	BuiltTool,
	ExecutionOptions,
	StreamChunk,
	ToolExecutionContext,
} from '../types';
import { fixSchema } from '../utils/json-schema';
import { isZodSchema } from '../utils/zod';

interface HarnessToolAdapterContext {
	runId: string;
	persistence: AgentPersistenceOptions;
	execution: ExecutionOptions;
	emitLifecycle(
		chunk: Extract<StreamChunk, { type: 'tool-execution-start' | 'tool-execution-end' }>,
	): void;
}

export function toHarnessTools(
	tools: readonly BuiltTool[],
	context: HarnessToolAdapterContext,
): ToolSet {
	const { jsonSchema, tool } = loadAi();
	const result: ToolSet = {};

	for (const builtTool of tools) {
		if (!builtTool.inputSchema || !builtTool.handler) continue;
		if (builtTool.approval?.required || builtTool.suspendSchema || builtTool.resumeSchema) {
			throw new UserError(
				`Harness tool "${builtTool.name}" requires unsupported continuation support`,
			);
		}

		const inputSchema = isZodSchema(builtTool.inputSchema)
			? builtTool.inputSchema
			: jsonSchema(fixSchema(builtTool.inputSchema));

		result[builtTool.name] = tool({
			description: builtTool.description,
			inputSchema,
			execute: async (input, options) => {
				const startTime = Date.now();
				context.emitLifecycle({
					type: 'tool-execution-start',
					toolCallId: options.toolCallId,
					toolName: builtTool.name,
					startTime,
				});

				const executionContext: ToolExecutionContext = {
					runId: context.runId,
					persistence: context.persistence,
					abortSignal: options.abortSignal ?? context.execution.abortSignal,
					executionCounter: context.execution.executionCounter,
				};

				try {
					const output = await executeTool(
						input,
						builtTool,
						undefined,
						context.execution.telemetry,
						options.toolCallId,
						executionContext,
					);
					context.emitLifecycle({
						type: 'tool-execution-end',
						toolCallId: options.toolCallId,
						toolName: builtTool.name,
						isError: false,
						endTime: Date.now(),
					});
					return builtTool.toModelOutput ? builtTool.toModelOutput(output) : output;
				} catch (error) {
					context.emitLifecycle({
						type: 'tool-execution-end',
						toolCallId: options.toolCallId,
						toolName: builtTool.name,
						isError: true,
						endTime: Date.now(),
					});
					throw error;
				}
			},
		});
	}

	return result;
}

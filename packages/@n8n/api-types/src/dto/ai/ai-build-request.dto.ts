import type { IRunExecutionData, IWorkflowBase, NodeExecutionSchema } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

export interface ExpressionValue {
	expression: string;
	resolvedValue: unknown;
	nodeType?: string;
}

export interface MultiModalConfig {
	provider: 'openai' | 'anthropic' | 'google' | 'groq' | 'cohere';
	model?: string;
	apiKey?: string;
	baseUrl?: string;
	temperature?: number;
	maxTokens?: number;
}

export class AiBuilderChatRequestDto extends Z.class({
	payload: z.object({
		role: z.literal('user'),
		type: z.literal('message'),
		text: z.string(),
		workflowContext: z.object({
			currentWorkflow: z
				.custom<Partial<IWorkflowBase>>((val: Partial<IWorkflowBase>) => {
					if (!val.nodes && !val.connections) {
						return false;
					}

					return val;
				})
				.optional(),

			executionData: z
				.custom<IRunExecutionData['resultData']>((val: IRunExecutionData['resultData']) => {
					if (!val.runData && !val.error) {
						return false;
					}

					return val;
				})
				.optional(),

			executionSchema: z
				.custom<NodeExecutionSchema[]>((val: NodeExecutionSchema[]) => {
					// Check if the array is empty or if all items have nodeName and schema properties
					if (!Array.isArray(val) || val.every((item) => !item.nodeName || !item.schema)) {
						return false;
					}

					return val;
				})
				.optional(),

			expressionValues: z
				.custom<Record<string, ExpressionValue[]>>((val: Record<string, ExpressionValue[]>) => {
					const keys = Object.keys(val);
					// Check if the array is empty or if all items have nodeName and schema properties
					if (keys.length > 0 && keys.every((key) => val[key].every((v) => !v.expression))) {
						return false;
					}

					return val;
				})
				.optional(),
		}),
	}),
	multiModalConfig: z
		.object({
			provider: z.enum(['openai', 'anthropic', 'google', 'groq', 'cohere']),
			model: z.string().optional(),
			apiKey: z.string().optional(),
			baseUrl: z.string().optional(),
			temperature: z.number().min(0).max(2).optional(),
			maxTokens: z.number().positive().optional(),
		})
		.optional(),
}) {}

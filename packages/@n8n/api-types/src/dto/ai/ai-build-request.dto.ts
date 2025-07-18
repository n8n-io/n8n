import type { IRunExecutionData, IWorkflowBase, NodeExecutionSchema } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

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
		}),
	}),
}) {}

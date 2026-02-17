import type { IRunExecutionData, IWorkflowBase, NodeExecutionSchema } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';

export interface ExpressionValue {
	expression: string;
	resolvedValue: unknown;
	nodeType?: string;
}

/**
 * Context for a node selected/focused by the user.
 * Used for focused nodes feature - allows user to select specific nodes
 * for the AI to prioritize in its responses.
 */
export interface SelectedNodeContext {
	/** Node display name - use to look up full node in currentWorkflow.nodes */
	name: string;
	/** Configuration issues/validation errors on the node */
	issues?: Record<string, string[]>;
	/** Names of nodes that connect INTO this node */
	incomingConnections: string[];
	/** Names of nodes that this node connects TO */
	outgoingConnections: string[];
}

export class AiBuilderChatRequestDto extends Z.class({
	payload: z.object({
		id: z.string(),
		role: z.literal('user'),
		type: z.literal('message'),
		text: z.string(),
		versionId: z.string().optional(),
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
			valuesExcluded: z.boolean().optional(),
			pinnedNodes: z.array(z.string()).optional(),

			selectedNodes: z
				.custom<SelectedNodeContext[]>((val: SelectedNodeContext[]) => {
					if (!Array.isArray(val)) {
						return false;
					}
					if (val.length === 0) {
						return val;
					}
					if (
						val.every(
							(item) =>
								typeof item.name === 'string' &&
								Array.isArray(item.incomingConnections) &&
								Array.isArray(item.outgoingConnections),
						)
					) {
						return val;
					}
					return false;
				})
				.optional(),
		}),
		featureFlags: z
			.object({
				templateExamples: z.boolean().optional(),
				codeBuilder: z.boolean().optional(),
				pinData: z.boolean().optional(),
				planMode: z.boolean().optional(),
			})
			.optional(),
		mode: z.enum(['build', 'plan']).optional(),
		resumeData: z.union([z.record(z.unknown()), z.array(z.unknown())]).optional(),
	}),
}) {}

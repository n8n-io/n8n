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
				.looseObject({
					nodes: z.unknown(),
					connections: z.unknown(),
				})
				.refine((val) => {
					if (!val.nodes && !val.connections) {
						return false;
					}
					return true;
				})
				.optional(),

			executionData: z
				.looseObject({
					runData: z.unknown(),
					error: z.unknown(),
				})
				.refine((val) => {
					if (!val.runData && !val.error) {
						return false;
					}

					return true;
				})
				.optional(),

			executionSchema: z
				.array(
					z.object({
						nodeName: z.string(),
						schema: z.unknown(),
					}),
				)
				.optional(),

			expressionValues: z
				.record(z.string(), z.array(z.object({ expression: z.string().min(1) })))
				.optional(),

			valuesExcluded: z.boolean().optional(),
			pinnedNodes: z.array(z.string()).optional(),

			selected: z
				.array(
					z.object({
						name: z.string(),
						incomingConnections: z.array(z.unknown()),
						outgoingConnections: z.array(z.unknown()),
					}),
				)
				.optional(),
		}),
		featureFlags: z
			.object({
				templateExamples: z.boolean().optional(),
				codeBuilder: z.boolean().optional(),
				pinData: z.boolean().optional(),
				planMode: z.boolean().optional(),
				mergeAskBuild: z.boolean().optional(),
			})
			.optional(),
		mode: z.enum(['build', 'plan']).optional(),
		resumeData: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]).optional(),
	}),
}) {}

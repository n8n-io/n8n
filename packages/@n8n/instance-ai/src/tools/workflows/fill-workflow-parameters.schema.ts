/**
 * Fill Workflow Parameters — schema
 *
 * Zod source of truth for the parallel per-node parameter fill: input is a
 * validated skeleton plus the build brief; output reports what was filled,
 * what failed, and where the assembled source was written.
 */
import { z } from 'zod';

import { skeletonDiagnosticSchema, workflowSkeletonSchema } from './workflow-skeleton.schema';

export const fillWorkflowParametersInputSchema = z.object({
	skeleton: workflowSkeletonSchema.describe(
		'The validated skeleton (pass the exact topology plan-workflow-skeleton accepted)',
	),
	brief: z
		.string()
		.min(1)
		.describe(
			'Concise build brief: what the workflow must do, in the user’s terms, ' +
				'including concrete values they gave (URLs, channel names, field names, thresholds)',
		),
	nodeHints: z
		.record(z.string())
		.optional()
		.describe('Optional per-node-name instructions, e.g. exact operation to use or field mappings'),
	filePath: z
		.string()
		.min(1)
		.describe(
			'Workspace-relative path to write the assembled TypeScript source, e.g. "order-alerts.workflow.ts"',
		),
});

export const nodeFillFailureSchema = z.object({
	node: z.string(),
	reason: z.string(),
});

export const fillWorkflowParametersResultSchema = z.object({
	success: z.boolean(),
	/** Written source path — pass this to build-workflow. Absent when the skeleton was rejected. */
	filePath: z.string().optional(),
	filledNodes: z.array(z.string()),
	/** Nodes whose fill failed; their parameters are empty in the source and need manual attention. */
	failedNodes: z.array(nodeFillFailureSchema),
	/** Per-node canvas parameter issues that survived the repair round. */
	parameterIssues: z.record(z.array(z.string())),
	/** Per-node assumptions the fill made (guessed values, placeholder sentinels inserted). */
	assumptions: z.record(z.array(z.string())),
	/** Errors when the skeleton was rejected (success=false); otherwise warnings to review. */
	skeletonDiagnostics: z.array(skeletonDiagnosticSchema).optional(),
	/** What to do with this result. */
	nextStep: z.string(),
});

export type FillWorkflowParametersInput = z.infer<typeof fillWorkflowParametersInputSchema>;
export type FillWorkflowParametersResult = z.infer<typeof fillWorkflowParametersResultSchema>;

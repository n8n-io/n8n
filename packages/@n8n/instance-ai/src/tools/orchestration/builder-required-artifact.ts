import { z } from 'zod';

export const REPORT_REQUIRED_ARTIFACT_TOOL_NAME = 'report_required_artifact';

const requiredWorkflowSchema = z.object({
	type: z.literal('workflow'),
	name: z.string().min(1).describe('Suggested workflow name'),
	purpose: z.string().min(1).describe('Why the workflow is required'),
	relationship: z
		.enum(['agent-tool', 'agent-entrypoint'])
		.describe(
			'How the workflow relates to the Agent. An agent-entrypoint invokes the Agent and must not be attached as an Agent tool.',
		),
	requirements: z
		.array(z.string().min(1))
		.min(1)
		.describe('Observable behavior and data-flow requirements for the workflow'),
});

const requiredDataTableSchema = z.object({
	type: z.literal('data-table'),
	name: z.string().min(1).describe('Suggested data table name'),
	purpose: z.string().min(1).describe('Why the data table is required'),
	columns: z
		.array(
			z.object({
				name: z.string().min(1),
				type: z.string().min(1),
				description: z.string().optional(),
			}),
		)
		.optional()
		.describe('Known columns; omit when the schema still needs to be inferred'),
});

export const builderRequiredArtifactSchema = z.discriminatedUnion('type', [
	requiredWorkflowSchema,
	requiredDataTableSchema,
]);

export const builderRequiredArtifactsSchema = z.array(builderRequiredArtifactSchema);

export const reportRequiredArtifactInputSchema = z.object({
	artifact: builderRequiredArtifactSchema.describe(
		'The workflow or data table Instance AI must create outside the target Agent',
	),
});

export type BuilderRequiredArtifact = z.infer<typeof builderRequiredArtifactSchema>;
export type ReportRequiredArtifactInput = z.infer<typeof reportRequiredArtifactInputSchema>;

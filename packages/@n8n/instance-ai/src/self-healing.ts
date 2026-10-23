import { selfHealingResultOutcomeSchema } from '@n8n/api-types';
import { z } from 'zod';

export const SELF_HEALING_PROFILE_VERSION = 'self-healing-v1';
export const SELF_HEALING_RESOURCE_PREFIX = 'ia-self-healing:';

export const selfHealingOutputSchema = z
	.object({
		outcome: selfHealingResultOutcomeSchema,
		summary: z
			.string()
			.trim()
			.min(1)
			.transform((summary) => Array.from(summary).slice(0, 80).join(''))
			.describe(
				'Short, plain-language title. Aim for 5–10 words, at most 80 characters. Do not use Markdown.',
			),
		report: z
			.string()
			.trim()
			.min(1)
			.max(50_000)
			.describe(
				'A concise Markdown report under 150 words. Use only **What happened** and **What changed** sections. ' +
					'Include verification limits and any next step under What changed. State when no changes were made.',
			),
		candidateFilePath: z.string().trim().min(1).nullable(),
	})
	.strict()
	.superRefine((output, ctx) => {
		if (output.outcome === 'fix_ready' && !output.candidateFilePath) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['candidateFilePath'],
				message: 'A ready fix requires a candidate file.',
			});
		}

		if (output.outcome === 'could_not_fix' && output.candidateFilePath !== null) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['candidateFilePath'],
				message: 'An unsuccessful investigation cannot return a candidate file.',
			});
		}
	});

export type SelfHealingOutput = z.infer<typeof selfHealingOutputSchema>;

export type SelfHealingThreadMetadata = {
	selfHealing: {
		backgroundUserId: string;
		projectId: string;
		workflowId: string;
		executionId: string;
	};
	profileVersion: typeof SELF_HEALING_PROFILE_VERSION;
};

export function getSelfHealingResourceId(actorId: string): string {
	return `${SELF_HEALING_RESOURCE_PREFIX}${actorId}`;
}

export function isSelfHealingResourceId(resourceId: string | undefined): boolean {
	return resourceId?.startsWith(SELF_HEALING_RESOURCE_PREFIX) ?? false;
}

export const selfHealingCandidateInputSchema = z
	.object({
		filePath: z.string().min(1).describe('Path to the candidate workflow source.'),
		validationOnly: z.boolean().optional().describe('Run static checks without execution.'),
		triggerNodeName: z
			.string()
			.min(1)
			.optional()
			.describe(
				'Name of the trigger to start verification from. Select the trigger from the failed execution. ' +
					'Required when the workflow has more than one trigger. Use a separate call for each trigger.',
			),
		inputData: z
			.record(z.unknown())
			.optional()
			.describe(
				'Test input for the selected trigger. Match its output shape. ' +
					'For Webhook, pass the body payload or {body, query, headers, params} when the workflow reads request fields. ' +
					'For Form, pass a flat field map. For Chat, pass {chatInput: "message"}. ' +
					'For Schedule, omit inputData.',
			),
	})
	.strict();

export type SelfHealingCandidateInput = z.infer<typeof selfHealingCandidateInputSchema>;
export type SelfHealingCandidateVerifier = (
	input: SelfHealingCandidateInput,
	abortSignal?: AbortSignal,
) => Promise<unknown>;

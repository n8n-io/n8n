import { selfHealingResultOutcomeSchema } from '@n8n/api-types';
import { z } from 'zod';

export const SELF_HEALING_PROFILE_VERSION = 'self-healing-v1';
export const SELF_HEALING_RESOURCE_PREFIX = 'ia-self-healing:';

export const selfHealingOutputSchema = z
	.object({
		outcome: selfHealingResultOutcomeSchema,
		summary: z.string().trim().min(1).max(500),
		report: z.string().trim().min(1).max(50_000),
		candidateFilePath: z.string().trim().min(1).optional(),
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
		if (output.outcome === 'could_not_fix' && output.candidateFilePath !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['candidateFilePath'],
				message: 'An unsuccessful investigation cannot return a candidate file.',
			});
		}
	});

export type SelfHealingOutput = z.infer<typeof selfHealingOutputSchema>;

export const selfHealingIdentitySchema = z.object({
	version: z.literal(1),
	purpose: z.literal('self-healing'),
	backgroundUserId: z.string().min(1),
	projectId: z.string().min(1),
	workflowId: z.string().min(1),
	executionId: z.string().min(1),
});

export type SelfHealingIdentity = z.infer<typeof selfHealingIdentitySchema>;

export const selfHealingThreadMetadataSchema = z.object({
	selfHealing: selfHealingIdentitySchema,
	profileVersion: z.literal(SELF_HEALING_PROFILE_VERSION),
});

export type SelfHealingThreadMetadata = z.infer<typeof selfHealingThreadMetadataSchema>;

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
	})
	.strict();

export type SelfHealingCandidateInput = z.infer<typeof selfHealingCandidateInputSchema>;
export type SelfHealingCandidateVerifier = (
	input: SelfHealingCandidateInput,
	abortSignal?: AbortSignal,
) => Promise<unknown>;

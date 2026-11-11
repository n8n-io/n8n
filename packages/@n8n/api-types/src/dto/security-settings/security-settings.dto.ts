import { z } from 'zod';

import { redactionFloorSchema } from '../../redaction-enforcement-floor';
import { workflowReviewsPolicySchema } from '../../workflow-reviews-policy';
import { Z } from '../../zod-class';

const redactionEnforcementFieldSchema = z.object({
	floor: redactionFloorSchema,
});

const workflowReviewsFieldSchema = workflowReviewsPolicySchema;

/** Update body. Defaults must not fill omitted flags, or a partial update would turn them off. */
const workflowReviewsUpdateSchema = z
	.object({
		enabled: z.boolean().optional(),
		publishingNeedsApproval: z.boolean().optional(),
		promotionReviewsEnabled: z.boolean().optional(),
		promotingNeedsApproval: z.boolean().optional(),
	})
	.strict();

export class SecuritySettingsDto extends Z.class({
	personalSpacePublishing: z.boolean(),
	personalSpaceSharing: z.boolean(),
	publishedPersonalWorkflowsCount: z.number(),
	sharedPersonalWorkflowsCount: z.number(),
	sharedPersonalCredentialsCount: z.number(),
	managedByEnv: z.boolean(),
	redactionEnforcement: redactionEnforcementFieldSchema,
	workflowReviews: workflowReviewsFieldSchema.optional(),
}) {}

export class UpdateSecuritySettingsDto extends Z.class({
	personalSpacePublishing: z.boolean().optional(),
	personalSpaceSharing: z.boolean().optional(),
	redactionEnforcement: redactionEnforcementFieldSchema.optional(),
	workflowReviews: workflowReviewsUpdateSchema.optional(),
}) {}

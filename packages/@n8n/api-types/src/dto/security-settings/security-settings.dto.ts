import { z } from 'zod';

import { redactionFloorSchema } from '../../redaction-enforcement-floor';
import { workflowReviewsPolicySchema } from '../../workflow-reviews-policy';
import { Z } from '../../zod-class';

const redactionEnforcementFieldSchema = z.object({
	floor: redactionFloorSchema,
});

const workflowReviewsFieldSchema = workflowReviewsPolicySchema;

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
	workflowReviews: workflowReviewsFieldSchema.partial().optional(),
}) {}

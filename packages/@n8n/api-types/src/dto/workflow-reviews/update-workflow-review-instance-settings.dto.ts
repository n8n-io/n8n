import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateWorkflowReviewInstanceSettingsDto extends Z.class({
	requiredByInstance: z.boolean(),
}) {}

export type WorkflowReviewInstanceSettingsResponse = {
	requiredByInstance: boolean;
};

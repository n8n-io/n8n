import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateProjectWorkflowReviewSettingsDto extends Z.class({
	projectApprovalRequired: z.boolean(),
}) {}

export type ProjectWorkflowReviewSettingsResponse = {
	projectApprovalRequired: boolean;
};

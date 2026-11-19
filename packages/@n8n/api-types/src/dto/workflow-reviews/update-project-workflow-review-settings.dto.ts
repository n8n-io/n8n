import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateProjectWorkflowReviewSettingsDto extends Z.class({
	requiredByProject: z.boolean(),
}) {}

export type ProjectWorkflowReviewSettingsResponse = {
	requiredByProject: boolean;
};

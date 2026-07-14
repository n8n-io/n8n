import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateWorkflowReviewRequiredDto extends Z.class({
	reviewRequired: z.boolean(),
}) {}

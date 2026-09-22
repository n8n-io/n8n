import { z } from 'zod';

import { Z } from '../../zod-class';

export const workflowPublishForbiddenErrorPublicSchema = z.object({
	message: z.string(),
	reason: z.enum(['insufficient_api_key_scope', 'insufficient_permissions']).optional(),
	versionId: z.string().optional(),
});

export class WorkflowPublishForbiddenErrorPublicDto extends Z.class(
	workflowPublishForbiddenErrorPublicSchema.shape,
) {}

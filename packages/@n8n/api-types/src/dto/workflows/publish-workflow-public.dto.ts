import { z } from 'zod';

import { Z } from '../../zod-class';

export const publishWorkflowPublicSchema = z.object({
	versionId: z.string().optional(),
	name: z.string().optional(),
	description: z.string().optional(),
});

export class PublishWorkflowPublicDto extends Z.class(publishWorkflowPublicSchema.shape) {}

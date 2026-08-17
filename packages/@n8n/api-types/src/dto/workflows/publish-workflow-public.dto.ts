import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Optional body of `POST /workflows/{id}/publish` and its deprecated `/activate` alias. Every field
 * is optional and the body itself may be omitted: publishing with no arguments publishes the
 * workflow's latest version under its existing name.
 */
export const publishWorkflowPublicSchema = z.object({
	versionId: z.string().optional(),
	name: z.string().optional(),
	description: z.string().optional(),
});

export class PublishWorkflowPublicDto extends Z.class(publishWorkflowPublicSchema.shape) {}

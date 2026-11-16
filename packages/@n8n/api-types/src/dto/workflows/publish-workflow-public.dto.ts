import '../../openapi-extend';

import { z } from 'zod';

import { Z } from '../../zod-class';

export const publishWorkflowPublicSchema = z.object({
	versionId: z.string().optional().openapi({
		description: 'The specific version ID to publish. If not provided, the latest version is used.',
	}),
	name: z
		.string()
		.optional()
		.openapi({ description: 'Optional name for the workflow version during publication.' }),
	description: z
		.string()
		.optional()
		.openapi({ description: 'Optional description for the workflow version during publication.' }),
});

export class PublishWorkflowPublicDto extends Z.class(publishWorkflowPublicSchema.shape) {}

export const activateWorkflowPublicSchema = z.object({
	versionId: z.string().optional().openapi({
		description:
			'The specific version ID to activate or publish. If not provided, the latest version is used.',
	}),
	name: z
		.string()
		.optional()
		.openapi({ description: 'Optional name for the workflow version during activation.' }),
	description: z
		.string()
		.optional()
		.openapi({ description: 'Optional description for the workflow version during activation.' }),
});

export class ActivateWorkflowPublicDto extends Z.class(activateWorkflowPublicSchema.shape) {}

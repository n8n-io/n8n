import { z } from 'zod';

import {
	workflowVersionNameSchema,
	workflowVersionDescriptionSchema,
} from '../../schemas/workflow-version.schema';
import { Z } from '../../zod-class';

export class GradualPublishWorkflowDto extends Z.class({
	versionId: z.string().optional(),
	percentage: z.number().int().min(0).max(100),
	name: workflowVersionNameSchema,
	description: workflowVersionDescriptionSchema,
}) {}

export type GradualRolloutVersion = {
	versionId: string;
	percentage: number;
	isNew: boolean;
};

export type GradualRolloutState = {
	enabled: boolean;
	versions: GradualRolloutVersion[];
};

export type GradualPublishResponse = {
	workflowId: string;
	gradualRollout: GradualRolloutState | null;
};

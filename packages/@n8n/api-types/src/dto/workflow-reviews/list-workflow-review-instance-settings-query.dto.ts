import { z } from 'zod';

import { booleanFromString } from '../../schemas/boolean-from-string';
import type { ProjectIcon } from '../../schemas/project.schema';
import { Z } from '../../zod-class';
import { paginationSchema } from '../pagination/pagination.dto';

export class ListWorkflowReviewInstanceSettingsQueryDto extends Z.class({
	...paginationSchema,
	search: z.string().trim().max(255).optional(),
	requiredByInstance: booleanFromString.optional(),
}) {}

export type WorkflowReviewInstanceSettingsProject = {
	id: string;
	name: string;
	icon: ProjectIcon | null;
	requiredByInstance: boolean;
	requiredByProject: boolean;
};

export type WorkflowReviewInstanceSettingsList = {
	count: number;
	data: WorkflowReviewInstanceSettingsProject[];
	managedByEnv: boolean;
};

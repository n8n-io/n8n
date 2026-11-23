import { z } from 'zod';

import { booleanFromString } from '../../schemas/boolean-from-string';
import type { ProjectIcon } from '../../schemas/project.schema';
import { Z } from '../../zod-class';
import { paginationSchema } from '../pagination/pagination.dto';

export class ListWorkflowReviewProjectsQueryDto extends Z.class({
	...paginationSchema,
	search: z.string().trim().max(255).optional(),
	requiredByInstance: booleanFromString.optional(),
}) {}

export class UpdateWorkflowReviewProjectDto extends Z.class({
	requiredByInstance: z.boolean(),
}) {}

export type WorkflowReviewProject = {
	id: string;
	name: string;
	icon: ProjectIcon | null;
	requiredByInstance: boolean;
	requiredByProject: boolean;
};

export type WorkflowReviewProjectUpdateResponse = Pick<WorkflowReviewProject, 'requiredByInstance'>;

export type WorkflowReviewProjectList = {
	count: number;
	data: WorkflowReviewProject[];
	managedByEnv: boolean;
};

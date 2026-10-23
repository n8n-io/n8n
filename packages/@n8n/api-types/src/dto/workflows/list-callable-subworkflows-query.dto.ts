import { z } from 'zod';

import { Z } from '../../zod-class';
import { paginationSchema } from '../pagination/pagination.dto';

/**
 * Query for the list of workflows that a parent workflow can call as
 * sub-workflows. Only name search and pagination are accepted, so callers
 * cannot probe workflow contents.
 */
export class ListCallableSubworkflowsQueryDto extends Z.class({
	...paginationSchema,
	query: z.string().trim().max(256).optional(),
}) {}

export type CallableSubworkflow = {
	id: string;
	name: string;
	active: boolean;
	isArchived: boolean;
	/** Set only when the workflow belongs to a team project. */
	projectName?: string;
};

export type CallableSubworkflowsResponse = {
	count: number;
	data: CallableSubworkflow[];
};

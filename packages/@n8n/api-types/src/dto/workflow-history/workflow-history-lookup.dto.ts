import { z } from 'zod';

import { Z } from '../../zod-class';

export const workflowHistoryLookupFields = [
	'authors',
	'createdAt',
	'updatedAt',
	'name',
	'description',
] as const;

export type WorkflowHistoryLookupField = (typeof workflowHistoryLookupFields)[number];

export class WorkflowHistoryLookupDto extends Z.class({
	versionIds: z.array(z.string()).min(1).max(250),
	fields: z.array(z.enum(workflowHistoryLookupFields)).min(1),
}) {}

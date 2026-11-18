import { z } from 'zod';

import {
	taskBoardAssigneeInputSchema,
	taskBoardSeveritySchema,
	taskBoardTagsSchema,
} from '../../schemas/task-board.schema';
import { Z } from '../../zod-class';

export class UpdateTaskBoardTaskDto extends Z.class({
	title: z.string().trim().min(1).max(255).optional(),
	description: z.string().max(65535).optional(),
	columnId: z.string().min(1).optional(),
	/** `null` removes the assignee. */
	assignee: taskBoardAssigneeInputSchema.nullable().optional(),
	/** `null` removes the severity. */
	severity: taskBoardSeveritySchema.nullable().optional(),
	tags: taskBoardTagsSchema.optional(),
}) {}

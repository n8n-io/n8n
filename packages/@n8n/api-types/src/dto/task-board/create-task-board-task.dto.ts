import { z } from 'zod';

import {
	taskBoardAssigneeInputSchema,
	taskBoardSeveritySchema,
	taskBoardTagsSchema,
} from '../../schemas/task-board.schema';
import { Z } from '../../zod-class';

export class CreateTaskBoardTaskDto extends Z.class({
	title: z.string().trim().min(1).max(255),
	description: z.string().max(65535).optional(),
	columnId: z.string().min(1).optional(),
	assignee: taskBoardAssigneeInputSchema.optional(),
	severity: taskBoardSeveritySchema.optional(),
	tags: taskBoardTagsSchema.optional(),
}) {}

import { z } from 'zod';

import { taskBoardTemplateKeySchema } from '../../schemas/task-board.schema';
import { Z } from '../../zod-class';

export class CreateTaskBoardFromTemplateDto extends Z.class({
	templateKey: taskBoardTemplateKeySchema,
	name: z.string().trim().min(1).max(128),
	/** Fallback agent that the dispatcher workflow uses when a task has no agent assignee. */
	agentId: z.string().min(1).optional(),
}) {}

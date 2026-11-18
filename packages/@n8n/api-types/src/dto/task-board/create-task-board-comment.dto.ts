import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateTaskBoardCommentDto extends Z.class({
	body: z.string().trim().min(1).max(65535),
}) {}

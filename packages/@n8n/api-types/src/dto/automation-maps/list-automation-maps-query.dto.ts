import { z } from 'zod';

import { Z } from '../../zod-class';

export class ListAutomationMapsQueryDto extends Z.class({
	projectId: z.string().min(1).optional(),
}) {}

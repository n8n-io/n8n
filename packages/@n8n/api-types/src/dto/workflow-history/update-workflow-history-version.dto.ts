import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateWorkflowHistoryVersionDto extends Z.class({
	name: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
}) {}

import { z } from 'zod';

import { Z } from '../../zod-class';

export class InstanceAiRenameThreadRequestDto extends Z.class({
	title: z.string().trim().min(1).max(255).optional(),
	metadata: z.record(z.unknown()).optional(),
}) {}

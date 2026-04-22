import { z } from 'zod';

import { Z } from '../../zod-class';

export class InstanceAiFeedbackRequestDto extends Z.class({
	rating: z.enum(['up', 'down']),
	comment: z.string().max(10_000).optional(),
}) {}

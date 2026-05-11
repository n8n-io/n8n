import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateAgentDto extends Z.class({
	name: z.string().min(1),
}) {}

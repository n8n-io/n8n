import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateWorkerPoolDefaultsDto extends Z.class({
	production: z.string().optional(),
	manual: z.string().optional(),
	evaluation: z.string().optional(),
}) {}

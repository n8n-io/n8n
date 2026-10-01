import { z } from 'zod';

import { Z } from '../../zod-class';

export class EmbedLoginBodyDto extends Z.class({
	token: z.string().min(1),
	redirectTo: z.string().optional(),
}) {}

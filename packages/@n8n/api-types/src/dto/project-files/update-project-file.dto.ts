import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateProjectFileDto extends Z.class({
	name: z.string().trim().min(1).max(255),
}) {}

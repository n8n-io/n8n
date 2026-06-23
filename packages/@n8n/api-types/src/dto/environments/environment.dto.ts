import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateEnvironmentDto extends Z.class({
	name: z.string().trim().min(1).max(255),
}) {}

export class UpdateEnvironmentDto extends Z.class({
	name: z.string().trim().min(1).max(255),
}) {}

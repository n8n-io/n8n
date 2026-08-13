import { z } from 'zod';

import { Z } from '../../zod-class';

export const projectFileNameSchema = z.string().trim().min(1).max(255);

export class RenameProjectFileDto extends Z.class({
	name: projectFileNameSchema,
}) {}

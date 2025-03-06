import { z } from 'zod';
import { Z } from 'zod-class';

export class CreateOrUpdateTagRequestDto extends Z.class({
	name: z.string().trim().min(1),
}) {}

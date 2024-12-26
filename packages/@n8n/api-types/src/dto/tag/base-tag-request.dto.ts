import { z } from 'zod';
import { Z } from 'zod-class';

export class BaseTagRequestDto extends Z.class({
	name: z.string().trim().min(1),
}) {}

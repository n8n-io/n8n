import { z } from 'zod';
import { Z } from 'zod-class';

export class AiFreeCreditsRequestDto extends Z.class({
	projectId: z.string().min(1).optional(),
}) {}

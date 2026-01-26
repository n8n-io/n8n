import { z } from 'zod';
import { Z } from 'zod-class';

export class GetDestinationQueryDto extends Z.class({
	id: z.string().min(1).optional(),
}) {}

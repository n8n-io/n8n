import { z } from 'zod';
import { Z } from 'zod-class';

export class GetDestinationQueryDto extends Z.class({
	id: z.string().uuid().optional(),
}) {}

import { z } from 'zod';
import { Z } from 'zod-class';

export class TestDestinationQueryDto extends Z.class({
	id: z.string().uuid(),
}) {}

import { z } from 'zod';
import { Z } from 'zod-class';

export class CreateSchemaDto extends Z.class({
	name: z.string(),
	definition: z.record(z.any()),
}) {}

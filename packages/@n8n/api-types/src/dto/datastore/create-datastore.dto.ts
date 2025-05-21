import { z } from 'zod';
import { Z } from 'zod-class';

import { datastoreNameSchema } from '../../schemas/datastore.schema';

export class CreateDatastoreDto extends Z.class({
	name: datastoreNameSchema,
	fields: z.array(
		z.object({
			name: z.string().min(1),
			type: z.enum(['string', 'number', 'boolean', 'date']),
		}),
	),
}) {}

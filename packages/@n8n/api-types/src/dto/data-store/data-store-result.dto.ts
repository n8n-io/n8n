import { z } from 'zod';
import { Z } from 'zod-class';

import { dataStoreSchema } from '../../schemas/data-store.schema';

export class DataStoreResultDto extends Z.class(
	dataStoreSchema.extend({
		projectId: z.string(),
		sizeBytes: z.number(),
	}).shape,
) {}

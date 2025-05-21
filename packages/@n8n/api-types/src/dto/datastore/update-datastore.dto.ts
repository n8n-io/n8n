import { Z } from 'zod-class';

import { datastoreNameSchema } from '../../schemas/datastore.schema';

export class UpdateDatastoreDto extends Z.class({
	name: datastoreNameSchema,
}) {}

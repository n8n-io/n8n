import { Z } from 'zod-class';

import { dataStoreIdSchema, dataStoreNameSchema } from '../../schemas/data-store.schema';

export class RenameDataStoreDto extends Z.class({
	id: dataStoreIdSchema,
	name: dataStoreNameSchema,
}) {}

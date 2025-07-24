import { Z } from 'zod-class';

import { dataStoreNameSchema } from '../../schemas/data-store.schema';

export class RenameDataStoreDto extends Z.class({
	name: dataStoreNameSchema,
}) {}

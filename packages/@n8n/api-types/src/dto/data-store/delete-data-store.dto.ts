import { Z } from 'zod-class';

import { dataStoreIdSchema } from '../../schemas/data-store.schema';

export class DeleteDataStoreDto extends Z.class({
	id: dataStoreIdSchema,
}) {}

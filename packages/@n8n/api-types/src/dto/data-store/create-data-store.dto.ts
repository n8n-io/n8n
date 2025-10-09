import { z } from 'zod';
import { Z } from 'zod-class';

import { CreateDataStoreColumnDto } from './create-data-store-column.dto';
import { dataStoreNameSchema } from '../../schemas/data-store.schema';

export class CreateDataStoreDto extends Z.class({
	name: dataStoreNameSchema,
	columns: z.array(CreateDataStoreColumnDto),
}) {}

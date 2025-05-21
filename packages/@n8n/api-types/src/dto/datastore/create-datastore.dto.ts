import { z } from 'zod';
import { Z } from 'zod-class';

import { CreateDatastoreFieldDto } from './create-datastore-field.dto';
import { datastoreNameSchema } from '../../schemas/datastore.schema';

export class CreateDatastoreDto extends Z.class({
	name: datastoreNameSchema,
	fields: z.array(CreateDatastoreFieldDto),
}) {}

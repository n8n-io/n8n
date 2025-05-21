import { Z } from 'zod-class';

import { datastoreFieldNameSchema, datastoreFieldTypeSchema } from '../../schemas/datastore.schema';

export class CreateDatastoreFieldDto extends Z.class({
	name: datastoreFieldNameSchema,
	type: datastoreFieldTypeSchema,
}) {}

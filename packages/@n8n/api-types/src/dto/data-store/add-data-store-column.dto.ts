import { Z } from 'zod-class';

import { dataStoreCreateColumnSchema } from '../../schemas/data-store.schema';

export class AddDataStoreColumnDto extends Z.class(dataStoreCreateColumnSchema.shape) {}

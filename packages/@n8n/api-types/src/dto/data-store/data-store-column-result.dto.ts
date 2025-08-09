import { Z } from 'zod-class';

import { dataStoreColumnSchema } from '../../schemas/data-store.schema';

export class DataStoreColumnResultDto extends Z.class(dataStoreColumnSchema.shape) {}

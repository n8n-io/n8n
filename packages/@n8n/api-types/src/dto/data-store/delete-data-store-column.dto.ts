import { z } from 'zod';
import { Z } from 'zod-class';

export class DeleteDataStoreColumnDto extends Z.class({
	columnId: z.string(),
}) {}

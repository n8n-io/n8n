import { z } from 'zod';
import { Z } from 'zod-class';

export class MoveDataStoreColumnDto extends Z.class({
	columnId: z.string(),
	columnIndex: z.number(),
}) {}

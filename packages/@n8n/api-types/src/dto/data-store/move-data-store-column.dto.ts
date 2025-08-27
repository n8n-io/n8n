import { z } from 'zod';
import { Z } from 'zod-class';

export class MoveDataStoreColumnDto extends Z.class({
	targetIndex: z.number().int().nonnegative(),
}) {}

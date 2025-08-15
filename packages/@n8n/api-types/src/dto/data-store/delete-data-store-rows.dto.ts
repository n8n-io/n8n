import { z } from 'zod';
import { Z } from 'zod-class';

export class DeleteDataStoreRowsDto extends Z.class({
	ids: z.array(z.number().int().positive()),
}) {}

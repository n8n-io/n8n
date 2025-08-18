import { z } from 'zod';
import { Z } from 'zod-class';

export class DeleteDataStoreRowsQueryDto extends Z.class({
	ids: z
		.string()
		.transform((str) => {
			if (!str.trim()) return [];
			return str.split(',').map((id) => parseInt(id.trim(), 10));
		})
		.refine((ids) => ids.length === 0 || ids.every((id) => !isNaN(id) && id > 0), {
			message: 'All ids must be positive integers',
		}),
}) {}

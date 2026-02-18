import { z } from 'zod';

import { Z } from '../../zod-class';

const booleanValidator = z
	.union([z.string(), z.boolean()])
	.optional()
	.transform((val) => {
		if (typeof val === 'string') {
			return val === 'true';
		}
		return val ?? true;
	});

export class DownloadDataTableCsvQueryDto extends Z.class({
	includeSystemColumns: booleanValidator,
}) {}

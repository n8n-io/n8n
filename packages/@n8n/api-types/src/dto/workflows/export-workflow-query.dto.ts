import { z } from 'zod';
import { Z } from 'zod-class';

export class ExportWorkflowQueryDto extends Z.class({
	includeDataTables: z
		.string()
		.transform((val) => val === 'true')
		.optional(),
}) {}

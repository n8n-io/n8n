import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';

export class DeleteExecutionsDto extends Z.class({
	deleteBefore: z.coerce.date().optional(),
	/** Validated against the executions filter JSON schema downstream. */
	filters: (z.object({}).catchall(z.any()) satisfies z.ZodType<IDataObject>).optional(),
	ids: z.array(z.string()).optional(),
}) {}

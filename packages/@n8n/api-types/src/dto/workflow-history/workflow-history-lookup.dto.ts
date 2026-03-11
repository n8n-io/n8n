import { z } from 'zod';

import { Z } from '../../zod-class';

const allowedFields = ['authors', 'createdAt', 'updatedAt', 'name', 'description'] as const;

export class WorkflowHistoryLookupDto extends Z.class({
	versionIds: z.array(z.string()).min(1).max(250),
	fields: z.array(z.enum(allowedFields)).min(1),
}) {}

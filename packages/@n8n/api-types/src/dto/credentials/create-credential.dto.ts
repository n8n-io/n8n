import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateCredentialDto extends Z.class({
	name: z.string().min(1).max(128),
	type: z.string().min(1).max(128),
	data: z.record(z.string(), z.unknown()),
	projectId: z.string().optional(),
	uiContext: z.string().optional(),
	isGlobal: z.boolean().optional(),
	isResolvable: z.boolean().optional(),
	metadata: (z.object({}).catchall(z.any()) satisfies z.ZodType<IDataObject>).optional(),
}) {}

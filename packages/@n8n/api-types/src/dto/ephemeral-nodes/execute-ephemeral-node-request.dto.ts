import { z } from 'zod';

import { Z } from '../../zod-class';

const credentialDetailSchema = z.object({
	id: z.string(),
	name: z.string(),
});

export class ExecuteEphemeralNodeRequestDto extends Z.class({
	nodeType: z.string().min(1),
	nodeTypeVersion: z.number(),
	nodeParameters: z.record(z.string(), z.unknown()).default({}),
	credentials: z.record(z.string(), credentialDetailSchema).optional(),
	inputData: z.array(z.record(z.string(), z.unknown())).optional().default([]),
	projectId: z.string().min(1).optional(),
}) {}

import { z } from 'zod';

import { Z } from '../../zod-class';

export class TestCredentialRequestDto extends Z.class({
	credentials: z.object({
		id: z.string(),
		name: z.string().default(''),
		type: z.string(),
		data: z.record(z.string(), z.unknown()).optional(),
	}),
}) {}

import { z } from 'zod';

import { Z } from '../../zod-class';

export class BinaryDataSignedQueryDto extends Z.class({
	token: z.string().regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/, {
		error: 'Token must be a valid JWT format',
	}),
}) {}

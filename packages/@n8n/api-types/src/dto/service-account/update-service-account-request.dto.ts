import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateServiceAccountRequestDto extends Z.class({
	name: z.string().trim().min(1, 'Name is required').max(32).optional(),
	/** Instant kill switch: revokes cookie sessions and API keys on the next request. */
	disabled: z.boolean().optional(),
}) {}

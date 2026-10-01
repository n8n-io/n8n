import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class ApproveConsentRequestDto extends Z.class({
	approved: z.boolean(),
	scopes: z.array(z.string().max(64)).max(32).optional(),
	/** Id of the pending authorization request to decide, from the /authorize redirect. */
	flow: z.string().max(64),
}) {}

import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class ApproveConsentRequestDto extends Z.class({
	approved: z.boolean(),
	// Granted scopes go into the token verbatim, so a repeated scope only inflates the bearer.
	scopes: z
		.array(z.string().max(64))
		.max(256)
		.refine((scopes) => new Set(scopes).size === scopes.length, {
			message: 'scopes must not contain duplicates',
		})
		.optional(),
	/** Id of the pending authorization request to decide, from the /authorize redirect. */
	flow: z.string().max(64),
}) {}

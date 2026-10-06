import { z } from 'zod';

import { credentialDescriptionSchema } from '../../schemas/credential-description.schema';
import { Z } from '../../zod-class';

export class CreateCredentialDto extends Z.class({
	name: z.string().min(1).max(128),
	description: credentialDescriptionSchema.optional(),
	type: z.string().min(1).max(128),
	data: z.record(z.string(), z.unknown()),
	projectId: z.string().optional(),
	uiContext: z.string().optional(),
	isGlobal: z.boolean().optional(),
	isResolvable: z.boolean().optional(),
	usageScope: z.enum(['project', 'instance']).optional(),
	/**
	 * The credential is created for an OAuth popup the user has not finished yet.
	 * The server keeps it out of lists until a token is written and deletes it if
	 * that never happens.
	 */
	pendingAuthorization: z.boolean().optional(),
}) {}

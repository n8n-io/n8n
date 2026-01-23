import { z } from 'zod';
import { Z } from 'zod-class';

import {
	credentialResolverNameSchema,
	credentialResolverConfigSchema,
	credentialResolverTypeNameSchema,
} from '../../schemas/credential-resolver.schema';

export class UpdateCredentialResolverDto extends Z.class({
	type: credentialResolverTypeNameSchema.optional(),
	name: credentialResolverNameSchema.optional(),
	config: credentialResolverConfigSchema.optional(),
	clearCredentials: z.boolean().optional(),
}) {}

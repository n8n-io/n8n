import { z } from 'zod';

import {
	credentialResolverNameSchema,
	credentialResolverConfigSchema,
	credentialResolverTypeNameSchema,
} from '../../schemas/credential-resolver.schema';
import { Z } from '../../zod-class';

export class UpdateCredentialResolverDto extends Z.class({
	type: credentialResolverTypeNameSchema.optional(),
	name: credentialResolverNameSchema.optional(),
	config: credentialResolverConfigSchema.optional(),
	clearCredentials: z.boolean().optional(),
}) {}

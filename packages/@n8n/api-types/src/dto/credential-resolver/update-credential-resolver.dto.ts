import { Z } from 'zod-class';

import {
	credentialResolverNameSchema,
	credentialResolverConfigSchema,
} from '../../schemas/credential-resolver.schema';

export class UpdateCredentialResolverDto extends Z.class({
	name: credentialResolverNameSchema.optional(),
	config: credentialResolverConfigSchema.optional(),
}) {}

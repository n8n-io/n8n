import { Z } from 'zod-class';

import {
	credentialResolverNameSchema,
	credentialResolverTypeSchema,
	credentialResolverConfigSchema,
} from '../../schemas/credential-resolver.schema';

export class CreateCredentialResolverDto extends Z.class({
	name: credentialResolverNameSchema,
	type: credentialResolverTypeSchema,
	config: credentialResolverConfigSchema,
}) {}

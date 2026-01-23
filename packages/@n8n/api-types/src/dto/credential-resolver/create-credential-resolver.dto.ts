import { Z } from 'zod-class';

import {
	credentialResolverNameSchema,
	credentialResolverConfigSchema,
	credentialResolverTypeNameSchema,
} from '../../schemas/credential-resolver.schema';

export class CreateCredentialResolverDto extends Z.class({
	name: credentialResolverNameSchema,
	type: credentialResolverTypeNameSchema,
	config: credentialResolverConfigSchema,
}) {}

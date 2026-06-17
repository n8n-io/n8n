import {
	credentialResolverNameSchema,
	credentialResolverConfigSchema,
	credentialResolverTypeNameSchema,
} from '../../schemas/credential-resolver.schema';
import { Z } from '../../zod-class';

export class CreateCredentialResolverDto extends Z.class({
	name: credentialResolverNameSchema,
	type: credentialResolverTypeNameSchema,
	config: credentialResolverConfigSchema,
}) {}

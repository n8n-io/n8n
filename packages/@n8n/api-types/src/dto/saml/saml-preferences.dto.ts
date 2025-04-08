import { z } from 'zod';
import { Z } from 'zod-class';

const SamlLoginBindingSchema = z.enum(['redirect', 'post']);

/** Schema for configuring the signature in SAML requests/responses. */
const SignatureConfigSchema = z.object({
	prefix: z.string().default('ds'),
	location: z.object({
		reference: z.string(),
		action: z.enum(['before', 'after', 'prepend', 'append']),
	}),
});

export class SamlPreferences extends Z.class({
	/** Mapping of SAML attributes to user fields. */
	mapping: z
		.object({
			email: z.string(),
			firstName: z.string(),
			lastName: z.string(),
			userPrincipalName: z.string(),
		})
		.optional(),
	/** SAML metadata in XML format. */
	metadata: z.string().optional(),
	metadataUrl: z.string().optional(),

	ignoreSSL: z.boolean().default(false),
	loginBinding: SamlLoginBindingSchema.default('redirect'),
	/** Whether SAML login is enabled. */
	loginEnabled: z.boolean().optional(),
	/** Label for the SAML login button. on the Auth screen */
	loginLabel: z.string().optional(),

	authnRequestsSigned: z.boolean().default(false),
	wantAssertionsSigned: z.boolean().default(true),
	wantMessageSigned: z.boolean().default(true),

	acsBinding: SamlLoginBindingSchema.default('post'),
	signatureConfig: SignatureConfigSchema.default({
		prefix: 'ds',
		location: {
			reference: '/samlp:Response/saml:Issuer',
			action: 'after',
		},
	}),

	relayState: z.string().default(''),
}) {}

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

export class SamlPreferencesAttributeMapping extends Z.class({
	/** SAML attribute mapped to the user's email. */
	email: z.string(),
	/** SAML attribute mapped to the user's first name. */
	firstName: z.string(),
	/** SAML attribute mapped to the user's last name. */
	lastName: z.string(),
	/** SAML attribute mapped to the user's principal name. */
	userPrincipalName: z.string(),
	/** SAML attribute mapped to the n8n instance role. */
	n8nInstanceRole: z.string().optional(),
	/** Each element in the array is formatted like "<projectId>:<role>" */
	n8nProjectRoles: z.array(z.string()).optional(),
}) {}

export class SamlPreferences extends Z.class({
	/** Mapping of SAML attributes to user fields. */
	mapping: SamlPreferencesAttributeMapping.optional(),
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

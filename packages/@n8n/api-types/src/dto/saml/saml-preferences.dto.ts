import { z } from 'zod';

import { Z } from '../../zod-class';

const SamlLoginBindingSchema = z.enum(['redirect', 'post']);

/** Schema for configuring the signature in SAML requests/responses. */
const SignatureConfigSchema = z.object({
	prefix: z.string().default('ds'),
	location: z.object({
		reference: z.string(),
		action: z.enum(['before', 'after', 'prepend', 'append']),
	}),
});

/** Same shape without defaults — required for full-object Public API PUTs. */
const SignatureConfigRequiredSchema = z.object({
	prefix: z.string(),
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
	mapping: SamlPreferencesAttributeMapping.schema.optional(),
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

	/** PEM-encoded private key for signing SAML AuthnRequests. Stored encrypted at rest. */
	signingPrivateKey: z.string().optional(),
	/** PEM-encoded certificate containing the public key matching signingPrivateKey. */
	signingCertificate: z.string().optional(),

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

/**
 * Public API PUT body for SAML configuration. Clients must send every writable
 * field; use empty strings / empty arrays when a value is unset.
 */
export class UpdateSamlConfigurationDto extends Z.class({
	mapping: z.object({
		email: z.string(),
		firstName: z.string(),
		lastName: z.string(),
		userPrincipalName: z.string(),
		n8nInstanceRole: z.string(),
		n8nProjectRoles: z.array(z.string()),
	}),
	metadata: z.string(),
	metadataUrl: z.string(),
	ignoreSSL: z.boolean(),
	loginBinding: SamlLoginBindingSchema,
	loginEnabled: z.boolean(),
	loginLabel: z.string(),
	authnRequestsSigned: z.boolean(),
	wantAssertionsSigned: z.boolean(),
	wantMessageSigned: z.boolean(),
	signingPrivateKey: z.string(),
	signingCertificate: z.string(),
	acsBinding: SamlLoginBindingSchema,
	signatureConfig: SignatureConfigRequiredSchema,
	relayState: z.string(),
}) {}

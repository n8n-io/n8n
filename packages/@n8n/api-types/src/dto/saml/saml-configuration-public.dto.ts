import '../../openapi-extend';

import { z } from 'zod';

import { Z } from '../../zod-class';

const samlBindingSchema = z.enum(['redirect', 'post']);
const signatureActionSchema = z.enum(['before', 'after', 'prepend', 'append']);

const mappingShape = {
	email: z.string().openapi({
		description: "SAML attribute mapped to the user's email.",
	}),
	firstName: z.string().openapi({
		description: "SAML attribute mapped to the user's first name.",
	}),
	lastName: z.string().openapi({
		description: "SAML attribute mapped to the user's last name.",
	}),
	userPrincipalName: z.string().openapi({
		description: "SAML attribute mapped to the user's principal name.",
	}),
	n8nInstanceRole: z.string().openapi({
		description: 'SAML attribute mapped to the n8n instance role.',
	}),
	n8nProjectRoles: z.array(z.string()).openapi({
		description: 'SAML attributes mapped to n8n project roles, formatted as `<projectId>:<role>`.',
	}),
};

const responseMappingSchema = z.object(mappingShape).openapi({
	description: 'Mapping of SAML attributes to n8n user fields.',
	additionalProperties: false,
});

const responseSignatureConfigSchema = z
	.object({
		prefix: z.string().openapi({ example: 'ds' }),
		location: z
			.object({
				reference: z.string().openapi({ example: '/samlp:Response/saml:Issuer' }),
				action: signatureActionSchema.openapi({ example: 'after' }),
			})
			.openapi({ additionalProperties: false }),
	})
	.openapi({
		description: 'Configuration for the signature in SAML requests and responses.',
		additionalProperties: false,
	});

export const samlConfigurationPublicSchema = z
	.object({
		entityID: z.string().openapi({
			readOnly: true,
			description: 'Service provider entity ID (metadata URL).',
			example: 'https://n8n.example.com/rest/sso/saml/metadata',
		}),
		returnUrl: z.string().openapi({
			readOnly: true,
			description: 'Assertion Consumer Service (ACS) return URL.',
			example: 'https://n8n.example.com/rest/sso/saml/acs',
		}),
		mapping: responseMappingSchema,
		metadata: z.string().openapi({
			description:
				'Identity provider metadata in XML format. Redacted on read when set because it contains IdP certificates; never echoed back in plaintext. Use an empty string when unset.',
			example: '**hidden**',
		}),
		metadataUrl: z.string().openapi({
			description: 'URL to fetch identity provider metadata from. Use an empty string when unset.',
		}),
		ignoreSSL: z.boolean().openapi({
			description: 'Whether to ignore SSL certificate errors when fetching metadata from a URL.',
			example: false,
		}),
		loginBinding: samlBindingSchema.openapi({
			description: 'SAML login request binding.',
			example: 'redirect',
		}),
		loginEnabled: z.boolean().openapi({
			description: 'Whether SAML login is enabled.',
			example: false,
		}),
		loginLabel: z.string().openapi({
			description: 'Label shown on the SAML login button.',
			example: 'SAML',
		}),
		authnRequestsSigned: z.boolean().openapi({
			description: 'Whether authentication requests are signed.',
			example: false,
		}),
		wantAssertionsSigned: z.boolean().openapi({
			description: 'Whether signed assertions are required.',
			example: true,
		}),
		wantMessageSigned: z.boolean().openapi({
			description: 'Whether signed SAML messages are required.',
			example: true,
		}),
		signingPrivateKey: z.string().openapi({
			description:
				'PEM-encoded private key for signing SAML AuthnRequests. Redacted on read when set; never echoed back in plaintext. Use an empty string when unset.',
			example: '**hidden**',
		}),
		signingCertificate: z.string().openapi({
			description:
				'PEM-encoded certificate containing the public key matching the signing private key. Redacted on read when set; never echoed back in plaintext. Use an empty string when unset.',
			example: '**hidden**',
		}),
		acsBinding: samlBindingSchema.openapi({
			description: 'Assertion Consumer Service binding.',
			example: 'post',
		}),
		signatureConfig: responseSignatureConfigSchema,
		relayState: z.string().openapi({
			description: 'Default relay state value for SAML requests. Use an empty string when unset.',
			example: 'https://n8n.example.com',
		}),
	})
	.openapi({ additionalProperties: false });

export class SamlConfigurationPublicDto extends Z.class(samlConfigurationPublicSchema.shape) {
	static schema = samlConfigurationPublicSchema;
}

const updateMappingSchema = z
	.object({
		email: z.string().openapi({
			description: "SAML attribute mapped to the user's email.",
		}),
		firstName: z.string().openapi({
			description: "SAML attribute mapped to the user's first name.",
		}),
		lastName: z.string().openapi({
			description: "SAML attribute mapped to the user's last name.",
		}),
		userPrincipalName: z.string().openapi({
			description: "SAML attribute mapped to the user's principal name.",
		}),
		n8nInstanceRole: z.string().openapi({
			description:
				'SAML attribute mapped to the n8n instance role. Use an empty string when unused.',
		}),
		n8nProjectRoles: z.array(z.string()).openapi({
			description:
				'SAML attributes mapped to n8n project roles, formatted as `<projectId>:<role>`. Use an empty array when unused.',
		}),
	})
	.strict();

const updateSignatureConfigSchema = z
	.object({
		prefix: z.string().openapi({ example: 'ds' }),
		location: z
			.object({
				reference: z.string().openapi({ example: '/samlp:Response/saml:Issuer' }),
				action: signatureActionSchema.openapi({ example: 'after' }),
			})
			.strict(),
	})
	.strict()
	.openapi({
		description: 'Configuration for the signature in SAML requests and responses.',
	});

const updateSamlConfigurationPublicSchema = z
	.object({
		mapping: updateMappingSchema.openapi({
			description:
				'Mapping of SAML attributes to n8n user fields. Use empty strings / empty arrays for unused attributes.',
		}),
		metadata: z.string().openapi({
			description:
				'Identity provider metadata in XML format. Use an empty string to clear stored metadata (also clears metadataUrl when no URL is provided). Use the redaction placeholder from a prior GET to leave an existing value unchanged.',
		}),
		metadataUrl: z.string().openapi({
			description:
				'URL to fetch identity provider metadata from. Use an empty string to clear a stored URL.',
		}),
		ignoreSSL: z.boolean().openapi({
			description: 'Whether to ignore SSL certificate errors when fetching metadata from a URL.',
			example: false,
		}),
		loginBinding: samlBindingSchema.openapi({
			description: 'SAML login request binding.',
			example: 'redirect',
		}),
		loginEnabled: z.boolean().openapi({
			description: 'Whether SAML login is enabled.',
			example: false,
		}),
		loginLabel: z.string().openapi({
			description: 'Label shown on the SAML login button.',
			example: 'SAML',
		}),
		authnRequestsSigned: z.boolean().openapi({
			description: 'Whether authentication requests are signed.',
			example: false,
		}),
		wantAssertionsSigned: z.boolean().openapi({
			description: 'Whether signed assertions are required.',
			example: true,
		}),
		wantMessageSigned: z.boolean().openapi({
			description: 'Whether signed SAML messages are required.',
			example: true,
		}),
		signingPrivateKey: z.string().openapi({
			description:
				'PEM-encoded private key for signing SAML AuthnRequests. Use an empty string to clear an existing key, or the redaction placeholder from a prior GET to leave it unchanged.',
		}),
		signingCertificate: z.string().openapi({
			description:
				'PEM-encoded certificate containing the public key matching the signing private key. Use an empty string when unused or to clear an existing certificate.',
		}),
		acsBinding: samlBindingSchema.openapi({
			description: 'Assertion Consumer Service binding.',
			example: 'post',
		}),
		signatureConfig: updateSignatureConfigSchema,
		relayState: z.string().openapi({
			description: 'Default relay state value for SAML requests. Use an empty string when unused.',
			example: 'https://n8n.example.com',
		}),
		entityID: z.string().optional().openapi({
			description:
				'Service provider entity ID. Returned by GET for convenience; ignored on write so a GET response can be sent back as a PUT body.',
			example: 'https://n8n.example.com/rest/sso/saml/metadata',
		}),
		returnUrl: z.string().optional().openapi({
			description:
				'Assertion Consumer Service return URL. Returned by GET for convenience; ignored on write so a GET response can be sent back as a PUT body.',
			example: 'https://n8n.example.com/rest/sso/saml/acs',
		}),
	})
	.strict()
	.openapi({
		description:
			'Full SAML SSO configuration. Every field must be provided; use empty strings or empty arrays when a value is unset. Partial updates are not supported.',
	});

/**
 * Public API PUT body for SAML configuration. Clients must send every writable
 * field. `entityID` and `returnUrl` are accepted and ignored so a GET response
 * can be sent back as a PUT body.
 */
export class UpdateSamlConfigurationPublicDto extends Z.class(
	updateSamlConfigurationPublicSchema.shape,
	{ strict: true },
) {
	static schema = updateSamlConfigurationPublicSchema;
}

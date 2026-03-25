import * as z from 'zod/v4';
/**
 * Reusable URL validation that disallows javascript: scheme
 */
export const SafeUrlSchema = z
    .url()
    .superRefine((val, ctx) => {
    if (!URL.canParse(val)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'URL must be parseable',
            fatal: true
        });
        return z.NEVER;
    }
})
    .refine(url => {
    const u = new URL(url);
    return u.protocol !== 'javascript:' && u.protocol !== 'data:' && u.protocol !== 'vbscript:';
}, { message: 'URL cannot use javascript:, data:, or vbscript: scheme' });
/**
 * RFC 9728 OAuth Protected Resource Metadata
 */
export const OAuthProtectedResourceMetadataSchema = z.looseObject({
    resource: z.string().url(),
    authorization_servers: z.array(SafeUrlSchema).optional(),
    jwks_uri: z.string().url().optional(),
    scopes_supported: z.array(z.string()).optional(),
    bearer_methods_supported: z.array(z.string()).optional(),
    resource_signing_alg_values_supported: z.array(z.string()).optional(),
    resource_name: z.string().optional(),
    resource_documentation: z.string().optional(),
    resource_policy_uri: z.string().url().optional(),
    resource_tos_uri: z.string().url().optional(),
    tls_client_certificate_bound_access_tokens: z.boolean().optional(),
    authorization_details_types_supported: z.array(z.string()).optional(),
    dpop_signing_alg_values_supported: z.array(z.string()).optional(),
    dpop_bound_access_tokens_required: z.boolean().optional()
});
/**
 * RFC 8414 OAuth 2.0 Authorization Server Metadata
 */
export const OAuthMetadataSchema = z.looseObject({
    issuer: z.string(),
    authorization_endpoint: SafeUrlSchema,
    token_endpoint: SafeUrlSchema,
    registration_endpoint: SafeUrlSchema.optional(),
    scopes_supported: z.array(z.string()).optional(),
    response_types_supported: z.array(z.string()),
    response_modes_supported: z.array(z.string()).optional(),
    grant_types_supported: z.array(z.string()).optional(),
    token_endpoint_auth_methods_supported: z.array(z.string()).optional(),
    token_endpoint_auth_signing_alg_values_supported: z.array(z.string()).optional(),
    service_documentation: SafeUrlSchema.optional(),
    revocation_endpoint: SafeUrlSchema.optional(),
    revocation_endpoint_auth_methods_supported: z.array(z.string()).optional(),
    revocation_endpoint_auth_signing_alg_values_supported: z.array(z.string()).optional(),
    introspection_endpoint: z.string().optional(),
    introspection_endpoint_auth_methods_supported: z.array(z.string()).optional(),
    introspection_endpoint_auth_signing_alg_values_supported: z.array(z.string()).optional(),
    code_challenge_methods_supported: z.array(z.string()).optional(),
    client_id_metadata_document_supported: z.boolean().optional()
});
/**
 * OpenID Connect Discovery 1.0 Provider Metadata
 * see: https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata
 */
export const OpenIdProviderMetadataSchema = z.looseObject({
    issuer: z.string(),
    authorization_endpoint: SafeUrlSchema,
    token_endpoint: SafeUrlSchema,
    userinfo_endpoint: SafeUrlSchema.optional(),
    jwks_uri: SafeUrlSchema,
    registration_endpoint: SafeUrlSchema.optional(),
    scopes_supported: z.array(z.string()).optional(),
    response_types_supported: z.array(z.string()),
    response_modes_supported: z.array(z.string()).optional(),
    grant_types_supported: z.array(z.string()).optional(),
    acr_values_supported: z.array(z.string()).optional(),
    subject_types_supported: z.array(z.string()),
    id_token_signing_alg_values_supported: z.array(z.string()),
    id_token_encryption_alg_values_supported: z.array(z.string()).optional(),
    id_token_encryption_enc_values_supported: z.array(z.string()).optional(),
    userinfo_signing_alg_values_supported: z.array(z.string()).optional(),
    userinfo_encryption_alg_values_supported: z.array(z.string()).optional(),
    userinfo_encryption_enc_values_supported: z.array(z.string()).optional(),
    request_object_signing_alg_values_supported: z.array(z.string()).optional(),
    request_object_encryption_alg_values_supported: z.array(z.string()).optional(),
    request_object_encryption_enc_values_supported: z.array(z.string()).optional(),
    token_endpoint_auth_methods_supported: z.array(z.string()).optional(),
    token_endpoint_auth_signing_alg_values_supported: z.array(z.string()).optional(),
    display_values_supported: z.array(z.string()).optional(),
    claim_types_supported: z.array(z.string()).optional(),
    claims_supported: z.array(z.string()).optional(),
    service_documentation: z.string().optional(),
    claims_locales_supported: z.array(z.string()).optional(),
    ui_locales_supported: z.array(z.string()).optional(),
    claims_parameter_supported: z.boolean().optional(),
    request_parameter_supported: z.boolean().optional(),
    request_uri_parameter_supported: z.boolean().optional(),
    require_request_uri_registration: z.boolean().optional(),
    op_policy_uri: SafeUrlSchema.optional(),
    op_tos_uri: SafeUrlSchema.optional(),
    client_id_metadata_document_supported: z.boolean().optional()
});
/**
 * OpenID Connect Discovery metadata that may include OAuth 2.0 fields
 * This schema represents the real-world scenario where OIDC providers
 * return a mix of OpenID Connect and OAuth 2.0 metadata fields
 */
export const OpenIdProviderDiscoveryMetadataSchema = z.object({
    ...OpenIdProviderMetadataSchema.shape,
    ...OAuthMetadataSchema.pick({
        code_challenge_methods_supported: true
    }).shape
});
/**
 * OAuth 2.1 token response
 */
export const OAuthTokensSchema = z
    .object({
    access_token: z.string(),
    id_token: z.string().optional(), // Optional for OAuth 2.1, but necessary in OpenID Connect
    token_type: z.string(),
    expires_in: z.coerce.number().optional(),
    scope: z.string().optional(),
    refresh_token: z.string().optional()
})
    .strip();
/**
 * OAuth 2.1 error response
 */
export const OAuthErrorResponseSchema = z.object({
    error: z.string(),
    error_description: z.string().optional(),
    error_uri: z.string().optional()
});
/**
 * Optional version of SafeUrlSchema that allows empty string for retrocompatibility on tos_uri and logo_uri
 */
export const OptionalSafeUrlSchema = SafeUrlSchema.optional().or(z.literal('').transform(() => undefined));
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration metadata
 */
export const OAuthClientMetadataSchema = z
    .object({
    redirect_uris: z.array(SafeUrlSchema),
    token_endpoint_auth_method: z.string().optional(),
    grant_types: z.array(z.string()).optional(),
    response_types: z.array(z.string()).optional(),
    client_name: z.string().optional(),
    client_uri: SafeUrlSchema.optional(),
    logo_uri: OptionalSafeUrlSchema,
    scope: z.string().optional(),
    contacts: z.array(z.string()).optional(),
    tos_uri: OptionalSafeUrlSchema,
    policy_uri: z.string().optional(),
    jwks_uri: SafeUrlSchema.optional(),
    jwks: z.any().optional(),
    software_id: z.string().optional(),
    software_version: z.string().optional(),
    software_statement: z.string().optional()
})
    .strip();
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration client information
 */
export const OAuthClientInformationSchema = z
    .object({
    client_id: z.string(),
    client_secret: z.string().optional(),
    client_id_issued_at: z.number().optional(),
    client_secret_expires_at: z.number().optional()
})
    .strip();
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration full response (client information plus metadata)
 */
export const OAuthClientInformationFullSchema = OAuthClientMetadataSchema.merge(OAuthClientInformationSchema);
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration error response
 */
export const OAuthClientRegistrationErrorSchema = z
    .object({
    error: z.string(),
    error_description: z.string().optional()
})
    .strip();
/**
 * RFC 7009 OAuth 2.0 Token Revocation request
 */
export const OAuthTokenRevocationRequestSchema = z
    .object({
    token: z.string(),
    token_type_hint: z.string().optional()
})
    .strip();
//# sourceMappingURL=auth.js.map
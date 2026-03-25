"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthTokenRevocationRequestSchema = exports.OAuthClientRegistrationErrorSchema = exports.OAuthClientInformationFullSchema = exports.OAuthClientInformationSchema = exports.OAuthClientMetadataSchema = exports.OptionalSafeUrlSchema = exports.OAuthErrorResponseSchema = exports.OAuthTokensSchema = exports.OpenIdProviderDiscoveryMetadataSchema = exports.OpenIdProviderMetadataSchema = exports.OAuthMetadataSchema = exports.OAuthProtectedResourceMetadataSchema = exports.SafeUrlSchema = void 0;
const z = __importStar(require("zod/v4"));
/**
 * Reusable URL validation that disallows javascript: scheme
 */
exports.SafeUrlSchema = z
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
exports.OAuthProtectedResourceMetadataSchema = z.looseObject({
    resource: z.string().url(),
    authorization_servers: z.array(exports.SafeUrlSchema).optional(),
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
exports.OAuthMetadataSchema = z.looseObject({
    issuer: z.string(),
    authorization_endpoint: exports.SafeUrlSchema,
    token_endpoint: exports.SafeUrlSchema,
    registration_endpoint: exports.SafeUrlSchema.optional(),
    scopes_supported: z.array(z.string()).optional(),
    response_types_supported: z.array(z.string()),
    response_modes_supported: z.array(z.string()).optional(),
    grant_types_supported: z.array(z.string()).optional(),
    token_endpoint_auth_methods_supported: z.array(z.string()).optional(),
    token_endpoint_auth_signing_alg_values_supported: z.array(z.string()).optional(),
    service_documentation: exports.SafeUrlSchema.optional(),
    revocation_endpoint: exports.SafeUrlSchema.optional(),
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
exports.OpenIdProviderMetadataSchema = z.looseObject({
    issuer: z.string(),
    authorization_endpoint: exports.SafeUrlSchema,
    token_endpoint: exports.SafeUrlSchema,
    userinfo_endpoint: exports.SafeUrlSchema.optional(),
    jwks_uri: exports.SafeUrlSchema,
    registration_endpoint: exports.SafeUrlSchema.optional(),
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
    op_policy_uri: exports.SafeUrlSchema.optional(),
    op_tos_uri: exports.SafeUrlSchema.optional(),
    client_id_metadata_document_supported: z.boolean().optional()
});
/**
 * OpenID Connect Discovery metadata that may include OAuth 2.0 fields
 * This schema represents the real-world scenario where OIDC providers
 * return a mix of OpenID Connect and OAuth 2.0 metadata fields
 */
exports.OpenIdProviderDiscoveryMetadataSchema = z.object({
    ...exports.OpenIdProviderMetadataSchema.shape,
    ...exports.OAuthMetadataSchema.pick({
        code_challenge_methods_supported: true
    }).shape
});
/**
 * OAuth 2.1 token response
 */
exports.OAuthTokensSchema = z
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
exports.OAuthErrorResponseSchema = z.object({
    error: z.string(),
    error_description: z.string().optional(),
    error_uri: z.string().optional()
});
/**
 * Optional version of SafeUrlSchema that allows empty string for retrocompatibility on tos_uri and logo_uri
 */
exports.OptionalSafeUrlSchema = exports.SafeUrlSchema.optional().or(z.literal('').transform(() => undefined));
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration metadata
 */
exports.OAuthClientMetadataSchema = z
    .object({
    redirect_uris: z.array(exports.SafeUrlSchema),
    token_endpoint_auth_method: z.string().optional(),
    grant_types: z.array(z.string()).optional(),
    response_types: z.array(z.string()).optional(),
    client_name: z.string().optional(),
    client_uri: exports.SafeUrlSchema.optional(),
    logo_uri: exports.OptionalSafeUrlSchema,
    scope: z.string().optional(),
    contacts: z.array(z.string()).optional(),
    tos_uri: exports.OptionalSafeUrlSchema,
    policy_uri: z.string().optional(),
    jwks_uri: exports.SafeUrlSchema.optional(),
    jwks: z.any().optional(),
    software_id: z.string().optional(),
    software_version: z.string().optional(),
    software_statement: z.string().optional()
})
    .strip();
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration client information
 */
exports.OAuthClientInformationSchema = z
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
exports.OAuthClientInformationFullSchema = exports.OAuthClientMetadataSchema.merge(exports.OAuthClientInformationSchema);
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration error response
 */
exports.OAuthClientRegistrationErrorSchema = z
    .object({
    error: z.string(),
    error_description: z.string().optional()
})
    .strip();
/**
 * RFC 7009 OAuth 2.0 Token Revocation request
 */
exports.OAuthTokenRevocationRequestSchema = z
    .object({
    token: z.string(),
    token_type_hint: z.string().optional()
})
    .strip();
//# sourceMappingURL=auth.js.map
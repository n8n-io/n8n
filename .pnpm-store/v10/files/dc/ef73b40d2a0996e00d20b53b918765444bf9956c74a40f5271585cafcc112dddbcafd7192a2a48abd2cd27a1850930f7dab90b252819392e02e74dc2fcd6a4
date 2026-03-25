import * as z from 'zod/v4';
/**
 * Reusable URL validation that disallows javascript: scheme
 */
export declare const SafeUrlSchema: z.ZodURL;
/**
 * RFC 9728 OAuth Protected Resource Metadata
 */
export declare const OAuthProtectedResourceMetadataSchema: z.ZodObject<{
    resource: z.ZodString;
    authorization_servers: z.ZodOptional<z.ZodArray<z.ZodURL>>;
    jwks_uri: z.ZodOptional<z.ZodString>;
    scopes_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    bearer_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    resource_signing_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    resource_name: z.ZodOptional<z.ZodString>;
    resource_documentation: z.ZodOptional<z.ZodString>;
    resource_policy_uri: z.ZodOptional<z.ZodString>;
    resource_tos_uri: z.ZodOptional<z.ZodString>;
    tls_client_certificate_bound_access_tokens: z.ZodOptional<z.ZodBoolean>;
    authorization_details_types_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    dpop_signing_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    dpop_bound_access_tokens_required: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>;
/**
 * RFC 8414 OAuth 2.0 Authorization Server Metadata
 */
export declare const OAuthMetadataSchema: z.ZodObject<{
    issuer: z.ZodString;
    authorization_endpoint: z.ZodURL;
    token_endpoint: z.ZodURL;
    registration_endpoint: z.ZodOptional<z.ZodURL>;
    scopes_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    response_types_supported: z.ZodArray<z.ZodString>;
    response_modes_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    token_endpoint_auth_signing_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    service_documentation: z.ZodOptional<z.ZodURL>;
    revocation_endpoint: z.ZodOptional<z.ZodURL>;
    revocation_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    revocation_endpoint_auth_signing_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    introspection_endpoint: z.ZodOptional<z.ZodString>;
    introspection_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    introspection_endpoint_auth_signing_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    code_challenge_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    client_id_metadata_document_supported: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>;
/**
 * OpenID Connect Discovery 1.0 Provider Metadata
 * see: https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata
 */
export declare const OpenIdProviderMetadataSchema: z.ZodObject<{
    issuer: z.ZodString;
    authorization_endpoint: z.ZodURL;
    token_endpoint: z.ZodURL;
    userinfo_endpoint: z.ZodOptional<z.ZodURL>;
    jwks_uri: z.ZodURL;
    registration_endpoint: z.ZodOptional<z.ZodURL>;
    scopes_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    response_types_supported: z.ZodArray<z.ZodString>;
    response_modes_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    acr_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    subject_types_supported: z.ZodArray<z.ZodString>;
    id_token_signing_alg_values_supported: z.ZodArray<z.ZodString>;
    id_token_encryption_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    id_token_encryption_enc_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    userinfo_signing_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    userinfo_encryption_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    userinfo_encryption_enc_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    request_object_signing_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    request_object_encryption_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    request_object_encryption_enc_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    token_endpoint_auth_signing_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    display_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    claim_types_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    claims_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    service_documentation: z.ZodOptional<z.ZodString>;
    claims_locales_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    ui_locales_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    claims_parameter_supported: z.ZodOptional<z.ZodBoolean>;
    request_parameter_supported: z.ZodOptional<z.ZodBoolean>;
    request_uri_parameter_supported: z.ZodOptional<z.ZodBoolean>;
    require_request_uri_registration: z.ZodOptional<z.ZodBoolean>;
    op_policy_uri: z.ZodOptional<z.ZodURL>;
    op_tos_uri: z.ZodOptional<z.ZodURL>;
    client_id_metadata_document_supported: z.ZodOptional<z.ZodBoolean>;
}, z.core.$loose>;
/**
 * OpenID Connect Discovery metadata that may include OAuth 2.0 fields
 * This schema represents the real-world scenario where OIDC providers
 * return a mix of OpenID Connect and OAuth 2.0 metadata fields
 */
export declare const OpenIdProviderDiscoveryMetadataSchema: z.ZodObject<{
    code_challenge_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    issuer: z.ZodString;
    authorization_endpoint: z.ZodURL;
    token_endpoint: z.ZodURL;
    userinfo_endpoint: z.ZodOptional<z.ZodURL>;
    jwks_uri: z.ZodURL;
    registration_endpoint: z.ZodOptional<z.ZodURL>;
    scopes_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    response_types_supported: z.ZodArray<z.ZodString>;
    response_modes_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    grant_types_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    acr_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    subject_types_supported: z.ZodArray<z.ZodString>;
    id_token_signing_alg_values_supported: z.ZodArray<z.ZodString>;
    id_token_encryption_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    id_token_encryption_enc_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    userinfo_signing_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    userinfo_encryption_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    userinfo_encryption_enc_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    request_object_signing_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    request_object_encryption_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    request_object_encryption_enc_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    token_endpoint_auth_methods_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    token_endpoint_auth_signing_alg_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    display_values_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    claim_types_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    claims_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    service_documentation: z.ZodOptional<z.ZodString>;
    claims_locales_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    ui_locales_supported: z.ZodOptional<z.ZodArray<z.ZodString>>;
    claims_parameter_supported: z.ZodOptional<z.ZodBoolean>;
    request_parameter_supported: z.ZodOptional<z.ZodBoolean>;
    request_uri_parameter_supported: z.ZodOptional<z.ZodBoolean>;
    require_request_uri_registration: z.ZodOptional<z.ZodBoolean>;
    op_policy_uri: z.ZodOptional<z.ZodURL>;
    op_tos_uri: z.ZodOptional<z.ZodURL>;
    client_id_metadata_document_supported: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * OAuth 2.1 token response
 */
export declare const OAuthTokensSchema: z.ZodObject<{
    access_token: z.ZodString;
    id_token: z.ZodOptional<z.ZodString>;
    token_type: z.ZodString;
    expires_in: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    scope: z.ZodOptional<z.ZodString>;
    refresh_token: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * OAuth 2.1 error response
 */
export declare const OAuthErrorResponseSchema: z.ZodObject<{
    error: z.ZodString;
    error_description: z.ZodOptional<z.ZodString>;
    error_uri: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Optional version of SafeUrlSchema that allows empty string for retrocompatibility on tos_uri and logo_uri
 */
export declare const OptionalSafeUrlSchema: z.ZodUnion<[z.ZodOptional<z.ZodURL>, z.ZodPipe<z.ZodLiteral<"">, z.ZodTransform<undefined, "">>]>;
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration metadata
 */
export declare const OAuthClientMetadataSchema: z.ZodObject<{
    redirect_uris: z.ZodArray<z.ZodURL>;
    token_endpoint_auth_method: z.ZodOptional<z.ZodString>;
    grant_types: z.ZodOptional<z.ZodArray<z.ZodString>>;
    response_types: z.ZodOptional<z.ZodArray<z.ZodString>>;
    client_name: z.ZodOptional<z.ZodString>;
    client_uri: z.ZodOptional<z.ZodURL>;
    logo_uri: z.ZodUnion<[z.ZodOptional<z.ZodURL>, z.ZodPipe<z.ZodLiteral<"">, z.ZodTransform<undefined, "">>]>;
    scope: z.ZodOptional<z.ZodString>;
    contacts: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tos_uri: z.ZodUnion<[z.ZodOptional<z.ZodURL>, z.ZodPipe<z.ZodLiteral<"">, z.ZodTransform<undefined, "">>]>;
    policy_uri: z.ZodOptional<z.ZodString>;
    jwks_uri: z.ZodOptional<z.ZodURL>;
    jwks: z.ZodOptional<z.ZodAny>;
    software_id: z.ZodOptional<z.ZodString>;
    software_version: z.ZodOptional<z.ZodString>;
    software_statement: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration client information
 */
export declare const OAuthClientInformationSchema: z.ZodObject<{
    client_id: z.ZodString;
    client_secret: z.ZodOptional<z.ZodString>;
    client_id_issued_at: z.ZodOptional<z.ZodNumber>;
    client_secret_expires_at: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration full response (client information plus metadata)
 */
export declare const OAuthClientInformationFullSchema: z.ZodObject<{
    redirect_uris: z.ZodArray<z.ZodURL>;
    token_endpoint_auth_method: z.ZodOptional<z.ZodString>;
    grant_types: z.ZodOptional<z.ZodArray<z.ZodString>>;
    response_types: z.ZodOptional<z.ZodArray<z.ZodString>>;
    client_name: z.ZodOptional<z.ZodString>;
    client_uri: z.ZodOptional<z.ZodURL>;
    logo_uri: z.ZodUnion<[z.ZodOptional<z.ZodURL>, z.ZodPipe<z.ZodLiteral<"">, z.ZodTransform<undefined, "">>]>;
    scope: z.ZodOptional<z.ZodString>;
    contacts: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tos_uri: z.ZodUnion<[z.ZodOptional<z.ZodURL>, z.ZodPipe<z.ZodLiteral<"">, z.ZodTransform<undefined, "">>]>;
    policy_uri: z.ZodOptional<z.ZodString>;
    jwks_uri: z.ZodOptional<z.ZodURL>;
    jwks: z.ZodOptional<z.ZodAny>;
    software_id: z.ZodOptional<z.ZodString>;
    software_version: z.ZodOptional<z.ZodString>;
    software_statement: z.ZodOptional<z.ZodString>;
    client_id: z.ZodString;
    client_secret: z.ZodOptional<z.ZodString>;
    client_id_issued_at: z.ZodOptional<z.ZodNumber>;
    client_secret_expires_at: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration error response
 */
export declare const OAuthClientRegistrationErrorSchema: z.ZodObject<{
    error: z.ZodString;
    error_description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * RFC 7009 OAuth 2.0 Token Revocation request
 */
export declare const OAuthTokenRevocationRequestSchema: z.ZodObject<{
    token: z.ZodString;
    token_type_hint: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type OAuthMetadata = z.infer<typeof OAuthMetadataSchema>;
export type OpenIdProviderMetadata = z.infer<typeof OpenIdProviderMetadataSchema>;
export type OpenIdProviderDiscoveryMetadata = z.infer<typeof OpenIdProviderDiscoveryMetadataSchema>;
export type OAuthTokens = z.infer<typeof OAuthTokensSchema>;
export type OAuthErrorResponse = z.infer<typeof OAuthErrorResponseSchema>;
export type OAuthClientMetadata = z.infer<typeof OAuthClientMetadataSchema>;
export type OAuthClientInformation = z.infer<typeof OAuthClientInformationSchema>;
export type OAuthClientInformationFull = z.infer<typeof OAuthClientInformationFullSchema>;
export type OAuthClientInformationMixed = OAuthClientInformation | OAuthClientInformationFull;
export type OAuthClientRegistrationError = z.infer<typeof OAuthClientRegistrationErrorSchema>;
export type OAuthTokenRevocationRequest = z.infer<typeof OAuthTokenRevocationRequestSchema>;
export type OAuthProtectedResourceMetadata = z.infer<typeof OAuthProtectedResourceMetadataSchema>;
export type AuthorizationServerMetadata = OAuthMetadata | OpenIdProviderDiscoveryMetadata;
//# sourceMappingURL=auth.d.ts.map
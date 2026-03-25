import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateOAuth2TokenRequest, CreateOAuth2TokenResponse } from "../models/models_0";
import { SigninClientResolvedConfig } from "../SigninClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateOAuth2TokenCommand}.
 */
export interface CreateOAuth2TokenCommandInput extends CreateOAuth2TokenRequest {
}
/**
 * @public
 *
 * The output of {@link CreateOAuth2TokenCommand}.
 */
export interface CreateOAuth2TokenCommandOutput extends CreateOAuth2TokenResponse, __MetadataBearer {
}
declare const CreateOAuth2TokenCommand_base: {
    new (input: CreateOAuth2TokenCommandInput): import("@smithy/smithy-client").CommandImpl<CreateOAuth2TokenCommandInput, CreateOAuth2TokenCommandOutput, SigninClientResolvedConfig, CreateOAuth2TokenCommandInput, CreateOAuth2TokenCommandOutput>;
    new (input: CreateOAuth2TokenCommandInput): import("@smithy/smithy-client").CommandImpl<CreateOAuth2TokenCommandInput, CreateOAuth2TokenCommandOutput, SigninClientResolvedConfig, CreateOAuth2TokenCommandInput, CreateOAuth2TokenCommandOutput>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * CreateOAuth2Token API
 *
 * Path: /v1/token
 * Request Method: POST
 * Content-Type: application/json or application/x-www-form-urlencoded
 *
 * This API implements OAuth 2.0 flows for AWS Sign-In CLI clients, supporting both:
 * 1. Authorization code redemption (grant_type=authorization_code) - NOT idempotent
 * 2. Token refresh (grant_type=refresh_token) - Idempotent within token validity window
 *
 * The operation behavior is determined by the grant_type parameter in the request body:
 *
 * **Authorization Code Flow (NOT Idempotent):**
 * - JSON or form-encoded body with client_id, grant_type=authorization_code, code, redirect_uri, code_verifier
 * - Returns access_token, token_type, expires_in, refresh_token, and id_token
 * - Each authorization code can only be used ONCE for security (prevents replay attacks)
 *
 * **Token Refresh Flow (Idempotent):**
 * - JSON or form-encoded body with client_id, grant_type=refresh_token, refresh_token
 * - Returns access_token, token_type, expires_in, and refresh_token (no id_token)
 * - Multiple calls with same refresh_token return consistent results within validity window
 *
 * Authentication and authorization:
 * - Confidential clients: sigv4 signing required with signin:ExchangeToken permissions
 * - CLI clients (public): authn/authz skipped based on client_id & grant_type
 *
 * Note: This operation cannot be marked as @idempotent because it handles both idempotent
 * (token refresh) and non-idempotent (auth code redemption) flows in a single endpoint.
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SigninClient, CreateOAuth2TokenCommand } from "@aws-sdk/client-signin"; // ES Modules import
 * // const { SigninClient, CreateOAuth2TokenCommand } = require("@aws-sdk/client-signin"); // CommonJS import
 * // import type { SigninClientConfig } from "@aws-sdk/client-signin";
 * const config = {}; // type is SigninClientConfig
 * const client = new SigninClient(config);
 * const input = { // CreateOAuth2TokenRequest
 *   tokenInput: { // CreateOAuth2TokenRequestBody
 *     clientId: "STRING_VALUE", // required
 *     grantType: "STRING_VALUE", // required
 *     code: "STRING_VALUE",
 *     redirectUri: "STRING_VALUE",
 *     codeVerifier: "STRING_VALUE",
 *     refreshToken: "STRING_VALUE",
 *   },
 * };
 * const command = new CreateOAuth2TokenCommand(input);
 * const response = await client.send(command);
 * // { // CreateOAuth2TokenResponse
 * //   tokenOutput: { // CreateOAuth2TokenResponseBody
 * //     accessToken: { // AccessToken
 * //       accessKeyId: "STRING_VALUE", // required
 * //       secretAccessKey: "STRING_VALUE", // required
 * //       sessionToken: "STRING_VALUE", // required
 * //     },
 * //     tokenType: "STRING_VALUE", // required
 * //     expiresIn: Number("int"), // required
 * //     refreshToken: "STRING_VALUE", // required
 * //     idToken: "STRING_VALUE",
 * //   },
 * // };
 *
 * ```
 *
 * @param CreateOAuth2TokenCommandInput - {@link CreateOAuth2TokenCommandInput}
 * @returns {@link CreateOAuth2TokenCommandOutput}
 * @see {@link CreateOAuth2TokenCommandInput} for command's `input` shape.
 * @see {@link CreateOAuth2TokenCommandOutput} for command's `response` shape.
 * @see {@link SigninClientResolvedConfig | config} for SigninClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  Error thrown for access denied scenarios with flexible HTTP status mapping
 *
 * Runtime HTTP Status Code Mapping:
 * - HTTP 401 (Unauthorized): TOKEN_EXPIRED, AUTHCODE_EXPIRED
 * - HTTP 403 (Forbidden): USER_CREDENTIALS_CHANGED, INSUFFICIENT_PERMISSIONS
 *
 * The specific HTTP status code is determined at runtime based on the error enum value.
 * Consumers should use the error field to determine the specific access denial reason.
 *
 * @throws {@link InternalServerException} (server fault)
 *  Error thrown when an internal server error occurs
 *
 * HTTP Status Code: 500 Internal Server Error
 *
 * Used for unexpected server-side errors that prevent request processing.
 *
 * @throws {@link TooManyRequestsError} (client fault)
 *  Error thrown when rate limit is exceeded
 *
 * HTTP Status Code: 429 Too Many Requests
 *
 * Possible OAuth2ErrorCode values:
 * - INVALID_REQUEST: Rate limiting, too many requests, abuse prevention
 *
 * Possible causes:
 * - Too many token requests from the same client
 * - Rate limiting based on client_id or IP address
 * - Abuse prevention mechanisms triggered
 * - Service protection against excessive token generation
 *
 * @throws {@link ValidationException} (client fault)
 *  Error thrown when request validation fails
 *
 * HTTP Status Code: 400 Bad Request
 *
 * Used for request validation errors such as malformed parameters,
 * missing required fields, or invalid parameter values.
 *
 * @throws {@link SigninServiceException}
 * <p>Base exception class for all service exceptions from Signin service.</p>
 *
 *
 * @public
 */
export declare class CreateOAuth2TokenCommand extends CreateOAuth2TokenCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateOAuth2TokenRequest;
            output: CreateOAuth2TokenResponse;
        };
        sdk: {
            input: CreateOAuth2TokenCommandInput;
            output: CreateOAuth2TokenCommandOutput;
        };
    };
}

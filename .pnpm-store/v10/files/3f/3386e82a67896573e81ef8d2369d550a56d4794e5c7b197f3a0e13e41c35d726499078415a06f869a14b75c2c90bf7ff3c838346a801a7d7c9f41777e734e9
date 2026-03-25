import { AuthenticationScheme, HttpMethod } from "../utils/Constants.js";
import type { AzureCloudOptions } from "../config/ClientConfiguration.js";
import { StringDict } from "../utils/MsalTypes.js";
import { StoreInCache } from "./StoreInCache.js";
import { ShrOptions } from "../crypto/SignedHttpRequest.js";
/**
 * BaseAuthRequest
 * - authority               - URL of the authority, the security token service (STS) from which MSAL will acquire tokens. Defaults to https://login.microsoftonline.com/common. If using the same authority for all request, authority should set on client application object and not request, to avoid resolving authority endpoints multiple times.
 * - correlationId           - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - scopes                  - Array of scopes the application is requesting access to.
 * - authenticationScheme    - The type of token retrieved. Defaults to "Bearer". Can also be type "pop" or "SSH".
 * - claims                  - A stringified claims request which will be added to all /authorize and /token calls
 * - shrClaims               - A stringified claims object which will be added to a Signed HTTP Request
 * - shrNonce                - A server-generated timestamp that has been encrypted and base64URL encoded, which will be added to a Signed HTTP Request.
 * - shrOptions              - An object containing options for the Signed HTTP Request
 * - resourceRequestMethod   - HTTP Request type used to request data from the resource (i.e. "GET", "POST", etc.).  Used for proof-of-possession flows.
 * - resourceRequestUri      - URI that token will be used for. Used for proof-of-possession flows.
 * - sshJwk                  - A stringified JSON Web Key representing a public key that can be signed by an SSH certificate.
 * - sshKid                  - Key ID that uniquely identifies the SSH public key mentioned above.
 * - azureCloudOptions       - Convenience string enums for users to provide public/sovereign cloud ids
 * - requestedClaimsHash     - SHA 256 hash string of the requested claims string, used as part of an access token cache key so tokens can be filtered by requested claims
 * - tokenQueryParameters    - String to string map of custom query parameters added to the /token call
 * - tokenBodyParameters     - String to string map of custom parameters added to the body of the /token call
 * - storeInCache            - Object containing boolean values indicating whether to store tokens in the cache or not (default is true)
 * - scenarioId              - Scenario id to track custom user prompts
 * - popKid                  - Key ID to identify the public key for PoP token request
 * - embeddedClientId        - Embedded client id. When specified, broker client id (brk_client_id) and redirect uri (brk_redirect_uri) params are set with values from the config, overriding the corresponding extra parameters, if present.
 * - httpMethod              - HTTP method to use for the /authorize request. Defaults to GET, but can be set to POST if the request requires body parameters
 * - authorizePostBodyParameters - String to string map of custom parameters added to the body of the /authorize call when httpMethod is set to POST
 */
export type BaseAuthRequest = {
    authority: string;
    correlationId: string;
    scopes: Array<string>;
    authenticationScheme?: AuthenticationScheme;
    claims?: string;
    shrClaims?: string;
    shrNonce?: string;
    shrOptions?: ShrOptions;
    resourceRequestMethod?: string;
    resourceRequestUri?: string;
    sshJwk?: string;
    sshKid?: string;
    azureCloudOptions?: AzureCloudOptions;
    requestedClaimsHash?: string;
    maxAge?: number;
    tokenBodyParameters?: StringDict;
    tokenQueryParameters?: StringDict;
    storeInCache?: StoreInCache;
    scenarioId?: string;
    popKid?: string;
    embeddedClientId?: string;
    httpMethod?: HttpMethod;
    authorizePostBodyParameters?: StringDict;
};
//# sourceMappingURL=BaseAuthRequest.d.ts.map
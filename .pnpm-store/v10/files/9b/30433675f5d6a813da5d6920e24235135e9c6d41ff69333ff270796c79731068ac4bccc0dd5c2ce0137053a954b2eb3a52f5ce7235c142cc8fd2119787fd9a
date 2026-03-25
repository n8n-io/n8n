import { BaseAuthRequest } from "./BaseAuthRequest.js";
import { AzureRegion } from "../authority/AzureRegion.js";
import { ClientAssertion } from "../account/ClientCredentials.js";
/**
 * CommonClientCredentialRequest
 * - scopes                             - Array of scopes the application is requesting access to.
 * - authority                          - URL of the authority, the security token service (STS) from which MSAL will acquire tokens.
 * - correlationId                      - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - skipCache                          - Skip token cache lookup and force request to authority to get a a new token. Defaults to false.
 * - preferredAzureRegionOptions        - Options of the user's preferred azure region
 * - tokenQueryParameters               - String to string map of custom query parameters added to the /token call
 */
export type CommonClientCredentialRequest = BaseAuthRequest & {
    skipCache?: boolean;
    azureRegion?: AzureRegion;
    clientAssertion?: ClientAssertion;
};
//# sourceMappingURL=CommonClientCredentialRequest.d.ts.map
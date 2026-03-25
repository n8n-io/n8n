import { CommonClientCredentialRequest } from "@azure/msal-common/node";
import { ManagedIdentityRequestParams } from "./ManagedIdentityRequestParams.js";
/**
 * ManagedIdentityRequest
 * - clientCapabilities      - an array of capabilities to be added to all network requests as part of the `xms_cc` claim
 * - revokedTokenSha256Hash  - a SHA256 hash of the token that was revoked. The managed identity will revoke the token based on the SHA256 hash of the token, not the token itself. This is to prevent the token from being leaked in transit.
 */
export type ManagedIdentityRequest = ManagedIdentityRequestParams & CommonClientCredentialRequest & {
    clientCapabilities?: Array<string>;
    revokedTokenSha256Hash?: string;
};
//# sourceMappingURL=ManagedIdentityRequest.d.ts.map
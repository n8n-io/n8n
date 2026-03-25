import type { AccessToken } from "@azure/core-auth";
import type { IdentityClient } from "../../client/identityClient.js";
/**
 * @internal
 */
export interface MSIConfiguration {
    retryConfig: {
        maxRetries: number;
        startDelayInMs: number;
        intervalIncrement: number;
    };
    identityClient: IdentityClient;
    scopes: string | string[];
    clientId?: string;
    resourceId?: string;
}
/**
 * @internal
 * Represents an access token for {@link ManagedIdentity} for internal usage,
 * with an expiration time and the time in which token should refresh.
 */
export declare interface MSIToken extends AccessToken {
}
//# sourceMappingURL=models.d.ts.map
import type { GetTokenOptions } from "@azure/core-auth";
import type { IdentityClient } from "../../client/identityClient.js";
/**
 * Defines how to determine whether the Azure IMDS MSI is available.
 *
 * Actually getting the token once we determine IMDS is available is handled by MSAL.
 */
export declare const imdsMsi: {
    name: string;
    isAvailable(options: {
        scopes: string | string[];
        identityClient?: IdentityClient;
        clientId?: string;
        resourceId?: string;
        getTokenOptions?: GetTokenOptions;
    }): Promise<boolean>;
};
//# sourceMappingURL=imdsMsi.d.ts.map
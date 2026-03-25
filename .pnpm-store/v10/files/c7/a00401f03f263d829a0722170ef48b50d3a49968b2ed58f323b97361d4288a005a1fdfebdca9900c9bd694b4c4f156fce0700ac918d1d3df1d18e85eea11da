import type { AccessToken, GetTokenOptions } from "@azure/core-auth";
import type { MSIConfiguration } from "./models.js";
/**
 * Defines how to determine whether the token exchange MSI is available, and also how to retrieve a token from the token exchange MSI.
 *
 * Token exchange MSI (used by AKS) is the only MSI implementation handled entirely by Azure Identity.
 * The rest have been migrated to MSAL.
 */
export declare const tokenExchangeMsi: {
    name: string;
    isAvailable(clientId?: string): Promise<boolean>;
    getToken(configuration: MSIConfiguration, getTokenOptions?: GetTokenOptions): Promise<AccessToken | null>;
};
//# sourceMappingURL=tokenExchangeMsi.d.ts.map
import type { CommonClientOptions } from "@azure/core-client";
import type { LogPolicyOptions } from "@azure/core-rest-pipeline";
/**
 * Provides options to configure how the Identity library makes authentication
 * requests to Microsoft Entra ID.
 */
export interface TokenCredentialOptions extends CommonClientOptions {
    /**
     * The authority host to use for authentication requests.
     * Possible values are available through {@link AzureAuthorityHosts}.
     * The default is "https://login.microsoftonline.com".
     */
    authorityHost?: string;
    /**
     * Allows users to configure settings for logging policy options, allow logging account information and personally identifiable information for customer support.
     */
    loggingOptions?: LogPolicyOptions & {
        /**
         * Allows logging account information once the authentication flow succeeds.
         */
        allowLoggingAccountIdentifiers?: boolean;
        /**
         * Allows logging personally identifiable information for customer support.
         */
        enableUnsafeSupportLogging?: boolean;
    };
}
//# sourceMappingURL=tokenCredentialOptions.d.ts.map
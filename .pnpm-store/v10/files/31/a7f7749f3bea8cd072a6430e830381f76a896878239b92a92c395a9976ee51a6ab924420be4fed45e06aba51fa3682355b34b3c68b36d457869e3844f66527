import type { TokenCredential } from "@azure/core-auth";
import type { AzureLogger } from "@azure/logger";
import type { PipelinePolicy } from "../pipeline.js";
/**
 * The programmatic identifier of the auxiliaryAuthenticationHeaderPolicy.
 */
export declare const auxiliaryAuthenticationHeaderPolicyName = "auxiliaryAuthenticationHeaderPolicy";
/**
 * Options to configure the auxiliaryAuthenticationHeaderPolicy
 */
export interface AuxiliaryAuthenticationHeaderPolicyOptions {
    /**
     * TokenCredential list used to get token from auxiliary tenants and
     * one credential for each tenant the client may need to access
     */
    credentials?: TokenCredential[];
    /**
     * Scopes depend on the cloud your application runs in
     */
    scopes: string | string[];
    /**
     * A logger can be sent for debugging purposes.
     */
    logger?: AzureLogger;
}
/**
 * A policy for external tokens to `x-ms-authorization-auxiliary` header.
 * This header will be used when creating a cross-tenant application we may need to handle authentication requests
 * for resources that are in different tenants.
 * You could see [ARM docs](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/authenticate-multi-tenant) for a rundown of how this feature works
 */
export declare function auxiliaryAuthenticationHeaderPolicy(options: AuxiliaryAuthenticationHeaderPolicyOptions): PipelinePolicy;
//# sourceMappingURL=auxiliaryAuthenticationHeaderPolicy.d.ts.map
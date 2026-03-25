import type { GetTokenOptions } from "@azure/core-auth";
import type { CredentialLogger } from "./logging.js";
/**
 * Of getToken contains a tenantId, this functions allows picking this tenantId as the appropriate for authentication,
 * unless multitenant authentication has been disabled through the AZURE_IDENTITY_DISABLE_MULTITENANTAUTH (on Node.js),
 * or unless the original tenant Id is `adfs`.
 * @internal
 */
export declare function processMultiTenantRequest(tenantId?: string, getTokenOptions?: GetTokenOptions, additionallyAllowedTenantIds?: string[], logger?: CredentialLogger): string | undefined;
//# sourceMappingURL=processMultiTenantRequest.d.ts.map
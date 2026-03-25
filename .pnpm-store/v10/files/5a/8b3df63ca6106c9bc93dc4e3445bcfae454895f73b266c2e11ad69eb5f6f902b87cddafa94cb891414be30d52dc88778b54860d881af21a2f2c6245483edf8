// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
function createConfigurationErrorMessage(tenantId) {
    return `The current credential is not configured to acquire tokens for tenant ${tenantId}. To enable acquiring tokens for this tenant add it to the AdditionallyAllowedTenants on the credential options, or add "*" to AdditionallyAllowedTenants to allow acquiring tokens for any tenant.`;
}
/**
 * Of getToken contains a tenantId, this functions allows picking this tenantId as the appropriate for authentication,
 * unless multitenant authentication has been disabled through the AZURE_IDENTITY_DISABLE_MULTITENANTAUTH (on Node.js),
 * or unless the original tenant Id is `adfs`.
 * @internal
 */
export function processMultiTenantRequest(tenantId, getTokenOptions, additionallyAllowedTenantIds = []) {
    let resolvedTenantId;
    if (tenantId === "adfs") {
        resolvedTenantId = tenantId;
    }
    else {
        resolvedTenantId = getTokenOptions?.tenantId ?? tenantId;
    }
    if (tenantId &&
        resolvedTenantId !== tenantId &&
        !additionallyAllowedTenantIds.includes("*") &&
        !additionallyAllowedTenantIds.some((t) => t.localeCompare(resolvedTenantId) === 0)) {
        throw new Error(createConfigurationErrorMessage(tenantId));
    }
    return resolvedTenantId;
}
//# sourceMappingURL=processMultiTenantRequest-browser.mjs.map
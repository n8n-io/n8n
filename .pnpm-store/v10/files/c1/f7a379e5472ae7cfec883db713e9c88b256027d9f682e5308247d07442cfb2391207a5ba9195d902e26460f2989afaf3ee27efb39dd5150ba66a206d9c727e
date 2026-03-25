"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMultiTenantRequest = processMultiTenantRequest;
const errors_js_1 = require("../errors.js");
function createConfigurationErrorMessage(tenantId) {
    return `The current credential is not configured to acquire tokens for tenant ${tenantId}. To enable acquiring tokens for this tenant add it to the AdditionallyAllowedTenants on the credential options, or add "*" to AdditionallyAllowedTenants to allow acquiring tokens for any tenant.`;
}
/**
 * Of getToken contains a tenantId, this functions allows picking this tenantId as the appropriate for authentication,
 * unless multitenant authentication has been disabled through the AZURE_IDENTITY_DISABLE_MULTITENANTAUTH (on Node.js),
 * or unless the original tenant Id is `adfs`.
 * @internal
 */
function processMultiTenantRequest(tenantId, getTokenOptions, additionallyAllowedTenantIds = [], logger) {
    let resolvedTenantId;
    if (process.env.AZURE_IDENTITY_DISABLE_MULTITENANTAUTH) {
        resolvedTenantId = tenantId;
    }
    else if (tenantId === "adfs") {
        resolvedTenantId = tenantId;
    }
    else {
        resolvedTenantId = getTokenOptions?.tenantId ?? tenantId;
    }
    if (tenantId &&
        resolvedTenantId !== tenantId &&
        !additionallyAllowedTenantIds.includes("*") &&
        !additionallyAllowedTenantIds.some((t) => t.localeCompare(resolvedTenantId) === 0)) {
        const message = createConfigurationErrorMessage(resolvedTenantId);
        logger?.info(message);
        throw new errors_js_1.CredentialUnavailableError(message);
    }
    return resolvedTenantId;
}
//# sourceMappingURL=processMultiTenantRequest.js.map
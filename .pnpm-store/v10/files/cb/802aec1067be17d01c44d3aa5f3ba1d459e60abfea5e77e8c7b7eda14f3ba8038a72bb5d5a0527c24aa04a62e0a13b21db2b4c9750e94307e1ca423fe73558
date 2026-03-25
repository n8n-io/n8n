// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { ALL_TENANTS, DeveloperSignOnClientId } from "../constants.js";
import { formatError } from "./logging.js";
export { processMultiTenantRequest } from "./processMultiTenantRequest.js";
/**
 * @internal
 */
export function checkTenantId(logger, tenantId) {
    if (!tenantId.match(/^[0-9a-zA-Z-.]+$/)) {
        const error = new Error("Invalid tenant id provided. You can locate your tenant id by following the instructions listed here: https://learn.microsoft.com/partner-center/find-ids-and-domain-names.");
        logger.info(formatError("", error));
        throw error;
    }
}
/**
 * @internal
 */
export function resolveTenantId(logger, tenantId, clientId) {
    if (tenantId) {
        checkTenantId(logger, tenantId);
        return tenantId;
    }
    if (!clientId) {
        clientId = DeveloperSignOnClientId;
    }
    if (clientId !== DeveloperSignOnClientId) {
        return "common";
    }
    return "organizations";
}
/**
 * @internal
 */
export function resolveAdditionallyAllowedTenantIds(additionallyAllowedTenants) {
    if (!additionallyAllowedTenants || additionallyAllowedTenants.length === 0) {
        return [];
    }
    if (additionallyAllowedTenants.includes("*")) {
        return ALL_TENANTS;
    }
    return additionallyAllowedTenants;
}
//# sourceMappingURL=tenantIdUtils.js.map
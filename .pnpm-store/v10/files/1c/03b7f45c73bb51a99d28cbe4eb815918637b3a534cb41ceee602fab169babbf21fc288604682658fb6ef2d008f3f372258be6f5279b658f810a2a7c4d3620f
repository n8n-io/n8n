"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMultiTenantRequest = void 0;
exports.checkTenantId = checkTenantId;
exports.resolveTenantId = resolveTenantId;
exports.resolveAdditionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds;
const constants_js_1 = require("../constants.js");
const logging_js_1 = require("./logging.js");
var processMultiTenantRequest_js_1 = require("./processMultiTenantRequest.js");
Object.defineProperty(exports, "processMultiTenantRequest", { enumerable: true, get: function () { return processMultiTenantRequest_js_1.processMultiTenantRequest; } });
/**
 * @internal
 */
function checkTenantId(logger, tenantId) {
    if (!tenantId.match(/^[0-9a-zA-Z-.]+$/)) {
        const error = new Error("Invalid tenant id provided. You can locate your tenant id by following the instructions listed here: https://learn.microsoft.com/partner-center/find-ids-and-domain-names.");
        logger.info((0, logging_js_1.formatError)("", error));
        throw error;
    }
}
/**
 * @internal
 */
function resolveTenantId(logger, tenantId, clientId) {
    if (tenantId) {
        checkTenantId(logger, tenantId);
        return tenantId;
    }
    if (!clientId) {
        clientId = constants_js_1.DeveloperSignOnClientId;
    }
    if (clientId !== constants_js_1.DeveloperSignOnClientId) {
        return "common";
    }
    return "organizations";
}
/**
 * @internal
 */
function resolveAdditionallyAllowedTenantIds(additionallyAllowedTenants) {
    if (!additionallyAllowedTenants || additionallyAllowedTenants.length === 0) {
        return [];
    }
    if (additionallyAllowedTenants.includes("*")) {
        return constants_js_1.ALL_TENANTS;
    }
    return additionallyAllowedTenants;
}
//# sourceMappingURL=tenantIdUtils.js.map
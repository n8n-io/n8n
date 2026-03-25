"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserAgentHeaderName = getUserAgentHeaderName;
exports.getUserAgentValue = getUserAgentValue;
const userAgentPlatform_js_1 = require("./userAgentPlatform.js");
const constants_js_1 = require("../constants.js");
function getUserAgentString(telemetryInfo) {
    const parts = [];
    for (const [key, value] of telemetryInfo) {
        const token = value ? `${key}/${value}` : key;
        parts.push(token);
    }
    return parts.join(" ");
}
/**
 * @internal
 */
function getUserAgentHeaderName() {
    return (0, userAgentPlatform_js_1.getHeaderName)();
}
/**
 * @internal
 */
async function getUserAgentValue(prefix) {
    const runtimeInfo = new Map();
    runtimeInfo.set("ts-http-runtime", constants_js_1.SDK_VERSION);
    await (0, userAgentPlatform_js_1.setPlatformSpecificData)(runtimeInfo);
    const defaultAgent = getUserAgentString(runtimeInfo);
    const userAgentValue = prefix ? `${prefix} ${defaultAgent}` : defaultAgent;
    return userAgentValue;
}
//# sourceMappingURL=userAgent.js.map
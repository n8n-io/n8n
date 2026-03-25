// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { getHeaderName, setPlatformSpecificData } from "./userAgentPlatform.js";
import { SDK_VERSION } from "../constants.js";
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
export function getUserAgentHeaderName() {
    return getHeaderName();
}
/**
 * @internal
 */
export async function getUserAgentValue(prefix) {
    const runtimeInfo = new Map();
    runtimeInfo.set("ts-http-runtime", SDK_VERSION);
    await setPlatformSpecificData(runtimeInfo);
    const defaultAgent = getUserAgentString(runtimeInfo);
    const userAgentValue = prefix ? `${prefix} ${defaultAgent}` : defaultAgent;
    return userAgentValue;
}
//# sourceMappingURL=userAgent.js.map
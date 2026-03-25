// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import os from "node:os";
import process from "node:process";
/**
 * @internal
 */
export function getHeaderName() {
    return "User-Agent";
}
/**
 * @internal
 */
export async function setPlatformSpecificData(map) {
    if (process && process.versions) {
        const osInfo = `${os.type()} ${os.release()}; ${os.arch()}`;
        const versions = process.versions;
        if (versions.bun) {
            map.set("Bun", `${versions.bun} (${osInfo})`);
        }
        else if (versions.deno) {
            map.set("Deno", `${versions.deno} (${osInfo})`);
        }
        else if (versions.node) {
            map.set("Node", `${versions.node} (${osInfo})`);
        }
    }
}
//# sourceMappingURL=userAgentPlatform.js.map
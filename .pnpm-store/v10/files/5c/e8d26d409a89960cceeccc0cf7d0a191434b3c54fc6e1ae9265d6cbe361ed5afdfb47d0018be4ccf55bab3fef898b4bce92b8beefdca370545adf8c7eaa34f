"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHeaderName = getHeaderName;
exports.setPlatformSpecificData = setPlatformSpecificData;
const tslib_1 = require("tslib");
const node_os_1 = tslib_1.__importDefault(require("node:os"));
const node_process_1 = tslib_1.__importDefault(require("node:process"));
/**
 * @internal
 */
function getHeaderName() {
    return "User-Agent";
}
/**
 * @internal
 */
async function setPlatformSpecificData(map) {
    if (node_process_1.default && node_process_1.default.versions) {
        const osInfo = `${node_os_1.default.type()} ${node_os_1.default.release()}; ${node_os_1.default.arch()}`;
        const versions = node_process_1.default.versions;
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
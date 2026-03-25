// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as os from "os";
/**
 * @internal
 */
export function getHeaderName() {
    return "User-Agent";
}
/**
 * @internal
 */
export function setPlatformSpecificData(map) {
    map.set("Node", process.version);
    map.set("OS", `(${os.arch()}-${os.type()}-${os.release()})`);
}
//# sourceMappingURL=userAgentPlatform.js.map
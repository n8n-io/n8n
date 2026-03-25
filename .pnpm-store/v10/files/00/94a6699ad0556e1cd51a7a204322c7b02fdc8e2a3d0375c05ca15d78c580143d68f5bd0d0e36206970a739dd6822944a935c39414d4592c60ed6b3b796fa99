// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/*
 * NOTE: When moving this file, please update "browser" section in package.json.
 */
/**
 * @internal
 */
export function getHeaderName() {
    return "x-ms-useragent";
}
/**
 * @internal
 */
export function setPlatformSpecificData(map) {
    const navigator = self.navigator;
    map.set("OS", (navigator.oscpu || navigator.platform).replace(" ", ""));
}
//# sourceMappingURL=userAgentPlatform.browser.js.map
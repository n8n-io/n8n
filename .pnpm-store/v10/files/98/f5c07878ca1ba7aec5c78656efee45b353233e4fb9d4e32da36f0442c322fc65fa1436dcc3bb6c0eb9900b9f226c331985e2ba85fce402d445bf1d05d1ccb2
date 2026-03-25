// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/*
 * NOTE: When moving this file, please update "react-native" section in package.json.
 */
const { Platform } = require("react-native"); // eslint-disable-line import/no-extraneous-dependencies, @typescript-eslint/no-require-imports
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
    const { major, minor, patch } = Platform.constants.reactNativeVersion;
    map.set("react-native", `${major}.${minor}.${patch}`);
    map.set("OS", `${Platform.OS}-${Platform.Version}`);
}
//# sourceMappingURL=userAgentPlatform.native.js.map
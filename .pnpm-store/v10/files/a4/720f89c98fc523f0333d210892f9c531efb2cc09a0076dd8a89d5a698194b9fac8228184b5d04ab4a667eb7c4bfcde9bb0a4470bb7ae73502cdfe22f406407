// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { Platform } from "react-native";
/**
 * @internal
 */
export function getHeaderName() {
    return "x-ms-useragent";
}
/**
 * @internal
 */
export async function setPlatformSpecificData(map) {
    if (Platform.constants?.reactNativeVersion) {
        const { major, minor, patch } = Platform.constants.reactNativeVersion;
        map.set("react-native", `${major}.${minor}.${patch} (${Platform.OS} ${Platform.Version})`);
    }
}
//# sourceMappingURL=userAgentPlatform-react-native.mjs.map
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * @internal
 */
export function getHeaderName() {
    return "x-ms-useragent";
}
function getBrowserInfo(userAgent) {
    const browserRegexes = [
        { name: "Firefox", regex: /Firefox\/([\d.]+)/ },
        { name: "Safari", regex: /Version\/([\d.]+).*Safari/ },
    ];
    for (const browser of browserRegexes) {
        const match = userAgent.match(browser.regex);
        if (match) {
            return { brand: browser.name, version: match[1] };
        }
    }
    return undefined;
}
function getBrandVersionString(brands) {
    const brandOrder = ["Google Chrome", "Microsoft Edge", "Opera", "Brave", "Chromium"];
    for (const brand of brandOrder) {
        const foundBrand = brands.find((b) => b.brand === brand);
        if (foundBrand) {
            return foundBrand;
        }
    }
    return undefined;
}
/**
 * @internal
 */
export async function setPlatformSpecificData(map) {
    const localNavigator = globalThis.navigator;
    let osInfo = "unknown";
    if (localNavigator?.userAgentData) {
        const entropyValues = await localNavigator.userAgentData.getHighEntropyValues([
            "architecture",
            "platformVersion",
        ]);
        osInfo = `${entropyValues.platform} ${entropyValues.platformVersion}; ${entropyValues.architecture}`;
        // Get the brand and version
        const brand = getBrandVersionString(localNavigator.userAgentData.brands);
        if (brand) {
            map.set(brand.brand, `${brand.version} (${osInfo})`);
        }
    }
    else if (localNavigator?.platform) {
        osInfo = localNavigator.platform;
        const brand = getBrowserInfo(localNavigator.userAgent);
        if (brand) {
            map.set(brand.brand, `${brand.version} (${osInfo})`);
        }
    }
    else if (typeof globalThis.EdgeRuntime === "string") {
        map.set("EdgeRuntime", `${globalThis.EdgeRuntime} (${osInfo})`);
    }
}
//# sourceMappingURL=userAgentPlatform-browser.mjs.map
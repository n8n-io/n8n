"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultUserAgent = exports.fallback = exports.createDefaultUserAgentProvider = exports.createUserAgentStringParsingProvider = void 0;
var createUserAgentStringParsingProvider_1 = require("./createUserAgentStringParsingProvider");
Object.defineProperty(exports, "createUserAgentStringParsingProvider", { enumerable: true, get: function () { return createUserAgentStringParsingProvider_1.createUserAgentStringParsingProvider; } });
const createDefaultUserAgentProvider = ({ serviceId, clientVersion }) => async (config) => {
    const navigator = typeof window !== "undefined" ? window.navigator : undefined;
    const uaString = navigator?.userAgent ?? "";
    const osName = navigator?.userAgentData?.platform ?? exports.fallback.os(uaString) ?? "other";
    const osVersion = undefined;
    const brands = navigator?.userAgentData?.brands ?? [];
    const brand = brands[brands.length - 1];
    const browserName = brand?.brand ?? exports.fallback.browser(uaString) ?? "unknown";
    const browserVersion = brand?.version ?? "unknown";
    const sections = [
        ["aws-sdk-js", clientVersion],
        ["ua", "2.1"],
        [`os/${osName}`, osVersion],
        ["lang/js"],
        ["md/browser", `${browserName}_${browserVersion}`],
    ];
    if (serviceId) {
        sections.push([`api/${serviceId}`, clientVersion]);
    }
    const appId = await config?.userAgentAppId?.();
    if (appId) {
        sections.push([`app/${appId}`]);
    }
    return sections;
};
exports.createDefaultUserAgentProvider = createDefaultUserAgentProvider;
exports.fallback = {
    os(ua) {
        if (/iPhone|iPad|iPod/.test(ua))
            return "iOS";
        if (/Macintosh|Mac OS X/.test(ua))
            return "macOS";
        if (/Windows NT/.test(ua))
            return "Windows";
        if (/Android/.test(ua))
            return "Android";
        if (/Linux/.test(ua))
            return "Linux";
        return undefined;
    },
    browser(ua) {
        if (/EdgiOS|EdgA|Edg\//.test(ua))
            return "Microsoft Edge";
        if (/Firefox\//.test(ua))
            return "Firefox";
        if (/Chrome\//.test(ua))
            return "Chrome";
        if (/Safari\//.test(ua))
            return "Safari";
        return undefined;
    },
};
exports.defaultUserAgent = exports.createDefaultUserAgentProvider;

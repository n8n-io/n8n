export const createUserAgentStringParsingProvider = ({ serviceId, clientVersion }) => async (config) => {
    const module = await import("bowser");
    const parse = module.parse ?? module.default.parse ?? (() => "");
    const parsedUA = typeof window !== "undefined" && window?.navigator?.userAgent ? parse(window.navigator.userAgent) : undefined;
    const sections = [
        ["aws-sdk-js", clientVersion],
        ["ua", "2.1"],
        [`os/${parsedUA?.os?.name || "other"}`, parsedUA?.os?.version],
        ["lang/js"],
        ["md/browser", `${parsedUA?.browser?.name ?? "unknown"}_${parsedUA?.browser?.version ?? "unknown"}`],
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

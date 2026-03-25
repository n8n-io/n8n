export const createDefaultUserAgentProvider = ({ serviceId, clientVersion }) => async (config) => {
    const sections = [
        ["aws-sdk-js", clientVersion],
        ["ua", "2.1"],
        ["os/other"],
        ["lang/js"],
        ["md/rn"],
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
export const defaultUserAgent = createDefaultUserAgentProvider;

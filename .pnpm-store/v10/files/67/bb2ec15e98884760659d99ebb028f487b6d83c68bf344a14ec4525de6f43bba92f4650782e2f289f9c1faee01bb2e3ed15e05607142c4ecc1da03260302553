import { normalizeProvider } from "@smithy/util-middleware";
export const resolveCustomEndpointsConfig = (input) => {
    const { tls, endpoint, urlParser, useDualstackEndpoint } = input;
    return Object.assign(input, {
        tls: tls ?? true,
        endpoint: normalizeProvider(typeof endpoint === "string" ? urlParser(endpoint) : endpoint),
        isCustomEndpoint: true,
        useDualstackEndpoint: normalizeProvider(useDualstackEndpoint ?? false),
    });
};

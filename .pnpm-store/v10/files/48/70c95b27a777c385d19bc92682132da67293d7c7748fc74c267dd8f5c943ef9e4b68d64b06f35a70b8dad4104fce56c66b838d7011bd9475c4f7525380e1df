import { normalizeProvider } from "@smithy/core";
export const DEFAULT_UA_APP_ID = undefined;
function isValidUserAgentAppId(appId) {
    if (appId === undefined) {
        return true;
    }
    return typeof appId === "string" && appId.length <= 50;
}
export function resolveUserAgentConfig(input) {
    const normalizedAppIdProvider = normalizeProvider(input.userAgentAppId ?? DEFAULT_UA_APP_ID);
    const { customUserAgent } = input;
    return Object.assign(input, {
        customUserAgent: typeof customUserAgent === "string" ? [[customUserAgent]] : customUserAgent,
        userAgentAppId: async () => {
            const appId = await normalizedAppIdProvider();
            if (!isValidUserAgentAppId(appId)) {
                const logger = input.logger?.constructor?.name === "NoOpLogger" || !input.logger ? console : input.logger;
                if (typeof appId !== "string") {
                    logger?.warn("userAgentAppId must be a string or undefined.");
                }
                else if (appId.length > 50) {
                    logger?.warn("The provided userAgentAppId exceeds the maximum length of 50 characters.");
                }
            }
            return appId;
        },
    });
}

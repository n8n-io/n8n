import { memoize } from "@smithy/property-provider";
import { DEFAULTS_MODE_OPTIONS } from "./constants";
export const resolveDefaultsModeConfig = ({ defaultsMode, } = {}) => memoize(async () => {
    const mode = typeof defaultsMode === "function" ? await defaultsMode() : defaultsMode;
    switch (mode?.toLowerCase()) {
        case "auto":
            return Promise.resolve(useMobileConfiguration() ? "mobile" : "standard");
        case "mobile":
        case "in-region":
        case "cross-region":
        case "standard":
        case "legacy":
            return Promise.resolve(mode?.toLocaleLowerCase());
        case undefined:
            return Promise.resolve("legacy");
        default:
            throw new Error(`Invalid parameter for "defaultsMode", expect ${DEFAULTS_MODE_OPTIONS.join(", ")}, got ${mode}`);
    }
});
const useMobileConfiguration = () => {
    const navigator = window?.navigator;
    if (navigator?.connection) {
        const { effectiveType, rtt, downlink } = navigator?.connection;
        const slow = (typeof effectiveType === "string" && effectiveType !== "4g") || Number(rtt) > 100 || Number(downlink) < 10;
        if (slow) {
            return true;
        }
    }
    return (navigator?.userAgentData?.mobile || (typeof navigator?.maxTouchPoints === "number" && navigator?.maxTouchPoints > 1));
};

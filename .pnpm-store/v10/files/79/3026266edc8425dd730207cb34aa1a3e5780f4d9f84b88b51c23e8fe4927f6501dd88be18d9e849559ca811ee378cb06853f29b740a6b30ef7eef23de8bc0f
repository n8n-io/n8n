import { platform, release } from "os";
import { env, versions } from "process";
import { isCrtAvailable } from "./is-crt-available";
export { crtAvailability } from "./crt-availability";
export const createDefaultUserAgentProvider = ({ serviceId, clientVersion }) => {
    return async (config) => {
        const sections = [
            ["aws-sdk-js", clientVersion],
            ["ua", "2.1"],
            [`os/${platform()}`, release()],
            ["lang/js"],
            ["md/nodejs", `${versions.node}`],
        ];
        const crtAvailable = isCrtAvailable();
        if (crtAvailable) {
            sections.push(crtAvailable);
        }
        if (serviceId) {
            sections.push([`api/${serviceId}`, clientVersion]);
        }
        if (env.AWS_EXECUTION_ENV) {
            sections.push([`exec-env/${env.AWS_EXECUTION_ENV}`]);
        }
        const appId = await config?.userAgentAppId?.();
        const resolvedUserAgent = appId ? [...sections, [`app/${appId}`]] : [...sections];
        return resolvedUserAgent;
    };
};
export const defaultUserAgent = createDefaultUserAgentProvider;

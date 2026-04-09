import { platform, release } from "node:os";
import { env } from "node:process";
import { getRuntimeUserAgentPair } from "./getRuntimeUserAgentPair";
import { getTypeScriptUserAgentPair } from "./getTypeScriptUserAgentPair";
import { isCrtAvailable } from "./is-crt-available";
export { crtAvailability } from "./crt-availability";
export const createDefaultUserAgentProvider = ({ serviceId, clientVersion }) => {
    const runtimeUserAgentPair = getRuntimeUserAgentPair();
    return async (config) => {
        const sections = [
            ["aws-sdk-js", clientVersion],
            ["ua", "2.1"],
            [`os/${platform()}`, release()],
            ["lang/js"],
            runtimeUserAgentPair,
        ];
        const typescriptUserAgentPair = await getTypeScriptUserAgentPair();
        if (typescriptUserAgentPair) {
            sections.push(typescriptUserAgentPair);
        }
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

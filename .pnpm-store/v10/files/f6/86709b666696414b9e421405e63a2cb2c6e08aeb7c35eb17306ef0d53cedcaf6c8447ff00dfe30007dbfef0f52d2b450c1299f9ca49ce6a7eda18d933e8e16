import { CredentialsProviderError } from "@smithy/property-provider";
import { getSelectorName } from "./getSelectorName";
export const fromEnv = (envVarSelector, options) => async () => {
    try {
        const config = envVarSelector(process.env, options);
        if (config === undefined) {
            throw new Error();
        }
        return config;
    }
    catch (e) {
        throw new CredentialsProviderError(e.message || `Not found in ENV: ${getSelectorName(envVarSelector.toString())}`, { logger: options?.logger });
    }
};

import { CredentialsProviderError } from "@smithy/property-provider";
import { externalDataInterceptor } from "@smithy/shared-ini-file-loader";
import { exec } from "child_process";
import { promisify } from "util";
import { getValidatedProcessCredentials } from "./getValidatedProcessCredentials";
export const resolveProcessCredentials = async (profileName, profiles, logger) => {
    const profile = profiles[profileName];
    if (profiles[profileName]) {
        const credentialProcess = profile["credential_process"];
        if (credentialProcess !== undefined) {
            const execPromise = promisify(externalDataInterceptor?.getTokenRecord?.().exec ?? exec);
            try {
                const { stdout } = await execPromise(credentialProcess);
                let data;
                try {
                    data = JSON.parse(stdout.trim());
                }
                catch {
                    throw Error(`Profile ${profileName} credential_process returned invalid JSON.`);
                }
                return getValidatedProcessCredentials(profileName, data, profiles);
            }
            catch (error) {
                throw new CredentialsProviderError(error.message, { logger });
            }
        }
        else {
            throw new CredentialsProviderError(`Profile ${profileName} did not contain credential_process.`, { logger });
        }
    }
    else {
        throw new CredentialsProviderError(`Profile ${profileName} could not be found in shared credentials file.`, {
            logger,
        });
    }
};

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { WorkloadIdentityCredential } from "../workloadIdentityCredential.js";
import { credentialLogger } from "../../util/logging.js";
const msiName = "ManagedIdentityCredential - Token Exchange";
const logger = credentialLogger(msiName);
/**
 * Defines how to determine whether the token exchange MSI is available, and also how to retrieve a token from the token exchange MSI.
 *
 * Token exchange MSI (used by AKS) is the only MSI implementation handled entirely by Azure Identity.
 * The rest have been migrated to MSAL.
 */
export const tokenExchangeMsi = {
    name: "tokenExchangeMsi",
    async isAvailable(clientId) {
        const env = process.env;
        const result = Boolean((clientId || env.AZURE_CLIENT_ID) &&
            env.AZURE_TENANT_ID &&
            process.env.AZURE_FEDERATED_TOKEN_FILE);
        if (!result) {
            logger.info(`${msiName}: Unavailable. The environment variables needed are: AZURE_CLIENT_ID (or the client ID sent through the parameters), AZURE_TENANT_ID and AZURE_FEDERATED_TOKEN_FILE`);
        }
        return result;
    },
    async getToken(configuration, getTokenOptions = {}) {
        const { scopes, clientId } = configuration;
        const identityClientTokenCredentialOptions = {};
        const workloadIdentityCredential = new WorkloadIdentityCredential({
            clientId,
            tenantId: process.env.AZURE_TENANT_ID,
            tokenFilePath: process.env.AZURE_FEDERATED_TOKEN_FILE,
            ...identityClientTokenCredentialOptions,
            disableInstanceDiscovery: true,
        });
        return workloadIdentityCredential.getToken(scopes, getTokenOptions);
    },
};
//# sourceMappingURL=tokenExchangeMsi.js.map
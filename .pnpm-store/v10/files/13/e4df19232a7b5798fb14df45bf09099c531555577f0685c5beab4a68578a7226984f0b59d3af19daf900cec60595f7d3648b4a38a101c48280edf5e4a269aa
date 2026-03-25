// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { credentialLogger, processEnvVars } from "../util/logging.js";
import { ClientAssertionCredential } from "./clientAssertionCredential.js";
import { CredentialUnavailableError } from "../errors.js";
import { checkTenantId } from "../util/tenantIdUtils.js";
import { readFile } from "node:fs/promises";
const credentialName = "WorkloadIdentityCredential";
/**
 * Contains the list of all supported environment variable names so that an
 * appropriate error message can be generated when no credentials can be
 * configured.
 *
 * @internal
 */
export const SupportedWorkloadEnvironmentVariables = [
    "AZURE_TENANT_ID",
    "AZURE_CLIENT_ID",
    "AZURE_FEDERATED_TOKEN_FILE",
];
const logger = credentialLogger(credentialName);
/**
 * Workload Identity authentication is a feature in Azure that allows applications running on virtual machines (VMs)
 * to access other Azure resources without the need for a service principal or managed identity. With Workload Identity
 * authentication, applications authenticate themselves using their own identity, rather than using a shared service
 * principal or managed identity. Under the hood, Workload Identity authentication uses the concept of Service Account
 * Credentials (SACs), which are automatically created by Azure and stored securely in the VM. By using Workload
 * Identity authentication, you can avoid the need to manage and rotate service principals or managed identities for
 * each application on each VM. Additionally, because SACs are created automatically and managed by Azure, you don't
 * need to worry about storing and securing sensitive credentials themselves.
 * The WorkloadIdentityCredential supports Microsoft Entra Workload ID authentication on Azure Kubernetes and acquires
 * a token using the SACs available in the Azure Kubernetes environment.
 * Refer to <a href="https://learn.microsoft.com/azure/aks/workload-identity-overview">Microsoft Entra
 * Workload ID</a> for more information.
 */
export class WorkloadIdentityCredential {
    client;
    azureFederatedTokenFileContent = undefined;
    cacheDate = undefined;
    federatedTokenFilePath;
    /**
     * WorkloadIdentityCredential supports Microsoft Entra Workload ID on Kubernetes.
     *
     * @param options - The identity client options to use for authentication.
     */
    constructor(options) {
        // Logging environment variables for error details
        const assignedEnv = processEnvVars(SupportedWorkloadEnvironmentVariables).assigned.join(", ");
        logger.info(`Found the following environment variables: ${assignedEnv}`);
        const workloadIdentityCredentialOptions = options ?? {};
        const tenantId = workloadIdentityCredentialOptions.tenantId || process.env.AZURE_TENANT_ID;
        const clientId = workloadIdentityCredentialOptions.clientId || process.env.AZURE_CLIENT_ID;
        this.federatedTokenFilePath =
            workloadIdentityCredentialOptions.tokenFilePath || process.env.AZURE_FEDERATED_TOKEN_FILE;
        if (tenantId) {
            checkTenantId(logger, tenantId);
        }
        if (!clientId) {
            throw new CredentialUnavailableError(`${credentialName}: is unavailable. clientId is a required parameter. In DefaultAzureCredential and ManagedIdentityCredential, this can be provided as an environment variable - "AZURE_CLIENT_ID".
        See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`);
        }
        if (!tenantId) {
            throw new CredentialUnavailableError(`${credentialName}: is unavailable. tenantId is a required parameter. In DefaultAzureCredential and ManagedIdentityCredential, this can be provided as an environment variable - "AZURE_TENANT_ID".
        See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`);
        }
        if (!this.federatedTokenFilePath) {
            throw new CredentialUnavailableError(`${credentialName}: is unavailable. federatedTokenFilePath is a required parameter. In DefaultAzureCredential and ManagedIdentityCredential, this can be provided as an environment variable - "AZURE_FEDERATED_TOKEN_FILE".
        See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`);
        }
        logger.info(`Invoking ClientAssertionCredential with tenant ID: ${tenantId}, clientId: ${workloadIdentityCredentialOptions.clientId} and federated token path: [REDACTED]`);
        this.client = new ClientAssertionCredential(tenantId, clientId, this.readFileContents.bind(this), options);
    }
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    async getToken(scopes, options) {
        if (!this.client) {
            const errorMessage = `${credentialName}: is unavailable. tenantId, clientId, and federatedTokenFilePath are required parameters. 
      In DefaultAzureCredential and ManagedIdentityCredential, these can be provided as environment variables - 
      "AZURE_TENANT_ID",
      "AZURE_CLIENT_ID",
      "AZURE_FEDERATED_TOKEN_FILE". See the troubleshooting guide for more information: https://aka.ms/azsdk/js/identity/workloadidentitycredential/troubleshoot`;
            logger.info(errorMessage);
            throw new CredentialUnavailableError(errorMessage);
        }
        logger.info("Invoking getToken() of Client Assertion Credential");
        return this.client.getToken(scopes, options);
    }
    async readFileContents() {
        // Cached assertions expire after 5 minutes
        if (this.cacheDate !== undefined && Date.now() - this.cacheDate >= 1000 * 60 * 5) {
            this.azureFederatedTokenFileContent = undefined;
        }
        if (!this.federatedTokenFilePath) {
            throw new CredentialUnavailableError(`${credentialName}: is unavailable. Invalid file path provided ${this.federatedTokenFilePath}.`);
        }
        if (!this.azureFederatedTokenFileContent) {
            const file = await readFile(this.federatedTokenFilePath, "utf8");
            const value = file.trim();
            if (!value) {
                throw new CredentialUnavailableError(`${credentialName}: is unavailable. No content on the file ${this.federatedTokenFilePath}.`);
            }
            else {
                this.azureFederatedTokenFileContent = value;
                this.cacheDate = Date.now();
            }
        }
        return this.azureFederatedTokenFileContent;
    }
}
//# sourceMappingURL=workloadIdentityCredential.js.map
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { EnvironmentCredential } from "./environmentCredential.js";
import { ManagedIdentityCredential } from "./managedIdentityCredential/index.js";
import { WorkloadIdentityCredential } from "./workloadIdentityCredential.js";
import { AzureDeveloperCliCredential } from "./azureDeveloperCliCredential.js";
import { AzureCliCredential } from "./azureCliCredential.js";
import { AzurePowerShellCredential } from "./azurePowerShellCredential.js";
import { VisualStudioCodeCredential } from "./visualStudioCodeCredential.js";
import { BrokerCredential } from "./brokerCredential.js";
/**
 * Creates a {@link BrokerCredential} instance with the provided options.
 * This credential uses the Windows Authentication Manager (WAM) broker for authentication.
 * It will only attempt to authenticate silently using the default broker account
 *
 * @param options - Options for configuring the credential.
 *
 * @internal
 */
export function createDefaultBrokerCredential(options = {}) {
    return new BrokerCredential(options);
}
/**
 * Creates a {@link VisualStudioCodeCredential} from the provided options.
 * @param options - Options to configure the credential.
 *
 * @internal
 */
export function createDefaultVisualStudioCodeCredential(options = {}) {
    return new VisualStudioCodeCredential(options);
}
/**
 * Creates a {@link ManagedIdentityCredential} from the provided options.
 * @param options - Options to configure the credential.
 *
 * @internal
 */
export function createDefaultManagedIdentityCredential(options = {}) {
    options.retryOptions ??= {
        maxRetries: 5,
        retryDelayInMs: 800,
    };
    // ManagedIdentityCredential inside DAC chain should send a probe request by default.
    // This is different from standalone ManagedIdentityCredential behavior
    // or when AZURE_TOKEN_CREDENTIALS is set to only ManagedIdentityCredential.
    options.sendProbeRequest ??= true;
    const managedIdentityClientId = options?.managedIdentityClientId ??
        process.env.AZURE_CLIENT_ID;
    const workloadIdentityClientId = options?.workloadIdentityClientId ??
        managedIdentityClientId;
    const managedResourceId = options
        ?.managedIdentityResourceId;
    const workloadFile = process.env.AZURE_FEDERATED_TOKEN_FILE;
    const tenantId = options?.tenantId ?? process.env.AZURE_TENANT_ID;
    if (managedResourceId) {
        const managedIdentityResourceIdOptions = {
            ...options,
            resourceId: managedResourceId,
        };
        return new ManagedIdentityCredential(managedIdentityResourceIdOptions);
    }
    if (workloadFile && workloadIdentityClientId) {
        const workloadIdentityCredentialOptions = {
            ...options,
            tenantId: tenantId,
        };
        return new ManagedIdentityCredential(workloadIdentityClientId, workloadIdentityCredentialOptions);
    }
    if (managedIdentityClientId) {
        const managedIdentityClientOptions = {
            ...options,
            clientId: managedIdentityClientId,
        };
        return new ManagedIdentityCredential(managedIdentityClientOptions);
    }
    // We may be able to return a UnavailableCredential here, but that may be a breaking change
    return new ManagedIdentityCredential(options);
}
/**
 * Creates a {@link WorkloadIdentityCredential} from the provided options.
 * @param options - Options to configure the credential.
 *
 * @internal
 */
export function createDefaultWorkloadIdentityCredential(options) {
    const managedIdentityClientId = options?.managedIdentityClientId ??
        process.env.AZURE_CLIENT_ID;
    const workloadIdentityClientId = options?.workloadIdentityClientId ??
        managedIdentityClientId;
    const workloadFile = process.env.AZURE_FEDERATED_TOKEN_FILE;
    const tenantId = options?.tenantId ?? process.env.AZURE_TENANT_ID;
    if (workloadFile && workloadIdentityClientId) {
        const workloadIdentityCredentialOptions = {
            ...options,
            tenantId,
            clientId: workloadIdentityClientId,
            tokenFilePath: workloadFile,
        };
        return new WorkloadIdentityCredential(workloadIdentityCredentialOptions);
    }
    if (tenantId) {
        const workloadIdentityClientTenantOptions = {
            ...options,
            tenantId,
        };
        return new WorkloadIdentityCredential(workloadIdentityClientTenantOptions);
    }
    // We may be able to return a UnavailableCredential here, but that may be a breaking change
    return new WorkloadIdentityCredential(options);
}
/**
 * Creates a {@link AzureDeveloperCliCredential} from the provided options.
 * @param options - Options to configure the credential.
 *
 * @internal
 */
export function createDefaultAzureDeveloperCliCredential(options = {}) {
    return new AzureDeveloperCliCredential(options);
}
/**
 * Creates a {@link AzureCliCredential} from the provided options.
 * @param options - Options to configure the credential.
 *
 * @internal
 */
export function createDefaultAzureCliCredential(options = {}) {
    return new AzureCliCredential(options);
}
/**
 * Creates a {@link AzurePowerShellCredential} from the provided options.
 * @param options - Options to configure the credential.
 *
 * @internal
 */
export function createDefaultAzurePowershellCredential(options = {}) {
    return new AzurePowerShellCredential(options);
}
/**
 * Creates an {@link EnvironmentCredential} from the provided options.
 * @param options - Options to configure the credential.
 *
 * @internal
 */
export function createDefaultEnvironmentCredential(options = {}) {
    return new EnvironmentCredential(options);
}
//# sourceMappingURL=defaultAzureCredentialFunctions.js.map
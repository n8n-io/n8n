"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultBrokerCredential = createDefaultBrokerCredential;
exports.createDefaultVisualStudioCodeCredential = createDefaultVisualStudioCodeCredential;
exports.createDefaultManagedIdentityCredential = createDefaultManagedIdentityCredential;
exports.createDefaultWorkloadIdentityCredential = createDefaultWorkloadIdentityCredential;
exports.createDefaultAzureDeveloperCliCredential = createDefaultAzureDeveloperCliCredential;
exports.createDefaultAzureCliCredential = createDefaultAzureCliCredential;
exports.createDefaultAzurePowershellCredential = createDefaultAzurePowershellCredential;
exports.createDefaultEnvironmentCredential = createDefaultEnvironmentCredential;
const environmentCredential_js_1 = require("./environmentCredential.js");
const index_js_1 = require("./managedIdentityCredential/index.js");
const workloadIdentityCredential_js_1 = require("./workloadIdentityCredential.js");
const azureDeveloperCliCredential_js_1 = require("./azureDeveloperCliCredential.js");
const azureCliCredential_js_1 = require("./azureCliCredential.js");
const azurePowerShellCredential_js_1 = require("./azurePowerShellCredential.js");
const visualStudioCodeCredential_js_1 = require("./visualStudioCodeCredential.js");
const brokerCredential_js_1 = require("./brokerCredential.js");
/**
 * Creates a {@link BrokerCredential} instance with the provided options.
 * This credential uses the Windows Authentication Manager (WAM) broker for authentication.
 * It will only attempt to authenticate silently using the default broker account
 *
 * @param options - Options for configuring the credential.
 *
 * @internal
 */
function createDefaultBrokerCredential(options = {}) {
    return new brokerCredential_js_1.BrokerCredential(options);
}
/**
 * Creates a {@link VisualStudioCodeCredential} from the provided options.
 * @param options - Options to configure the credential.
 *
 * @internal
 */
function createDefaultVisualStudioCodeCredential(options = {}) {
    return new visualStudioCodeCredential_js_1.VisualStudioCodeCredential(options);
}
/**
 * Creates a {@link ManagedIdentityCredential} from the provided options.
 * @param options - Options to configure the credential.
 *
 * @internal
 */
function createDefaultManagedIdentityCredential(options = {}) {
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
        return new index_js_1.ManagedIdentityCredential(managedIdentityResourceIdOptions);
    }
    if (workloadFile && workloadIdentityClientId) {
        const workloadIdentityCredentialOptions = {
            ...options,
            tenantId: tenantId,
        };
        return new index_js_1.ManagedIdentityCredential(workloadIdentityClientId, workloadIdentityCredentialOptions);
    }
    if (managedIdentityClientId) {
        const managedIdentityClientOptions = {
            ...options,
            clientId: managedIdentityClientId,
        };
        return new index_js_1.ManagedIdentityCredential(managedIdentityClientOptions);
    }
    // We may be able to return a UnavailableCredential here, but that may be a breaking change
    return new index_js_1.ManagedIdentityCredential(options);
}
/**
 * Creates a {@link WorkloadIdentityCredential} from the provided options.
 * @param options - Options to configure the credential.
 *
 * @internal
 */
function createDefaultWorkloadIdentityCredential(options) {
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
        return new workloadIdentityCredential_js_1.WorkloadIdentityCredential(workloadIdentityCredentialOptions);
    }
    if (tenantId) {
        const workloadIdentityClientTenantOptions = {
            ...options,
            tenantId,
        };
        return new workloadIdentityCredential_js_1.WorkloadIdentityCredential(workloadIdentityClientTenantOptions);
    }
    // We may be able to return a UnavailableCredential here, but that may be a breaking change
    return new workloadIdentityCredential_js_1.WorkloadIdentityCredential(options);
}
/**
 * Creates a {@link AzureDeveloperCliCredential} from the provided options.
 * @param options - Options to configure the credential.
 *
 * @internal
 */
function createDefaultAzureDeveloperCliCredential(options = {}) {
    return new azureDeveloperCliCredential_js_1.AzureDeveloperCliCredential(options);
}
/**
 * Creates a {@link AzureCliCredential} from the provided options.
 * @param options - Options to configure the credential.
 *
 * @internal
 */
function createDefaultAzureCliCredential(options = {}) {
    return new azureCliCredential_js_1.AzureCliCredential(options);
}
/**
 * Creates a {@link AzurePowerShellCredential} from the provided options.
 * @param options - Options to configure the credential.
 *
 * @internal
 */
function createDefaultAzurePowershellCredential(options = {}) {
    return new azurePowerShellCredential_js_1.AzurePowerShellCredential(options);
}
/**
 * Creates an {@link EnvironmentCredential} from the provided options.
 * @param options - Options to configure the credential.
 *
 * @internal
 */
function createDefaultEnvironmentCredential(options = {}) {
    return new environmentCredential_js_1.EnvironmentCredential(options);
}
//# sourceMappingURL=defaultAzureCredentialFunctions.js.map
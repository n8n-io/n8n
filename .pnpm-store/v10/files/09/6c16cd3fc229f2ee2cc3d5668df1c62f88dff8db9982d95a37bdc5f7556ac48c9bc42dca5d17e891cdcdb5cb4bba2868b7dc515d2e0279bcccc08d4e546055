/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { AppService } from './ManagedIdentitySources/AppService.mjs';
import { AzureArc } from './ManagedIdentitySources/AzureArc.mjs';
import { CloudShell } from './ManagedIdentitySources/CloudShell.mjs';
import { Imds } from './ManagedIdentitySources/Imds.mjs';
import { ServiceFabric } from './ManagedIdentitySources/ServiceFabric.mjs';
import { createManagedIdentityError } from '../error/ManagedIdentityError.mjs';
import { ManagedIdentitySourceNames } from '../utils/Constants.mjs';
import { MachineLearning } from './ManagedIdentitySources/MachineLearning.mjs';
import { unableToCreateSource } from '../error/ManagedIdentityErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Class to initialize a managed identity and identify the service.
 * Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/ManagedIdentityClient.cs
 */
class ManagedIdentityClient {
    constructor(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) {
        this.logger = logger;
        this.nodeStorage = nodeStorage;
        this.networkClient = networkClient;
        this.cryptoProvider = cryptoProvider;
        this.disableInternalRetries = disableInternalRetries;
    }
    async sendManagedIdentityTokenRequest(managedIdentityRequest, managedIdentityId, fakeAuthority, refreshAccessToken) {
        if (!ManagedIdentityClient.identitySource) {
            ManagedIdentityClient.identitySource =
                this.selectManagedIdentitySource(this.logger, this.nodeStorage, this.networkClient, this.cryptoProvider, this.disableInternalRetries, managedIdentityId);
        }
        return ManagedIdentityClient.identitySource.acquireTokenWithManagedIdentity(managedIdentityRequest, managedIdentityId, fakeAuthority, refreshAccessToken);
    }
    allEnvironmentVariablesAreDefined(environmentVariables) {
        return Object.values(environmentVariables).every((environmentVariable) => {
            return environmentVariable !== undefined;
        });
    }
    /**
     * Determine the Managed Identity Source based on available environment variables. This API is consumed by ManagedIdentityApplication's getManagedIdentitySource.
     * @returns ManagedIdentitySourceNames - The Managed Identity source's name
     */
    getManagedIdentitySource() {
        ManagedIdentityClient.sourceName =
            this.allEnvironmentVariablesAreDefined(ServiceFabric.getEnvironmentVariables())
                ? ManagedIdentitySourceNames.SERVICE_FABRIC
                : this.allEnvironmentVariablesAreDefined(AppService.getEnvironmentVariables())
                    ? ManagedIdentitySourceNames.APP_SERVICE
                    : this.allEnvironmentVariablesAreDefined(MachineLearning.getEnvironmentVariables())
                        ? ManagedIdentitySourceNames.MACHINE_LEARNING
                        : this.allEnvironmentVariablesAreDefined(CloudShell.getEnvironmentVariables())
                            ? ManagedIdentitySourceNames.CLOUD_SHELL
                            : this.allEnvironmentVariablesAreDefined(AzureArc.getEnvironmentVariables())
                                ? ManagedIdentitySourceNames.AZURE_ARC
                                : ManagedIdentitySourceNames.DEFAULT_TO_IMDS;
        return ManagedIdentityClient.sourceName;
    }
    /**
     * Tries to create a managed identity source for all sources
     * @returns the managed identity Source
     */
    selectManagedIdentitySource(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, managedIdentityId) {
        const source = ServiceFabric.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, managedIdentityId) ||
            AppService.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) ||
            MachineLearning.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) ||
            CloudShell.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, managedIdentityId) ||
            AzureArc.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, managedIdentityId) ||
            Imds.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
        if (!source) {
            throw createManagedIdentityError(unableToCreateSource);
        }
        return source;
    }
}

export { ManagedIdentityClient };
//# sourceMappingURL=ManagedIdentityClient.mjs.map

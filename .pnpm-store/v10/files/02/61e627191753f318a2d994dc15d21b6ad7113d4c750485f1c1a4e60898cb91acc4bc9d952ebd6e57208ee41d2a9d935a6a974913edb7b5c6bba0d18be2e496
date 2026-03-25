/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    Authority,
    INetworkModule,
    Logger,
    AuthenticationResult,
} from "@azure/msal-common/node";
import { AppService } from "./ManagedIdentitySources/AppService.js";
import { AzureArc } from "./ManagedIdentitySources/AzureArc.js";
import { CloudShell } from "./ManagedIdentitySources/CloudShell.js";
import { Imds } from "./ManagedIdentitySources/Imds.js";
import { ServiceFabric } from "./ManagedIdentitySources/ServiceFabric.js";
import { CryptoProvider } from "../crypto/CryptoProvider.js";
import {
    ManagedIdentityErrorCodes,
    createManagedIdentityError,
} from "../error/ManagedIdentityError.js";
import { ManagedIdentityRequest } from "../request/ManagedIdentityRequest.js";
import { ManagedIdentityId } from "../config/ManagedIdentityId.js";
import { NodeStorage } from "../cache/NodeStorage.js";
import { BaseManagedIdentitySource } from "./ManagedIdentitySources/BaseManagedIdentitySource.js";
import { ManagedIdentitySourceNames } from "../utils/Constants.js";
import { MachineLearning } from "./ManagedIdentitySources/MachineLearning.js";

/*
 * Class to initialize a managed identity and identify the service.
 * Original source of code: https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/ManagedIdentityClient.cs
 */
export class ManagedIdentityClient {
    private logger: Logger;
    private nodeStorage: NodeStorage;
    private networkClient: INetworkModule;
    private cryptoProvider: CryptoProvider;
    private disableInternalRetries: boolean;

    private static identitySource?: BaseManagedIdentitySource;
    public static sourceName?: ManagedIdentitySourceNames;

    constructor(
        logger: Logger,
        nodeStorage: NodeStorage,
        networkClient: INetworkModule,
        cryptoProvider: CryptoProvider,
        disableInternalRetries: boolean
    ) {
        this.logger = logger;
        this.nodeStorage = nodeStorage;
        this.networkClient = networkClient;
        this.cryptoProvider = cryptoProvider;
        this.disableInternalRetries = disableInternalRetries;
    }

    public async sendManagedIdentityTokenRequest(
        managedIdentityRequest: ManagedIdentityRequest,
        managedIdentityId: ManagedIdentityId,
        fakeAuthority: Authority,
        refreshAccessToken?: boolean
    ): Promise<AuthenticationResult> {
        if (!ManagedIdentityClient.identitySource) {
            ManagedIdentityClient.identitySource =
                this.selectManagedIdentitySource(
                    this.logger,
                    this.nodeStorage,
                    this.networkClient,
                    this.cryptoProvider,
                    this.disableInternalRetries,
                    managedIdentityId
                );
        }

        return ManagedIdentityClient.identitySource.acquireTokenWithManagedIdentity(
            managedIdentityRequest,
            managedIdentityId,
            fakeAuthority,
            refreshAccessToken
        );
    }

    private allEnvironmentVariablesAreDefined(
        environmentVariables: Array<string | undefined>
    ): boolean {
        return Object.values(environmentVariables).every(
            (environmentVariable) => {
                return environmentVariable !== undefined;
            }
        );
    }

    /**
     * Determine the Managed Identity Source based on available environment variables. This API is consumed by ManagedIdentityApplication's getManagedIdentitySource.
     * @returns ManagedIdentitySourceNames - The Managed Identity source's name
     */
    public getManagedIdentitySource(): ManagedIdentitySourceNames {
        ManagedIdentityClient.sourceName =
            this.allEnvironmentVariablesAreDefined(
                ServiceFabric.getEnvironmentVariables()
            )
                ? ManagedIdentitySourceNames.SERVICE_FABRIC
                : this.allEnvironmentVariablesAreDefined(
                      AppService.getEnvironmentVariables()
                  )
                ? ManagedIdentitySourceNames.APP_SERVICE
                : this.allEnvironmentVariablesAreDefined(
                      MachineLearning.getEnvironmentVariables()
                  )
                ? ManagedIdentitySourceNames.MACHINE_LEARNING
                : this.allEnvironmentVariablesAreDefined(
                      CloudShell.getEnvironmentVariables()
                  )
                ? ManagedIdentitySourceNames.CLOUD_SHELL
                : this.allEnvironmentVariablesAreDefined(
                      AzureArc.getEnvironmentVariables()
                  )
                ? ManagedIdentitySourceNames.AZURE_ARC
                : ManagedIdentitySourceNames.DEFAULT_TO_IMDS;

        return ManagedIdentityClient.sourceName;
    }

    /**
     * Tries to create a managed identity source for all sources
     * @returns the managed identity Source
     */
    private selectManagedIdentitySource(
        logger: Logger,
        nodeStorage: NodeStorage,
        networkClient: INetworkModule,
        cryptoProvider: CryptoProvider,
        disableInternalRetries: boolean,
        managedIdentityId: ManagedIdentityId
    ): BaseManagedIdentitySource {
        const source =
            ServiceFabric.tryCreate(
                logger,
                nodeStorage,
                networkClient,
                cryptoProvider,
                disableInternalRetries,
                managedIdentityId
            ) ||
            AppService.tryCreate(
                logger,
                nodeStorage,
                networkClient,
                cryptoProvider,
                disableInternalRetries
            ) ||
            MachineLearning.tryCreate(
                logger,
                nodeStorage,
                networkClient,
                cryptoProvider,
                disableInternalRetries
            ) ||
            CloudShell.tryCreate(
                logger,
                nodeStorage,
                networkClient,
                cryptoProvider,
                disableInternalRetries,
                managedIdentityId
            ) ||
            AzureArc.tryCreate(
                logger,
                nodeStorage,
                networkClient,
                cryptoProvider,
                disableInternalRetries,
                managedIdentityId
            ) ||
            Imds.tryCreate(
                logger,
                nodeStorage,
                networkClient,
                cryptoProvider,
                disableInternalRetries
            );
        if (!source) {
            throw createManagedIdentityError(
                ManagedIdentityErrorCodes.unableToCreateSource
            );
        }
        return source;
    }
}

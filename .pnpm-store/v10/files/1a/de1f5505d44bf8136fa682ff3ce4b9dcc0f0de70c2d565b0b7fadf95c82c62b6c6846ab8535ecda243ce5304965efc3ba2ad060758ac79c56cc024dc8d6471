import { Authority, INetworkModule, Logger, AuthenticationResult } from "@azure/msal-common/node";
import { CryptoProvider } from "../crypto/CryptoProvider.js";
import { ManagedIdentityRequest } from "../request/ManagedIdentityRequest.js";
import { ManagedIdentityId } from "../config/ManagedIdentityId.js";
import { NodeStorage } from "../cache/NodeStorage.js";
import { ManagedIdentitySourceNames } from "../utils/Constants.js";
export declare class ManagedIdentityClient {
    private logger;
    private nodeStorage;
    private networkClient;
    private cryptoProvider;
    private disableInternalRetries;
    private static identitySource?;
    static sourceName?: ManagedIdentitySourceNames;
    constructor(logger: Logger, nodeStorage: NodeStorage, networkClient: INetworkModule, cryptoProvider: CryptoProvider, disableInternalRetries: boolean);
    sendManagedIdentityTokenRequest(managedIdentityRequest: ManagedIdentityRequest, managedIdentityId: ManagedIdentityId, fakeAuthority: Authority, refreshAccessToken?: boolean): Promise<AuthenticationResult>;
    private allEnvironmentVariablesAreDefined;
    /**
     * Determine the Managed Identity Source based on available environment variables. This API is consumed by ManagedIdentityApplication's getManagedIdentitySource.
     * @returns ManagedIdentitySourceNames - The Managed Identity source's name
     */
    getManagedIdentitySource(): ManagedIdentitySourceNames;
    /**
     * Tries to create a managed identity source for all sources
     * @returns the managed identity Source
     */
    private selectManagedIdentitySource;
}
//# sourceMappingURL=ManagedIdentityClient.d.ts.map
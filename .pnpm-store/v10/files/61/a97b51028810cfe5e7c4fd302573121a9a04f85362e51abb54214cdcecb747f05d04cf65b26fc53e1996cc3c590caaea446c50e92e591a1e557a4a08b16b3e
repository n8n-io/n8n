import { AuthenticationResult } from "@azure/msal-common/node";
import { ManagedIdentityConfiguration } from "../config/Configuration.js";
import { ManagedIdentityRequestParams } from "../request/ManagedIdentityRequestParams.js";
import { ManagedIdentitySourceNames } from "../utils/Constants.js";
/**
 * Class to initialize a managed identity and identify the service
 * @public
 */
export declare class ManagedIdentityApplication {
    private config;
    private logger;
    private static nodeStorage?;
    private networkClient;
    private cryptoProvider;
    private fakeAuthority;
    private fakeClientCredentialClient;
    private managedIdentityClient;
    private hashUtils;
    constructor(configuration?: ManagedIdentityConfiguration);
    /**
     * Acquire an access token from the cache or the managed identity
     * @param managedIdentityRequest - the ManagedIdentityRequestParams object passed in by the developer
     * @returns the access token
     */
    acquireToken(managedIdentityRequestParams: ManagedIdentityRequestParams): Promise<AuthenticationResult>;
    /**
     * Acquires a token from a managed identity endpoint.
     *
     * @param managedIdentityRequest - The request object containing parameters for the managed identity token request.
     * @param managedIdentityId - The identifier for the managed identity (e.g., client ID or resource ID).
     * @param fakeAuthority - A placeholder authority used for the token request.
     * @param refreshAccessToken - Optional flag indicating whether to force a refresh of the access token.
     * @returns A promise that resolves to an AuthenticationResult containing the acquired token and related information.
     */
    private acquireTokenFromManagedIdentity;
    /**
     * Determine the Managed Identity Source based on available environment variables. This API is consumed by Azure Identity SDK.
     * @returns ManagedIdentitySourceNames - The Managed Identity source's name
     */
    getManagedIdentitySource(): ManagedIdentitySourceNames;
}
//# sourceMappingURL=ManagedIdentityApplication.d.ts.map
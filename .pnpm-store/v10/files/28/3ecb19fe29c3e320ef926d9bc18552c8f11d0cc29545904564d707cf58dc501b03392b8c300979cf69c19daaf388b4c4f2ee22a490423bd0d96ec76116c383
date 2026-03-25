import * as msal from "@azure/msal-node";
import type { AccessToken, GetTokenOptions } from "@azure/core-auth";
import type { AuthenticationRecord, CertificateParts } from "../types.js";
import type { CredentialLogger } from "../../util/logging.js";
import type { BrokerOptions } from "./brokerOptions.js";
import type { DeviceCodePromptCallback } from "../../credentials/deviceCodeCredentialOptions.js";
import { IdentityClient } from "../../client/identityClient.js";
import type { InteractiveBrowserCredentialNodeOptions } from "../../credentials/interactiveBrowserCredentialOptions.js";
import type { TokenCachePersistenceOptions } from "./tokenCachePersistenceOptions.js";
/**
 * Represents the options for acquiring a token using flows that support silent authentication.
 */
export interface GetTokenWithSilentAuthOptions extends GetTokenOptions {
    /**
     * Disables automatic authentication. If set to true, the method will throw an error if the user needs to authenticate.
     *
     * @remarks
     *
     * This option will be set to `false` when the user calls `authenticate` directly on a credential that supports it.
     */
    disableAutomaticAuthentication?: boolean;
}
/**
 * Represents the options for acquiring a token interactively.
 */
export interface GetTokenInteractiveOptions extends GetTokenWithSilentAuthOptions {
    /**
     * Window handle for parent window, required for WAM authentication.
     */
    parentWindowHandle?: Buffer;
    /**
     * Shared configuration options for browser customization
     */
    browserCustomizationOptions?: InteractiveBrowserCredentialNodeOptions["browserCustomizationOptions"];
    /**
     * loginHint allows a user name to be pre-selected for interactive logins.
     * Setting this option skips the account selection prompt and immediately attempts to login with the specified account.
     */
    loginHint?: string;
}
/**
 * Represents a client for interacting with the Microsoft Authentication Library (MSAL).
 */
export interface MsalClient {
    /**
     *
     * Retrieves an access token by using the on-behalf-of flow and a client assertion callback of the calling service.
     *
     * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
     * @param userAssertionToken - The access token that was sent to the middle-tier API. This token must have an audience of the app making this OBO request.
     * @param clientCredentials - The client secret OR client certificate OR client `getAssertion` callback.
     * @param options - Additional options that may be provided to the method.
     * @returns An access token.
     */
    getTokenOnBehalfOf(scopes: string[], userAssertionToken: string, clientCredentials: string | CertificateParts | (() => Promise<string>), options?: GetTokenOptions): Promise<AccessToken>;
    /**
     * Retrieves an access token by using an interactive prompt (InteractiveBrowserCredential).
     * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
     * @param options - Additional options that may be provided to the method.
     * @returns An access token.
     */
    getTokenByInteractiveRequest(scopes: string[], options: GetTokenInteractiveOptions): Promise<AccessToken>;
    /**
     * Retrieves an access token by using a user's username and password.
     *
     * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
     * @param username - The username provided by the developer.
     * @param password - The user's password provided by the developer.
     * @param options - Additional options that may be provided to the method.
     * @returns An access token.
     */
    getTokenByUsernamePassword(scopes: string[], username: string, password: string, options?: GetTokenOptions): Promise<AccessToken>;
    /**
     * Retrieves an access token by prompting the user to authenticate using a device code.
     *
     * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
     * @param userPromptCallback - The callback function that allows developers to customize the prompt message.
     * @param options - Additional options that may be provided to the method.
     * @returns An access token.
     */
    getTokenByDeviceCode(scopes: string[], userPromptCallback: DeviceCodePromptCallback, options?: GetTokenWithSilentAuthOptions): Promise<AccessToken>;
    /**
     * Retrieves an access token by using a client certificate.
     *
     * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
     * @param certificate - The client certificate used for authentication.
     * @param options - Additional options that may be provided to the method.
     * @returns An access token.
     */
    getTokenByClientCertificate(scopes: string[], certificate: CertificateParts, options?: GetTokenOptions): Promise<AccessToken>;
    /**
     * Retrieves an access token by using a client assertion.
     *
     * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
     * @param clientAssertion - The client `getAssertion` callback used for authentication.
     * @param options - Additional options that may be provided to the method.
     * @returns An access token.
     */
    getTokenByClientAssertion(scopes: string[], clientAssertion: () => Promise<string>, options?: GetTokenOptions): Promise<AccessToken>;
    /**
     * Retrieves an access token by using a client secret.
     *
     * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
     * @param clientSecret - The client secret of the application. This is a credential that the application can use to authenticate itself.
     * @param options - Additional options that may be provided to the method.
     * @returns An access token.
     */
    getTokenByClientSecret(scopes: string[], clientSecret: string, options?: GetTokenOptions): Promise<AccessToken>;
    /**
     * Retrieves an access token by using an authorization code flow.
     *
     * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
     * @param authorizationCode - An authorization code that was received from following the
                                authorization code flow.  This authorization code must not
                                have already been used to obtain an access token.
     * @param redirectUri - The redirect URI that was used to request the authorization code.
                          Must be the same URI that is configured for the App Registration.
     * @param clientSecret - An optional client secret that was generated for the App Registration.
     * @param options - Additional options that may be provided to the method.
     */
    getTokenByAuthorizationCode(scopes: string[], redirectUri: string, authorizationCode: string, clientSecret?: string, options?: GetTokenWithSilentAuthOptions): Promise<AccessToken>;
    /**
     * Retrieves the last authenticated account. This method expects an authentication record to have been previously loaded.
     *
     * An authentication record could be loaded by calling the `getToken` method, or by providing an `authenticationRecord` when creating a credential.
     */
    getActiveAccount(): AuthenticationRecord | undefined;
    /**
     * Retrieves an access token using brokered authentication.
     *
     * @param scopes - The scopes for which the access token is requested. These represent the resources that the application wants to access.
     * @param useDefaultBrokerAccount - Whether to use the default broker account for authentication.
     * @param options - Additional options that may be provided to the method.
     * @returns An access token.
     */
    getBrokeredToken(scopes: string[], useDefaultBrokerAccount: boolean, options?: GetTokenInteractiveOptions): Promise<AccessToken>;
}
/**
 * Represents the options for configuring the MsalClient.
 */
export interface MsalClientOptions {
    /**
     * Parameters that enable WAM broker authentication in the InteractiveBrowserCredential.
     */
    brokerOptions?: BrokerOptions;
    /**
     * Parameters that enable token cache persistence in the Identity credentials.
     */
    tokenCachePersistenceOptions?: TokenCachePersistenceOptions;
    /**
     * Indicates if this is being used by VSCode credential.
     */
    isVSCodeCredential?: boolean;
    /**
     * A custom authority host.
     */
    authorityHost?: IdentityClient["tokenCredentialOptions"]["authorityHost"];
    /**
     * Allows users to configure settings for logging policy options, allow logging account information and personally identifiable information for customer support.
     */
    loggingOptions?: IdentityClient["tokenCredentialOptions"]["loggingOptions"];
    /**
     * The token credential options for the MsalClient.
     */
    tokenCredentialOptions?: IdentityClient["tokenCredentialOptions"];
    /**
     * Determines whether instance discovery is disabled.
     */
    disableInstanceDiscovery?: boolean;
    /**
     * The logger for the MsalClient.
     */
    logger?: CredentialLogger;
    /**
     * The authentication record for the MsalClient.
     */
    authenticationRecord?: AuthenticationRecord;
}
/**
 * Generates the configuration for MSAL (Microsoft Authentication Library).
 *
 * @param clientId - The client ID of the application.
 * @param  tenantId - The tenant ID of the Azure Active Directory.
 * @param  msalClientOptions - Optional. Additional options for creating the MSAL client.
 * @returns  The MSAL configuration object.
 */
export declare function generateMsalConfiguration(clientId: string, tenantId: string, msalClientOptions?: MsalClientOptions): msal.Configuration;
/**
 * Creates an instance of the MSAL (Microsoft Authentication Library) client.
 *
 * @param clientId - The client ID of the application.
 * @param tenantId - The tenant ID of the Azure Active Directory.
 * @param createMsalClientOptions - Optional. Additional options for creating the MSAL client.
 * @returns An instance of the MSAL client.
 *
 * @public
 */
export declare function createMsalClient(clientId: string, tenantId: string, createMsalClientOptions?: MsalClientOptions): MsalClient;
//# sourceMappingURL=msalClient.d.ts.map
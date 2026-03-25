import { AuthenticationResult, AccountInfo } from "@azure/msal-common/node";
import { Configuration } from "../config/Configuration.js";
import { ClientApplication } from "./ClientApplication.js";
import { IPublicClientApplication } from "./IPublicClientApplication.js";
import { DeviceCodeRequest } from "../request/DeviceCodeRequest.js";
import { InteractiveRequest } from "../request/InteractiveRequest.js";
import { SilentFlowRequest } from "../request/SilentFlowRequest.js";
import { SignOutRequest } from "../request/SignOutRequest.js";
/**
 * This class is to be used to acquire tokens for public client applications (desktop, mobile). Public client applications
 * are not trusted to safely store application secrets, and therefore can only request tokens in the name of an user.
 * @public
 */
export declare class PublicClientApplication extends ClientApplication implements IPublicClientApplication {
    private nativeBrokerPlugin?;
    private readonly skus;
    /**
     * Important attributes in the Configuration object for auth are:
     * - clientID: the application ID of your application. You can obtain one by registering your application with our Application registration portal.
     * - authority: the authority URL for your application.
     *
     * AAD authorities are of the form https://login.microsoftonline.com/\{Enter_the_Tenant_Info_Here\}.
     * - If your application supports Accounts in one organizational directory, replace "Enter_the_Tenant_Info_Here" value with the Tenant Id or Tenant name (for example, contoso.microsoft.com).
     * - If your application supports Accounts in any organizational directory, replace "Enter_the_Tenant_Info_Here" value with organizations.
     * - If your application supports Accounts in any organizational directory and personal Microsoft accounts, replace "Enter_the_Tenant_Info_Here" value with common.
     * - To restrict support to Personal Microsoft accounts only, replace "Enter_the_Tenant_Info_Here" value with consumers.
     *
     * Azure B2C authorities are of the form https://\{instance\}/\{tenant\}/\{policy\}. Each policy is considered
     * its own authority. You will have to set the all of the knownAuthorities at the time of the client application
     * construction.
     *
     * ADFS authorities are of the form https://\{instance\}/adfs.
     */
    constructor(configuration: Configuration);
    /**
     * Acquires a token from the authority using OAuth2.0 device code flow.
     * This flow is designed for devices that do not have access to a browser or have input constraints.
     * The authorization server issues a DeviceCode object with a verification code, an end-user code,
     * and the end-user verification URI. The DeviceCode object is provided through a callback, and the end-user should be
     * instructed to use another device to navigate to the verification URI to input credentials.
     * Since the client cannot receive incoming requests, it polls the authorization server repeatedly
     * until the end-user completes input of credentials.
     */
    acquireTokenByDeviceCode(request: DeviceCodeRequest): Promise<AuthenticationResult | null>;
    /**
     * Acquires a token interactively via the browser by requesting an authorization code then exchanging it for a token.
     */
    acquireTokenInteractive(request: InteractiveRequest): Promise<AuthenticationResult>;
    /**
     * Returns a token retrieved either from the cache or by exchanging the refresh token for a fresh access token. If brokering is enabled the token request will be serviced by the broker.
     * @param request - developer provided SilentFlowRequest
     * @returns
     */
    acquireTokenSilent(request: SilentFlowRequest): Promise<AuthenticationResult>;
    /**
     * Removes cache artifacts associated with the given account
     * @param request - developer provided SignOutRequest
     * @returns
     */
    signOut(request: SignOutRequest): Promise<void>;
    /**
     * Returns all cached accounts for this application. If brokering is enabled this request will be serviced by the broker.
     * @returns
     */
    getAllAccounts(): Promise<AccountInfo[]>;
    /**
     * Attempts to retrieve the redirectUri from the loopback server. If the loopback server does not start listening for requests within the timeout this will throw.
     * @param loopbackClient - developer provided custom loopback server implementation
     * @returns
     */
    private waitForRedirectUri;
}
//# sourceMappingURL=PublicClientApplication.d.ts.map
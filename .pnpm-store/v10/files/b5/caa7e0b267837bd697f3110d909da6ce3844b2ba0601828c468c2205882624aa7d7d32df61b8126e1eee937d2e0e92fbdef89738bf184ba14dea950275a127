import type { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import type { DeviceCodeCredentialOptions, DeviceCodeInfo } from "./deviceCodeCredentialOptions.js";
import type { AuthenticationRecord } from "../msal/types.js";
/**
 * Method that logs the user code from the DeviceCodeCredential.
 * @param deviceCodeInfo - The device code.
 */
export declare function defaultDeviceCodePromptCallback(deviceCodeInfo: DeviceCodeInfo): void;
/**
 * Enables authentication to Microsoft Entra ID using a device code
 * that the user can enter into https://microsoft.com/devicelogin.
 */
export declare class DeviceCodeCredential implements TokenCredential {
    private tenantId?;
    private additionallyAllowedTenantIds;
    private disableAutomaticAuthentication?;
    private msalClient;
    private userPromptCallback;
    /**
     * Creates an instance of DeviceCodeCredential with the details needed
     * to initiate the device code authorization flow with Microsoft Entra ID.
     *
     * A message will be logged, giving users a code that they can use to authenticate once they go to https://microsoft.com/devicelogin
     *
     * Developers can configure how this message is shown by passing a custom `userPromptCallback`:
     *
     * ```ts snippet:device_code_credential_example
     * import { DeviceCodeCredential } from "@azure/identity";
     *
     * const credential = new DeviceCodeCredential({
     *   tenantId: process.env.AZURE_TENANT_ID,
     *   clientId: process.env.AZURE_CLIENT_ID,
     *   userPromptCallback: (info) => {
     *     console.log("CUSTOMIZED PROMPT CALLBACK", info.message);
     *   },
     * });
     * ```
     *
     * @param options - Options for configuring the client which makes the authentication requests.
     */
    constructor(options?: DeviceCodeCredentialOptions);
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * If the user provided the option `disableAutomaticAuthentication`,
     * once the token can't be retrieved silently,
     * this method won't attempt to request user interaction to retrieve the token.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    getToken(scopes: string | string[], options?: GetTokenOptions): Promise<AccessToken>;
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * If the token can't be retrieved silently, this method will always generate a challenge for the user.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                  TokenCredential implementation might make.
     */
    authenticate(scopes: string | string[], options?: GetTokenOptions): Promise<AuthenticationRecord | undefined>;
}
//# sourceMappingURL=deviceCodeCredential.d.ts.map
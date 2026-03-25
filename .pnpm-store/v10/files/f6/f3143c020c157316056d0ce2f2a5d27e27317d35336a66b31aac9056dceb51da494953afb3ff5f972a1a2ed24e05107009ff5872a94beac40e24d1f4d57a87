import { ShrOptions } from "../crypto/SignedHttpRequest.js";
import { BaseAuthRequest } from "../request/BaseAuthRequest.js";
import { AuthenticationScheme } from "../utils/Constants.js";
/**
 * Type representing a unique request thumbprint.
 */
export type RequestThumbprint = {
    clientId: string;
    authority: string;
    scopes: Array<string>;
    homeAccountIdentifier?: string;
    claims?: string;
    authenticationScheme?: AuthenticationScheme;
    resourceRequestMethod?: string;
    resourceRequestUri?: string;
    shrClaims?: string;
    sshKid?: string;
    shrOptions?: ShrOptions;
    embeddedClientId?: string;
};
export declare function getRequestThumbprint(clientId: string, request: BaseAuthRequest, homeAccountId?: string): RequestThumbprint;
//# sourceMappingURL=RequestThumbprint.d.ts.map
import { CommonAuthorizationUrlRequest } from "../request/CommonAuthorizationUrlRequest.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
import { AuthOptions } from "../config/ClientConfiguration.js";
import { Logger } from "../logger/Logger.js";
import { Authority } from "../authority/Authority.js";
import { AuthorizationCodePayload } from "../response/AuthorizationCodePayload.js";
import { AuthorizeResponse } from "../response/AuthorizeResponse.js";
import { StringDict } from "../utils/MsalTypes.js";
/**
 * Returns map of parameters that are applicable to all calls to /authorize whether using PKCE or EAR
 * @param config
 * @param request
 * @param logger
 * @param performanceClient
 * @returns
 */
export declare function getStandardAuthorizeRequestParameters(authOptions: AuthOptions, request: CommonAuthorizationUrlRequest, logger: Logger, performanceClient?: IPerformanceClient): Map<string, string>;
/**
 * Returns authorize endpoint with given request parameters in the query string
 * @param authority
 * @param requestParameters
 * @returns
 */
export declare function getAuthorizeUrl(authority: Authority, requestParameters: Map<string, string>, encodeParams?: boolean, extraQueryParameters?: StringDict | undefined): string;
/**
 * Handles the hash fragment response from public client code request. Returns a code response used by
 * the client to exchange for a token in acquireToken.
 * @param serverParams
 * @param cachedState
 */
export declare function getAuthorizationCodePayload(serverParams: AuthorizeResponse, cachedState: string): AuthorizationCodePayload;
/**
 * Function which validates server authorization code response.
 * @param serverResponseHash
 * @param requestState
 */
export declare function validateAuthorizationResponse(serverResponse: AuthorizeResponse, requestState: string): void;
//# sourceMappingURL=Authorize.d.ts.map
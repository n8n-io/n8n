import { BaseApiClient } from "./BaseApiClient.js";
import { IHttpClient } from "../http_client/IHttpClient.js";
import { SignInChallengeRequest, SignInContinuationTokenRequest, SignInInitiateRequest, SignInIntrospectRequest, SignInOobTokenRequest, SignInPasswordTokenRequest } from "./types/ApiRequestTypes.js";
import { SignInChallengeResponse, SignInInitiateResponse, SignInIntrospectResponse, SignInTokenResponse } from "./types/ApiResponseTypes.js";
export declare class SignInApiClient extends BaseApiClient {
    private readonly capabilities?;
    constructor(customAuthApiBaseUrl: string, clientId: string, httpClient: IHttpClient, capabilities?: string, customAuthApiQueryParams?: Record<string, string>);
    /**
     * Initiates the sign-in flow
     * @param username User's email
     * @param authMethod 'email-otp' | 'email-password'
     */
    initiate(params: SignInInitiateRequest): Promise<SignInInitiateResponse>;
    /**
     * Requests authentication challenge (OTP or password validation)
     * @param continuationToken Token from initiate response
     * @param authMethod 'email-otp' | 'email-password'
     */
    requestChallenge(params: SignInChallengeRequest): Promise<SignInChallengeResponse>;
    /**
     * Requests security tokens using either password or OTP
     * @param continuationToken Token from challenge response
     * @param credentials Password or OTP
     * @param authMethod 'email-otp' | 'email-password'
     */
    requestTokensWithPassword(params: SignInPasswordTokenRequest): Promise<SignInTokenResponse>;
    requestTokensWithOob(params: SignInOobTokenRequest): Promise<SignInTokenResponse>;
    requestTokenWithContinuationToken(params: SignInContinuationTokenRequest): Promise<SignInTokenResponse>;
    /**
     * Requests available authentication methods for MFA
     * @param continuationToken Token from previous response
     */
    requestAuthMethods(params: SignInIntrospectRequest): Promise<SignInIntrospectResponse>;
    private requestTokens;
    private static ensureTokenResponseIsValid;
}
//# sourceMappingURL=SignInApiClient.d.ts.map
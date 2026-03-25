import { BaseApiClient } from "./BaseApiClient.js";
import { IHttpClient } from "../http_client/IHttpClient.js";
import { SignUpChallengeRequest, SignUpContinueWithAttributesRequest, SignUpContinueWithOobRequest, SignUpContinueWithPasswordRequest, SignUpStartRequest } from "./types/ApiRequestTypes.js";
import { SignUpChallengeResponse, SignUpContinueResponse, SignUpStartResponse } from "./types/ApiResponseTypes.js";
export declare class SignupApiClient extends BaseApiClient {
    private readonly capabilities?;
    constructor(customAuthApiBaseUrl: string, clientId: string, httpClient: IHttpClient, capabilities?: string, customAuthApiQueryParams?: Record<string, string>);
    /**
     * Start the sign-up flow
     */
    start(params: SignUpStartRequest): Promise<SignUpStartResponse>;
    /**
     * Request challenge (e.g., OTP)
     */
    requestChallenge(params: SignUpChallengeRequest): Promise<SignUpChallengeResponse>;
    /**
     * Continue sign-up flow with code.
     */
    continueWithCode(params: SignUpContinueWithOobRequest): Promise<SignUpContinueResponse>;
    continueWithPassword(params: SignUpContinueWithPasswordRequest): Promise<SignUpContinueResponse>;
    continueWithAttributes(params: SignUpContinueWithAttributesRequest): Promise<SignUpContinueResponse>;
}
//# sourceMappingURL=SignupApiClient.d.ts.map
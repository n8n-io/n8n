import { BaseApiClient } from "./BaseApiClient.js";
import { IHttpClient } from "../http_client/IHttpClient.js";
import { ResetPasswordChallengeRequest, ResetPasswordContinueRequest, ResetPasswordPollCompletionRequest, ResetPasswordStartRequest, ResetPasswordSubmitRequest } from "./types/ApiRequestTypes.js";
import { ResetPasswordChallengeResponse, ResetPasswordContinueResponse, ResetPasswordPollCompletionResponse, ResetPasswordStartResponse, ResetPasswordSubmitResponse } from "./types/ApiResponseTypes.js";
export declare class ResetPasswordApiClient extends BaseApiClient {
    private readonly capabilities?;
    constructor(customAuthApiBaseUrl: string, clientId: string, httpClient: IHttpClient, capabilities?: string, customAuthApiQueryParams?: Record<string, string>);
    /**
     * Start the password reset flow
     */
    start(params: ResetPasswordStartRequest): Promise<ResetPasswordStartResponse>;
    /**
     * Request a challenge (OTP) to be sent to the user's email
     * @param ChallengeResetPasswordRequest Parameters for the challenge request
     */
    requestChallenge(params: ResetPasswordChallengeRequest): Promise<ResetPasswordChallengeResponse>;
    /**
     * Submit the code for verification
     * @param ContinueResetPasswordRequest Token from previous response
     */
    continueWithCode(params: ResetPasswordContinueRequest): Promise<ResetPasswordContinueResponse>;
    /**
     * Submit the new password
     * @param SubmitResetPasswordResponse Token from previous response
     */
    submitNewPassword(params: ResetPasswordSubmitRequest): Promise<ResetPasswordSubmitResponse>;
    /**
     * Poll for password reset completion status
     * @param continuationToken Token from previous response
     */
    pollCompletion(params: ResetPasswordPollCompletionRequest): Promise<ResetPasswordPollCompletionResponse>;
    protected ensurePollStatusIsValid(status: string, correlationId: string): void;
}
//# sourceMappingURL=ResetPasswordApiClient.d.ts.map
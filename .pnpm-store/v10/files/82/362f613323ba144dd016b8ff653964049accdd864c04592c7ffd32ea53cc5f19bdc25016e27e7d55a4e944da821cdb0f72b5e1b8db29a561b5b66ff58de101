import { CustomAuthInteractionClientBase } from "../../core/interaction_client/CustomAuthInteractionClientBase.js";
import { ResetPasswordResendCodeParams, ResetPasswordStartParams, ResetPasswordSubmitCodeParams, ResetPasswordSubmitNewPasswordParams } from "./parameter/ResetPasswordParams.js";
import { ResetPasswordCodeRequiredResult, ResetPasswordCompletedResult, ResetPasswordPasswordRequiredResult } from "./result/ResetPasswordActionResult.js";
export declare class ResetPasswordClient extends CustomAuthInteractionClientBase {
    /**
     * Starts the password reset flow.
     * @param parameters The parameters for starting the password reset flow.
     * @returns The result of password reset start operation.
     */
    start(parameters: ResetPasswordStartParams): Promise<ResetPasswordCodeRequiredResult>;
    /**
     * Submits the code for password reset.
     * @param parameters The parameters for submitting the code for password reset.
     * @returns The result of submitting the code for password reset.
     */
    submitCode(parameters: ResetPasswordSubmitCodeParams): Promise<ResetPasswordPasswordRequiredResult>;
    /**
     * Resends the another one-time passcode if the previous one hasn't been verified
     * @param parameters The parameters for resending the code for password reset.
     * @returns The result of resending the code for password reset.
     */
    resendCode(parameters: ResetPasswordResendCodeParams): Promise<ResetPasswordCodeRequiredResult>;
    /**
     * Submits the new password for password reset.
     * @param parameters The parameters for submitting the new password for password reset.
     * @returns The result of submitting the new password for password reset.
     */
    submitNewPassword(parameters: ResetPasswordSubmitNewPasswordParams): Promise<ResetPasswordCompletedResult>;
    private performChallengeRequest;
    private performPollCompletionRequest;
    private delay;
}
//# sourceMappingURL=ResetPasswordClient.d.ts.map
import { ResetPasswordClient } from "../../interaction_client/ResetPasswordClient.js";
import { SignInClient } from "../../../sign_in/interaction_client/SignInClient.js";
import { CustomAuthSilentCacheClient } from "../../../get_account/interaction_client/CustomAuthSilentCacheClient.js";
import { AuthFlowActionRequiredStateParameters } from "../../../core/auth_flow/AuthFlowState.js";
import { JitClient } from "../../../core/interaction_client/jit/JitClient.js";
import { MfaClient } from "../../../core/interaction_client/mfa/MfaClient.js";
export interface ResetPasswordStateParameters extends AuthFlowActionRequiredStateParameters {
    username: string;
    resetPasswordClient: ResetPasswordClient;
    signInClient: SignInClient;
    cacheClient: CustomAuthSilentCacheClient;
    jitClient: JitClient;
    mfaClient: MfaClient;
}
export type ResetPasswordPasswordRequiredStateParameters = ResetPasswordStateParameters;
export interface ResetPasswordCodeRequiredStateParameters extends ResetPasswordStateParameters {
    codeLength: number;
}
//# sourceMappingURL=ResetPasswordStateParameters.d.ts.map
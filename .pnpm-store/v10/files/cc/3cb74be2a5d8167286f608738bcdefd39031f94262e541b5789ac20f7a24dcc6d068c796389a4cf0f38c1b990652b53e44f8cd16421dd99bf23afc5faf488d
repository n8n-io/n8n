import { AuthFlowActionRequiredStateParameters } from "../../AuthFlowState.js";
import { JitClient } from "../../../interaction_client/jit/JitClient.js";
import { AuthenticationMethod } from "../../../network_client/custom_auth_api/types/ApiResponseTypes.js";
import { CustomAuthSilentCacheClient } from "../../../../get_account/interaction_client/CustomAuthSilentCacheClient.js";
export interface AuthMethodRegistrationStateParameters extends AuthFlowActionRequiredStateParameters {
    jitClient: JitClient;
    cacheClient: CustomAuthSilentCacheClient;
    scopes?: string[];
    username?: string;
    claims?: string;
}
export interface AuthMethodRegistrationRequiredStateParameters extends AuthMethodRegistrationStateParameters {
    authMethods: AuthenticationMethod[];
}
export interface AuthMethodVerificationRequiredStateParameters extends AuthMethodRegistrationStateParameters {
    challengeChannel: string;
    challengeTargetLabel: string;
    codeLength: number;
}
//# sourceMappingURL=AuthMethodRegistrationStateParameters.d.ts.map
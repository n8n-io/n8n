import { GetAccountResult } from "../get_account/auth_flow/result/GetAccountResult.js";
import { SignInResult } from "../sign_in/auth_flow/result/SignInResult.js";
import { SignUpResult } from "../sign_up/auth_flow/result/SignUpResult.js";
import { AccountRetrievalInputs, SignInInputs, SignUpInputs, ResetPasswordInputs } from "../CustomAuthActionInputs.js";
import { CustomAuthOperatingContext } from "../operating_context/CustomAuthOperatingContext.js";
import { ICustomAuthStandardController } from "./ICustomAuthStandardController.js";
import { ResetPasswordStartResult } from "../reset_password/auth_flow/result/ResetPasswordStartResult.js";
import { ICustomAuthApiClient } from "../core/network_client/custom_auth_api/ICustomAuthApiClient.js";
import { StandardController } from "../../controllers/StandardController.js";
export declare class CustomAuthStandardController extends StandardController implements ICustomAuthStandardController {
    private readonly signInClient;
    private readonly signUpClient;
    private readonly resetPasswordClient;
    private readonly jitClient;
    private readonly mfaClient;
    private readonly cacheClient;
    private readonly customAuthConfig;
    private readonly authority;
    constructor(operatingContext: CustomAuthOperatingContext, customAuthApiClient?: ICustomAuthApiClient);
    getCurrentAccount(accountRetrievalInputs?: AccountRetrievalInputs): GetAccountResult;
    signIn(signInInputs: SignInInputs): Promise<SignInResult>;
    signUp(signUpInputs: SignUpInputs): Promise<SignUpResult>;
    resetPassword(resetPasswordInputs: ResetPasswordInputs): Promise<ResetPasswordStartResult>;
    private getCorrelationId;
    private ensureUserNotSignedIn;
}
//# sourceMappingURL=CustomAuthStandardController.d.ts.map
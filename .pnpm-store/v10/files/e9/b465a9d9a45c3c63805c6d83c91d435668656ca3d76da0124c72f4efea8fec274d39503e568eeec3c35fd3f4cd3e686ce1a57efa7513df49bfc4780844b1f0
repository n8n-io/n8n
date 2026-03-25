import { GetAccountResult } from "../get_account/auth_flow/result/GetAccountResult.js";
import { SignInResult } from "../sign_in/auth_flow/result/SignInResult.js";
import { SignUpResult } from "../sign_up/auth_flow/result/SignUpResult.js";
import { AccountRetrievalInputs, ResetPasswordInputs, SignInInputs, SignUpInputs } from "../CustomAuthActionInputs.js";
import { ResetPasswordStartResult } from "../reset_password/auth_flow/result/ResetPasswordStartResult.js";
import { IController } from "../../controllers/IController.js";
export interface ICustomAuthStandardController extends IController {
    getCurrentAccount(accountRetrievalInputs?: AccountRetrievalInputs): GetAccountResult;
    signIn(signInInputs: SignInInputs): Promise<SignInResult>;
    signUp(signUpInputs: SignUpInputs): Promise<SignUpResult>;
    resetPassword(resetPasswordInputs: ResetPasswordInputs): Promise<ResetPasswordStartResult>;
}
//# sourceMappingURL=ICustomAuthStandardController.d.ts.map
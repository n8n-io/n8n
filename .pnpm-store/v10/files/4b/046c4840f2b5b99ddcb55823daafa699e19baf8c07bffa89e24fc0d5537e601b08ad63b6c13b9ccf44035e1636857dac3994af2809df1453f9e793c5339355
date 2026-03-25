import { CustomAuthError } from "../error/CustomAuthError.js";
import { AuthFlowErrorBase } from "./AuthFlowErrorBase.js";
import { AuthFlowStateBase } from "./AuthFlowState.js";
export declare abstract class AuthFlowResultBase<TState extends AuthFlowStateBase, TError extends AuthFlowErrorBase, TData = void> {
    state: TState;
    data?: TData | undefined;
    constructor(state: TState, data?: TData | undefined);
    error?: TError;
    protected static createErrorData(error: unknown): CustomAuthError;
}
//# sourceMappingURL=AuthFlowResultBase.d.ts.map
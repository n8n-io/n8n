import { CustomAuthBrowserConfiguration } from "../../configuration/CustomAuthConfiguration.js";
import { Logger } from "@azure/msal-common/browser";
export interface AuthFlowActionRequiredStateParameters {
    correlationId: string;
    logger: Logger;
    config: CustomAuthBrowserConfiguration;
    continuationToken?: string;
}
/**
 * Base class for the state of an authentication flow.
 */
export declare abstract class AuthFlowStateBase {
    /**
     * The type of the state.
     */
    abstract stateType: string;
}
/**
 * Base class for the action requried state in an authentication flow.
 */
export declare abstract class AuthFlowActionRequiredStateBase<TParameter extends AuthFlowActionRequiredStateParameters> extends AuthFlowStateBase {
    protected readonly stateParameters: TParameter;
    /**
     * Creates a new instance of AuthFlowActionRequiredStateBase.
     * @param stateParameters The parameters for the auth state.
     */
    constructor(stateParameters: TParameter);
    protected ensureCodeIsValid(code: string, codeLength: number): void;
    protected ensurePasswordIsNotEmpty(password: string): void;
}
//# sourceMappingURL=AuthFlowState.d.ts.map
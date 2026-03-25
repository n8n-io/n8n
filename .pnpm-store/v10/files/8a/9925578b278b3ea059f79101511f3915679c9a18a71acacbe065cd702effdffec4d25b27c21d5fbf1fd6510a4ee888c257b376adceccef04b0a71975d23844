/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowActionRequiredStateBase } from '../../../core/auth_flow/AuthFlowState.mjs';
import { ensureArgumentIsNotEmptyString } from '../../../core/utils/ArgumentValidator.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Base state handler for reset password operation.
 */
class ResetPasswordState extends AuthFlowActionRequiredStateBase {
    /*
     * Creates a new state for reset password operation.
     * @param stateParameters - The state parameters for reset-password.
     */
    constructor(stateParameters) {
        super(stateParameters);
        ensureArgumentIsNotEmptyString("username", this.stateParameters.username, this.stateParameters.correlationId);
    }
}

export { ResetPasswordState };
//# sourceMappingURL=ResetPasswordState.mjs.map

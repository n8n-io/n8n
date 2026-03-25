/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowActionRequiredStateBase } from '../../../core/auth_flow/AuthFlowState.mjs';
import { ensureArgumentIsNotEmptyString } from '../../../core/utils/ArgumentValidator.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Base state handler for sign-up flow.
 */
class SignUpState extends AuthFlowActionRequiredStateBase {
    /*
     * Creates a new SignUpState.
     * @param stateParameters - The state parameters for sign-up.
     */
    constructor(stateParameters) {
        super(stateParameters);
        ensureArgumentIsNotEmptyString("username", stateParameters.username, stateParameters.correlationId);
        ensureArgumentIsNotEmptyString("continuationToken", stateParameters.continuationToken, stateParameters.correlationId);
    }
}

export { SignUpState };
//# sourceMappingURL=SignUpState.mjs.map

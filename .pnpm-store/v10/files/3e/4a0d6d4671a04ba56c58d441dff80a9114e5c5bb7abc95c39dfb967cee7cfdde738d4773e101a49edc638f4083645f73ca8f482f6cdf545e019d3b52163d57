/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { InvalidArgumentError } from '../error/InvalidArgumentError.mjs';
import { ensureArgumentIsNotEmptyString } from '../utils/ArgumentValidator.mjs';
import { DefaultCustomAuthApiCodeLength } from '../../CustomAuthConstants.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Base class for the state of an authentication flow.
 */
class AuthFlowStateBase {
}
/**
 * Base class for the action requried state in an authentication flow.
 */
class AuthFlowActionRequiredStateBase extends AuthFlowStateBase {
    /**
     * Creates a new instance of AuthFlowActionRequiredStateBase.
     * @param stateParameters The parameters for the auth state.
     */
    constructor(stateParameters) {
        ensureArgumentIsNotEmptyString("correlationId", stateParameters.correlationId);
        super();
        this.stateParameters = stateParameters;
    }
    ensureCodeIsValid(code, codeLength) {
        if (codeLength !== DefaultCustomAuthApiCodeLength &&
            (!code || code.length !== codeLength)) {
            this.stateParameters.logger.error("Code parameter is not provided or invalid for authentication flow.", this.stateParameters.correlationId);
            throw new InvalidArgumentError("code", this.stateParameters.correlationId);
        }
    }
    ensurePasswordIsNotEmpty(password) {
        if (!password) {
            this.stateParameters.logger.error("Password parameter is not provided for authentication flow.", this.stateParameters.correlationId);
            throw new InvalidArgumentError("password", this.stateParameters.correlationId);
        }
    }
}

export { AuthFlowActionRequiredStateBase, AuthFlowStateBase };
//# sourceMappingURL=AuthFlowState.mjs.map

/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { ResetPasswordApiClient } from './ResetPasswordApiClient.mjs';
import { SignupApiClient } from './SignupApiClient.mjs';
import { SignInApiClient } from './SignInApiClient.mjs';
import { RegisterApiClient } from './RegisterApiClient.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class CustomAuthApiClient {
    constructor(customAuthApiBaseUrl, clientId, httpClient, capabilities, customAuthApiQueryParams) {
        this.signInApi = new SignInApiClient(customAuthApiBaseUrl, clientId, httpClient, capabilities, customAuthApiQueryParams);
        this.signUpApi = new SignupApiClient(customAuthApiBaseUrl, clientId, httpClient, capabilities, customAuthApiQueryParams);
        this.resetPasswordApi = new ResetPasswordApiClient(customAuthApiBaseUrl, clientId, httpClient, capabilities, customAuthApiQueryParams);
        this.registerApi = new RegisterApiClient(customAuthApiBaseUrl, clientId, httpClient, customAuthApiQueryParams);
    }
}

export { CustomAuthApiClient };
//# sourceMappingURL=CustomAuthApiClient.mjs.map

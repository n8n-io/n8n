/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ResetPasswordApiClient } from "./ResetPasswordApiClient.js";
import { SignupApiClient } from "./SignupApiClient.js";
import { SignInApiClient } from "./SignInApiClient.js";
import { RegisterApiClient } from "./RegisterApiClient.js";
import { ICustomAuthApiClient } from "./ICustomAuthApiClient.js";
import { IHttpClient } from "../http_client/IHttpClient.js";

export class CustomAuthApiClient implements ICustomAuthApiClient {
    signInApi: SignInApiClient;
    signUpApi: SignupApiClient;
    resetPasswordApi: ResetPasswordApiClient;
    registerApi: RegisterApiClient;

    constructor(
        customAuthApiBaseUrl: string,
        clientId: string,
        httpClient: IHttpClient,
        capabilities?: string,
        customAuthApiQueryParams?: Record<string, string>
    ) {
        this.signInApi = new SignInApiClient(
            customAuthApiBaseUrl,
            clientId,
            httpClient,
            capabilities,
            customAuthApiQueryParams
        );
        this.signUpApi = new SignupApiClient(
            customAuthApiBaseUrl,
            clientId,
            httpClient,
            capabilities,
            customAuthApiQueryParams
        );
        this.resetPasswordApi = new ResetPasswordApiClient(
            customAuthApiBaseUrl,
            clientId,
            httpClient,
            capabilities,
            customAuthApiQueryParams
        );
        this.registerApi = new RegisterApiClient(
            customAuthApiBaseUrl,
            clientId,
            httpClient,
            customAuthApiQueryParams
        );
    }
}

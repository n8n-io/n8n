/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ClientAuthErrorCodes,
    createClientAuthError,
} from "../error/ClientAuthError.js";
import { NetworkResponse } from "./NetworkResponse.js";

/**
 * Options allowed by network request APIs.
 */
export type NetworkRequestOptions = {
    headers?: Record<string, string>;
    body?: string;
};

/**
 * Client network interface to send backend requests.
 * @interface
 */
export interface INetworkModule {
    /**
     * Interface function for async network "GET" requests. Based on the Fetch standard: https://fetch.spec.whatwg.org/
     * @param url
     * @param requestParams
     * @param enableCaching
     */
    sendGetRequestAsync<T>(
        url: string,
        options?: NetworkRequestOptions,
        timeout?: number
    ): Promise<NetworkResponse<T>>;

    /**
     * Interface function for async network "POST" requests. Based on the Fetch standard: https://fetch.spec.whatwg.org/
     * @param url
     * @param requestParams
     * @param enableCaching
     */
    sendPostRequestAsync<T>(
        url: string,
        options?: NetworkRequestOptions
    ): Promise<NetworkResponse<T>>;
}

export const StubbedNetworkModule: INetworkModule = {
    sendGetRequestAsync: () => {
        return Promise.reject(
            createClientAuthError(ClientAuthErrorCodes.methodNotImplemented)
        );
    },
    sendPostRequestAsync: () => {
        return Promise.reject(
            createClientAuthError(ClientAuthErrorCodes.methodNotImplemented)
        );
    },
};

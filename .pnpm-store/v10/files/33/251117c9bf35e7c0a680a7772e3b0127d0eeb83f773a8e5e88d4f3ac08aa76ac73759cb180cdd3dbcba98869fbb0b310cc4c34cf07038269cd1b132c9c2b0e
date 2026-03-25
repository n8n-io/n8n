/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { StatusCodes } from '../statusCodes';
import { InvokeResponse } from './invokeResponse';
/**
 * Represents an exception that occurs during an invoke operation.
 */
export declare class InvokeException<T = unknown> extends Error {
    private readonly status;
    private readonly response?;
    /**
     * Creates a new instance of InvokeException.
     * @param status The status code of the exception.
     * @param response The optional response body.
     */
    constructor(status: StatusCodes, response?: T | undefined);
    /**
     * Creates an invoke response from the exception.
     * @returns The invoke response.
     */
    createInvokeResponse(): InvokeResponse;
}

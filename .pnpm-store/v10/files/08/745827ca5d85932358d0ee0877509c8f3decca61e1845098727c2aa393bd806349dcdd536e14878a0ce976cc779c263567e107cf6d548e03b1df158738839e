/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { StatusCodes } from '../statusCodes'
import { InvokeResponse } from './invokeResponse'

/**
 * Represents an exception that occurs during an invoke operation.
 */
export class InvokeException<T = unknown> extends Error {
  /**
   * Creates a new instance of InvokeException.
   * @param status The status code of the exception.
   * @param response The optional response body.
   */
  constructor (private readonly status: StatusCodes, private readonly response?: T) {
    super()
    this.name = 'InvokeException'
  }

  /**
   * Creates an invoke response from the exception.
   * @returns The invoke response.
   */
  createInvokeResponse (): InvokeResponse {
    return {
      status: this.status,
      body: this.response
    }
  }
}

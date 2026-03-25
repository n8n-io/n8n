/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Represents a query with pagination and parameters.
 * @typeParam TParams - The type of the query parameters.
 */
export interface Query<TParams extends Record<string, any>> {
  /**
   * The number of items to retrieve.
   */
  count: number;

  /**
   * The number of items to skip.
   */
  skip: number;

  /**
   * The parameters for the query.
   */
  parameters: TParams;
}

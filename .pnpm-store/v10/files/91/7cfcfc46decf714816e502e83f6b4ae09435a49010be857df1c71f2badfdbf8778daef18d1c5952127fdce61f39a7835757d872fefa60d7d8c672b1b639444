// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../resource';
import * as Core from '../core';

export class Batches extends APIResource {
  /**
   * Creates and executes a batch from an uploaded file of requests
   */
  create(body: BatchCreateParams, options?: Core.RequestOptions): Core.APIPromise<BatchCreateResponse> {
    return this._client.post('/openai/v1/batches', { body, ...options });
  }

  /**
   * Retrieves a batch.
   */
  retrieve(batchId: string, options?: Core.RequestOptions): Core.APIPromise<BatchRetrieveResponse> {
    return this._client.get(`/openai/v1/batches/${batchId}`, options);
  }

  /**
   * List your organization's batches.
   */
  list(options?: Core.RequestOptions): Core.APIPromise<BatchListResponse> {
    return this._client.get('/openai/v1/batches', options);
  }

  /**
   * Cancels a batch.
   */
  cancel(batchId: string, options?: Core.RequestOptions): Core.APIPromise<BatchCancelResponse> {
    return this._client.post(`/openai/v1/batches/${batchId}/cancel`, options);
  }
}

export interface BatchCreateResponse {
  id: string;

  /**
   * The time frame within which the batch should be processed.
   */
  completion_window: string;

  /**
   * The Unix timestamp (in seconds) for when the batch was created.
   */
  created_at: number;

  /**
   * The API endpoint used by the batch.
   */
  endpoint: string;

  /**
   * The ID of the input file for the batch.
   */
  input_file_id: string;

  /**
   * The object type, which is always `batch`.
   */
  object: 'batch';

  /**
   * The current status of the batch.
   */
  status:
    | 'validating'
    | 'failed'
    | 'in_progress'
    | 'finalizing'
    | 'completed'
    | 'expired'
    | 'cancelling'
    | 'cancelled';

  /**
   * The Unix timestamp (in seconds) for when the batch was cancelled.
   */
  cancelled_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch started cancelling.
   */
  cancelling_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch was completed.
   */
  completed_at?: number;

  /**
   * The ID of the file containing the outputs of requests with errors.
   */
  error_file_id?: string;

  errors?: BatchCreateResponse.Errors;

  /**
   * The Unix timestamp (in seconds) for when the batch expired.
   */
  expired_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch will expire.
   */
  expires_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch failed.
   */
  failed_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch started finalizing.
   */
  finalizing_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch started processing.
   */
  in_progress_at?: number;

  /**
   * Set of key-value pairs that can be attached to an object. This can be useful for
   * storing additional information about the object in a structured format.
   */
  metadata?: unknown | null;

  /**
   * The ID of the file containing the outputs of successfully executed requests.
   */
  output_file_id?: string;

  /**
   * The request counts for different statuses within the batch.
   */
  request_counts?: BatchCreateResponse.RequestCounts;
}

export namespace BatchCreateResponse {
  export interface Errors {
    data?: Array<Errors.Data>;

    /**
     * The object type, which is always `list`.
     */
    object?: string;
  }

  export namespace Errors {
    export interface Data {
      /**
       * An error code identifying the error type.
       */
      code?: string;

      /**
       * The line number of the input file where the error occurred, if applicable.
       */
      line?: number | null;

      /**
       * A human-readable message providing more details about the error.
       */
      message?: string;

      /**
       * The name of the parameter that caused the error, if applicable.
       */
      param?: string | null;
    }
  }

  /**
   * The request counts for different statuses within the batch.
   */
  export interface RequestCounts {
    /**
     * Number of requests that have been completed successfully.
     */
    completed: number;

    /**
     * Number of requests that have failed.
     */
    failed: number;

    /**
     * Total number of requests in the batch.
     */
    total: number;
  }
}

export interface BatchRetrieveResponse {
  id: string;

  /**
   * The time frame within which the batch should be processed.
   */
  completion_window: string;

  /**
   * The Unix timestamp (in seconds) for when the batch was created.
   */
  created_at: number;

  /**
   * The API endpoint used by the batch.
   */
  endpoint: string;

  /**
   * The ID of the input file for the batch.
   */
  input_file_id: string;

  /**
   * The object type, which is always `batch`.
   */
  object: 'batch';

  /**
   * The current status of the batch.
   */
  status:
    | 'validating'
    | 'failed'
    | 'in_progress'
    | 'finalizing'
    | 'completed'
    | 'expired'
    | 'cancelling'
    | 'cancelled';

  /**
   * The Unix timestamp (in seconds) for when the batch was cancelled.
   */
  cancelled_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch started cancelling.
   */
  cancelling_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch was completed.
   */
  completed_at?: number;

  /**
   * The ID of the file containing the outputs of requests with errors.
   */
  error_file_id?: string;

  errors?: BatchRetrieveResponse.Errors;

  /**
   * The Unix timestamp (in seconds) for when the batch expired.
   */
  expired_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch will expire.
   */
  expires_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch failed.
   */
  failed_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch started finalizing.
   */
  finalizing_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch started processing.
   */
  in_progress_at?: number;

  /**
   * Set of key-value pairs that can be attached to an object. This can be useful for
   * storing additional information about the object in a structured format.
   */
  metadata?: unknown | null;

  /**
   * The ID of the file containing the outputs of successfully executed requests.
   */
  output_file_id?: string;

  /**
   * The request counts for different statuses within the batch.
   */
  request_counts?: BatchRetrieveResponse.RequestCounts;
}

export namespace BatchRetrieveResponse {
  export interface Errors {
    data?: Array<Errors.Data>;

    /**
     * The object type, which is always `list`.
     */
    object?: string;
  }

  export namespace Errors {
    export interface Data {
      /**
       * An error code identifying the error type.
       */
      code?: string;

      /**
       * The line number of the input file where the error occurred, if applicable.
       */
      line?: number | null;

      /**
       * A human-readable message providing more details about the error.
       */
      message?: string;

      /**
       * The name of the parameter that caused the error, if applicable.
       */
      param?: string | null;
    }
  }

  /**
   * The request counts for different statuses within the batch.
   */
  export interface RequestCounts {
    /**
     * Number of requests that have been completed successfully.
     */
    completed: number;

    /**
     * Number of requests that have failed.
     */
    failed: number;

    /**
     * Total number of requests in the batch.
     */
    total: number;
  }
}

export interface BatchListResponse {
  data: Array<BatchListResponse.Data>;

  object: 'list';
}

export namespace BatchListResponse {
  export interface Data {
    id: string;

    /**
     * The time frame within which the batch should be processed.
     */
    completion_window: string;

    /**
     * The Unix timestamp (in seconds) for when the batch was created.
     */
    created_at: number;

    /**
     * The API endpoint used by the batch.
     */
    endpoint: string;

    /**
     * The ID of the input file for the batch.
     */
    input_file_id: string;

    /**
     * The object type, which is always `batch`.
     */
    object: 'batch';

    /**
     * The current status of the batch.
     */
    status:
      | 'validating'
      | 'failed'
      | 'in_progress'
      | 'finalizing'
      | 'completed'
      | 'expired'
      | 'cancelling'
      | 'cancelled';

    /**
     * The Unix timestamp (in seconds) for when the batch was cancelled.
     */
    cancelled_at?: number;

    /**
     * The Unix timestamp (in seconds) for when the batch started cancelling.
     */
    cancelling_at?: number;

    /**
     * The Unix timestamp (in seconds) for when the batch was completed.
     */
    completed_at?: number;

    /**
     * The ID of the file containing the outputs of requests with errors.
     */
    error_file_id?: string;

    errors?: Data.Errors;

    /**
     * The Unix timestamp (in seconds) for when the batch expired.
     */
    expired_at?: number;

    /**
     * The Unix timestamp (in seconds) for when the batch will expire.
     */
    expires_at?: number;

    /**
     * The Unix timestamp (in seconds) for when the batch failed.
     */
    failed_at?: number;

    /**
     * The Unix timestamp (in seconds) for when the batch started finalizing.
     */
    finalizing_at?: number;

    /**
     * The Unix timestamp (in seconds) for when the batch started processing.
     */
    in_progress_at?: number;

    /**
     * Set of key-value pairs that can be attached to an object. This can be useful for
     * storing additional information about the object in a structured format.
     */
    metadata?: unknown | null;

    /**
     * The ID of the file containing the outputs of successfully executed requests.
     */
    output_file_id?: string;

    /**
     * The request counts for different statuses within the batch.
     */
    request_counts?: Data.RequestCounts;
  }

  export namespace Data {
    export interface Errors {
      data?: Array<Errors.Data>;

      /**
       * The object type, which is always `list`.
       */
      object?: string;
    }

    export namespace Errors {
      export interface Data {
        /**
         * An error code identifying the error type.
         */
        code?: string;

        /**
         * The line number of the input file where the error occurred, if applicable.
         */
        line?: number | null;

        /**
         * A human-readable message providing more details about the error.
         */
        message?: string;

        /**
         * The name of the parameter that caused the error, if applicable.
         */
        param?: string | null;
      }
    }

    /**
     * The request counts for different statuses within the batch.
     */
    export interface RequestCounts {
      /**
       * Number of requests that have been completed successfully.
       */
      completed: number;

      /**
       * Number of requests that have failed.
       */
      failed: number;

      /**
       * Total number of requests in the batch.
       */
      total: number;
    }
  }
}

export interface BatchCancelResponse {
  id: string;

  /**
   * The time frame within which the batch should be processed.
   */
  completion_window: string;

  /**
   * The Unix timestamp (in seconds) for when the batch was created.
   */
  created_at: number;

  /**
   * The API endpoint used by the batch.
   */
  endpoint: string;

  /**
   * The ID of the input file for the batch.
   */
  input_file_id: string;

  /**
   * The object type, which is always `batch`.
   */
  object: 'batch';

  /**
   * The current status of the batch.
   */
  status:
    | 'validating'
    | 'failed'
    | 'in_progress'
    | 'finalizing'
    | 'completed'
    | 'expired'
    | 'cancelling'
    | 'cancelled';

  /**
   * The Unix timestamp (in seconds) for when the batch was cancelled.
   */
  cancelled_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch started cancelling.
   */
  cancelling_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch was completed.
   */
  completed_at?: number;

  /**
   * The ID of the file containing the outputs of requests with errors.
   */
  error_file_id?: string;

  errors?: BatchCancelResponse.Errors;

  /**
   * The Unix timestamp (in seconds) for when the batch expired.
   */
  expired_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch will expire.
   */
  expires_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch failed.
   */
  failed_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch started finalizing.
   */
  finalizing_at?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch started processing.
   */
  in_progress_at?: number;

  /**
   * Set of key-value pairs that can be attached to an object. This can be useful for
   * storing additional information about the object in a structured format.
   */
  metadata?: unknown | null;

  /**
   * The ID of the file containing the outputs of successfully executed requests.
   */
  output_file_id?: string;

  /**
   * The request counts for different statuses within the batch.
   */
  request_counts?: BatchCancelResponse.RequestCounts;
}

export namespace BatchCancelResponse {
  export interface Errors {
    data?: Array<Errors.Data>;

    /**
     * The object type, which is always `list`.
     */
    object?: string;
  }

  export namespace Errors {
    export interface Data {
      /**
       * An error code identifying the error type.
       */
      code?: string;

      /**
       * The line number of the input file where the error occurred, if applicable.
       */
      line?: number | null;

      /**
       * A human-readable message providing more details about the error.
       */
      message?: string;

      /**
       * The name of the parameter that caused the error, if applicable.
       */
      param?: string | null;
    }
  }

  /**
   * The request counts for different statuses within the batch.
   */
  export interface RequestCounts {
    /**
     * Number of requests that have been completed successfully.
     */
    completed: number;

    /**
     * Number of requests that have failed.
     */
    failed: number;

    /**
     * Total number of requests in the batch.
     */
    total: number;
  }
}

export interface BatchCreateParams {
  /**
   * The time frame within which the batch should be processed. Currently only `24h`
   * is supported.
   */
  completion_window: '24h';

  /**
   * The endpoint to be used for all requests in the batch. Currently
   * `/v1/chat/completions` is supported.
   */
  endpoint: '/v1/chat/completions';

  /**
   * The ID of an uploaded file that contains requests for the new batch.
   *
   * See [upload file](/docs/api-reference#files-upload) for how to upload a file.
   *
   * Your input file must be formatted as a [JSONL file](/docs/batch), and must be
   * uploaded with the purpose `batch`. The file can be up to 100 MB in size.
   */
  input_file_id: string;

  /**
   * Optional custom metadata for the batch.
   */
  metadata?: Record<string, string> | null;
}

export declare namespace Batches {
  export {
    type BatchCreateResponse as BatchCreateResponse,
    type BatchRetrieveResponse as BatchRetrieveResponse,
    type BatchListResponse as BatchListResponse,
    type BatchCancelResponse as BatchCancelResponse,
    type BatchCreateParams as BatchCreateParams,
  };
}

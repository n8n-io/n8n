// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../resource';
import { isRequestOptions } from '../core';
import * as Core from '../core';
import * as BatchesAPI from './batches';
import * as Shared from './shared';
import { CursorPage, type CursorPageParams } from '../pagination';

export class Batches extends APIResource {
  /**
   * Creates and executes a batch from an uploaded file of requests
   */
  create(body: BatchCreateParams, options?: Core.RequestOptions): Core.APIPromise<Batch> {
    return this._client.post('/batches', { body, ...options });
  }

  /**
   * Retrieves a batch.
   */
  retrieve(batchId: string, options?: Core.RequestOptions): Core.APIPromise<Batch> {
    return this._client.get(`/batches/${batchId}`, options);
  }

  /**
   * List your organization's batches.
   */
  list(query?: BatchListParams, options?: Core.RequestOptions): Core.PagePromise<BatchesPage, Batch>;
  list(options?: Core.RequestOptions): Core.PagePromise<BatchesPage, Batch>;
  list(
    query: BatchListParams | Core.RequestOptions = {},
    options?: Core.RequestOptions,
  ): Core.PagePromise<BatchesPage, Batch> {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.getAPIList('/batches', BatchesPage, { query, ...options });
  }

  /**
   * Cancels an in-progress batch. The batch will be in status `cancelling` for up to
   * 10 minutes, before changing to `cancelled`, where it will have partial results
   * (if any) available in the output file.
   */
  cancel(batchId: string, options?: Core.RequestOptions): Core.APIPromise<Batch> {
    return this._client.post(`/batches/${batchId}/cancel`, options);
  }
}

export class BatchesPage extends CursorPage<Batch> {}

export interface Batch {
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
   * The OpenAI API endpoint used by the batch.
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

  errors?: Batch.Errors;

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
   * Set of 16 key-value pairs that can be attached to an object. This can be useful
   * for storing additional information about the object in a structured format, and
   * querying for objects via API or the dashboard.
   *
   * Keys are strings with a maximum length of 64 characters. Values are strings with
   * a maximum length of 512 characters.
   */
  metadata?: Shared.Metadata | null;

  /**
   * The ID of the file containing the outputs of successfully executed requests.
   */
  output_file_id?: string;

  /**
   * The request counts for different statuses within the batch.
   */
  request_counts?: BatchRequestCounts;
}

export namespace Batch {
  export interface Errors {
    data?: Array<BatchesAPI.BatchError>;

    /**
     * The object type, which is always `list`.
     */
    object?: string;
  }
}

export interface BatchError {
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

/**
 * The request counts for different statuses within the batch.
 */
export interface BatchRequestCounts {
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

export interface BatchCreateParams {
  /**
   * The time frame within which the batch should be processed. Currently only `24h`
   * is supported.
   */
  completion_window: '24h';

  /**
   * The endpoint to be used for all requests in the batch. Currently
   * `/v1/responses`, `/v1/chat/completions`, `/v1/embeddings`, and `/v1/completions`
   * are supported. Note that `/v1/embeddings` batches are also restricted to a
   * maximum of 50,000 embedding inputs across all requests in the batch.
   */
  endpoint: '/v1/responses' | '/v1/chat/completions' | '/v1/embeddings' | '/v1/completions';

  /**
   * The ID of an uploaded file that contains requests for the new batch.
   *
   * See [upload file](https://platform.openai.com/docs/api-reference/files/create)
   * for how to upload a file.
   *
   * Your input file must be formatted as a
   * [JSONL file](https://platform.openai.com/docs/api-reference/batch/request-input),
   * and must be uploaded with the purpose `batch`. The file can contain up to 50,000
   * requests, and can be up to 200 MB in size.
   */
  input_file_id: string;

  /**
   * Set of 16 key-value pairs that can be attached to an object. This can be useful
   * for storing additional information about the object in a structured format, and
   * querying for objects via API or the dashboard.
   *
   * Keys are strings with a maximum length of 64 characters. Values are strings with
   * a maximum length of 512 characters.
   */
  metadata?: Shared.Metadata | null;
}

export interface BatchListParams extends CursorPageParams {}

Batches.BatchesPage = BatchesPage;

export declare namespace Batches {
  export {
    type Batch as Batch,
    type BatchError as BatchError,
    type BatchRequestCounts as BatchRequestCounts,
    BatchesPage as BatchesPage,
    type BatchCreateParams as BatchCreateParams,
    type BatchListParams as BatchListParams,
  };
}

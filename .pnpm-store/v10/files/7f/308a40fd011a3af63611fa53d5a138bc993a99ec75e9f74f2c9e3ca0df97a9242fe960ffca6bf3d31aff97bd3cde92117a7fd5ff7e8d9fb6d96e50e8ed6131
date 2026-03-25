// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../resource';
import * as Core from '../core';

export class Files extends APIResource {
  /**
   * Upload a file that can be used across various endpoints.
   *
   * The Batch API only supports `.jsonl` files up to 100 MB in size. The input also
   * has a specific required [format](/docs/batch).
   *
   * Please contact us if you need to increase these storage limits.
   */
  create(body: FileCreateParams, options?: Core.RequestOptions): Core.APIPromise<FileCreateResponse> {
    return this._client.post('/openai/v1/files', Core.multipartFormRequestOptions({ body, ...options }));
  }

  /**
   * Returns a list of files.
   */
  list(options?: Core.RequestOptions): Core.APIPromise<FileListResponse> {
    return this._client.get('/openai/v1/files', options);
  }

  /**
   * Delete a file.
   */
  delete(fileId: string, options?: Core.RequestOptions): Core.APIPromise<FileDeleteResponse> {
    return this._client.delete(`/openai/v1/files/${fileId}`, options);
  }

  /**
   * Returns the contents of the specified file.
   */
  content(fileId: string, options?: Core.RequestOptions): Core.APIPromise<string> {
    return this._client.get(`/openai/v1/files/${fileId}/content`, options);
  }

  /**
   * Returns information about a file.
   */
  info(fileId: string, options?: Core.RequestOptions): Core.APIPromise<FileInfoResponse> {
    return this._client.get(`/openai/v1/files/${fileId}`, options);
  }
}

/**
 * The `File` object represents a document that has been uploaded.
 */
export interface FileCreateResponse {
  /**
   * The file identifier, which can be referenced in the API endpoints.
   */
  id?: string;

  /**
   * The size of the file, in bytes.
   */
  bytes?: number;

  /**
   * The Unix timestamp (in seconds) for when the file was created.
   */
  created_at?: number;

  /**
   * The name of the file.
   */
  filename?: string;

  /**
   * The object type, which is always `file`.
   */
  object?: 'file';

  /**
   * The intended purpose of the file. Supported values are `batch`, and
   * `batch_output`.
   */
  purpose?: 'batch' | 'batch_output';
}

export interface FileListResponse {
  data: Array<FileListResponse.Data>;

  object: 'list';
}

export namespace FileListResponse {
  /**
   * The `File` object represents a document that has been uploaded.
   */
  export interface Data {
    /**
     * The file identifier, which can be referenced in the API endpoints.
     */
    id?: string;

    /**
     * The size of the file, in bytes.
     */
    bytes?: number;

    /**
     * The Unix timestamp (in seconds) for when the file was created.
     */
    created_at?: number;

    /**
     * The name of the file.
     */
    filename?: string;

    /**
     * The object type, which is always `file`.
     */
    object?: 'file';

    /**
     * The intended purpose of the file. Supported values are `batch`, and
     * `batch_output`.
     */
    purpose?: 'batch' | 'batch_output';
  }
}

export interface FileDeleteResponse {
  id: string;

  deleted: boolean;

  object: 'file';
}

export type FileContentResponse = string;

/**
 * The `File` object represents a document that has been uploaded.
 */
export interface FileInfoResponse {
  /**
   * The file identifier, which can be referenced in the API endpoints.
   */
  id?: string;

  /**
   * The size of the file, in bytes.
   */
  bytes?: number;

  /**
   * The Unix timestamp (in seconds) for when the file was created.
   */
  created_at?: number;

  /**
   * The name of the file.
   */
  filename?: string;

  /**
   * The object type, which is always `file`.
   */
  object?: 'file';

  /**
   * The intended purpose of the file. Supported values are `batch`, and
   * `batch_output`.
   */
  purpose?: 'batch' | 'batch_output';
}

export interface FileCreateParams {
  /**
   * The File object (not file name) to be uploaded.
   */
  file: Core.Uploadable;

  /**
   * The intended purpose of the uploaded file. Use "batch" for
   * [Batch API](/docs/api-reference#batches).
   */
  purpose: 'batch';
}

export declare namespace Files {
  export {
    type FileCreateResponse as FileCreateResponse,
    type FileListResponse as FileListResponse,
    type FileDeleteResponse as FileDeleteResponse,
    type FileContentResponse as FileContentResponse,
    type FileInfoResponse as FileInfoResponse,
    type FileCreateParams as FileCreateParams,
  };
}

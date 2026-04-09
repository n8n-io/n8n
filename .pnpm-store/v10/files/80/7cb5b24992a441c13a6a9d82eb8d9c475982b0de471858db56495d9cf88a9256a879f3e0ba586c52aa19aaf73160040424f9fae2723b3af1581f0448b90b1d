// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../resource';
import { isRequestOptions } from '../core';
import { sleep } from '../core';
import { APIConnectionTimeoutError } from '../error';
import * as Core from '../core';
import { CursorPage, type CursorPageParams } from '../pagination';
import { type Response } from '../_shims/index';

export class Files extends APIResource {
  /**
   * Upload a file that can be used across various endpoints. Individual files can be
   * up to 512 MB, and the size of all files uploaded by one organization can be up
   * to 100 GB.
   *
   * The Assistants API supports files up to 2 million tokens and of specific file
   * types. See the
   * [Assistants Tools guide](https://platform.openai.com/docs/assistants/tools) for
   * details.
   *
   * The Fine-tuning API only supports `.jsonl` files. The input also has certain
   * required formats for fine-tuning
   * [chat](https://platform.openai.com/docs/api-reference/fine-tuning/chat-input) or
   * [completions](https://platform.openai.com/docs/api-reference/fine-tuning/completions-input)
   * models.
   *
   * The Batch API only supports `.jsonl` files up to 200 MB in size. The input also
   * has a specific required
   * [format](https://platform.openai.com/docs/api-reference/batch/request-input).
   *
   * Please [contact us](https://help.openai.com/) if you need to increase these
   * storage limits.
   */
  create(body: FileCreateParams, options?: Core.RequestOptions): Core.APIPromise<FileObject> {
    return this._client.post('/files', Core.multipartFormRequestOptions({ body, ...options }));
  }

  /**
   * Returns information about a specific file.
   */
  retrieve(fileId: string, options?: Core.RequestOptions): Core.APIPromise<FileObject> {
    return this._client.get(`/files/${fileId}`, options);
  }

  /**
   * Returns a list of files.
   */
  list(query?: FileListParams, options?: Core.RequestOptions): Core.PagePromise<FileObjectsPage, FileObject>;
  list(options?: Core.RequestOptions): Core.PagePromise<FileObjectsPage, FileObject>;
  list(
    query: FileListParams | Core.RequestOptions = {},
    options?: Core.RequestOptions,
  ): Core.PagePromise<FileObjectsPage, FileObject> {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.getAPIList('/files', FileObjectsPage, { query, ...options });
  }

  /**
   * Delete a file.
   */
  del(fileId: string, options?: Core.RequestOptions): Core.APIPromise<FileDeleted> {
    return this._client.delete(`/files/${fileId}`, options);
  }

  /**
   * Returns the contents of the specified file.
   */
  content(fileId: string, options?: Core.RequestOptions): Core.APIPromise<Response> {
    return this._client.get(`/files/${fileId}/content`, { ...options, __binaryResponse: true });
  }

  /**
   * Returns the contents of the specified file.
   *
   * @deprecated The `.content()` method should be used instead
   */
  retrieveContent(fileId: string, options?: Core.RequestOptions): Core.APIPromise<string> {
    return this._client.get(`/files/${fileId}/content`, {
      ...options,
      headers: { Accept: 'application/json', ...options?.headers },
    });
  }

  /**
   * Waits for the given file to be processed, default timeout is 30 mins.
   */
  async waitForProcessing(
    id: string,
    { pollInterval = 5000, maxWait = 30 * 60 * 1000 }: { pollInterval?: number; maxWait?: number } = {},
  ): Promise<FileObject> {
    const TERMINAL_STATES = new Set(['processed', 'error', 'deleted']);

    const start = Date.now();
    let file = await this.retrieve(id);

    while (!file.status || !TERMINAL_STATES.has(file.status)) {
      await sleep(pollInterval);

      file = await this.retrieve(id);
      if (Date.now() - start > maxWait) {
        throw new APIConnectionTimeoutError({
          message: `Giving up on waiting for file ${id} to finish processing after ${maxWait} milliseconds.`,
        });
      }
    }

    return file;
  }
}

export class FileObjectsPage extends CursorPage<FileObject> {}

export type FileContent = string;

export interface FileDeleted {
  id: string;

  deleted: boolean;

  object: 'file';
}

/**
 * The `File` object represents a document that has been uploaded to OpenAI.
 */
export interface FileObject {
  /**
   * The file identifier, which can be referenced in the API endpoints.
   */
  id: string;

  /**
   * The size of the file, in bytes.
   */
  bytes: number;

  /**
   * The Unix timestamp (in seconds) for when the file was created.
   */
  created_at: number;

  /**
   * The name of the file.
   */
  filename: string;

  /**
   * The object type, which is always `file`.
   */
  object: 'file';

  /**
   * The intended purpose of the file. Supported values are `assistants`,
   * `assistants_output`, `batch`, `batch_output`, `fine-tune`, `fine-tune-results`
   * and `vision`.
   */
  purpose:
    | 'assistants'
    | 'assistants_output'
    | 'batch'
    | 'batch_output'
    | 'fine-tune'
    | 'fine-tune-results'
    | 'vision';

  /**
   * @deprecated: Deprecated. The current status of the file, which can be either
   * `uploaded`, `processed`, or `error`.
   */
  status: 'uploaded' | 'processed' | 'error';

  /**
   * @deprecated: Deprecated. For details on why a fine-tuning training file failed
   * validation, see the `error` field on `fine_tuning.job`.
   */
  status_details?: string;
}

/**
 * The intended purpose of the uploaded file.
 *
 * Use "assistants" for
 * [Assistants](https://platform.openai.com/docs/api-reference/assistants) and
 * [Message](https://platform.openai.com/docs/api-reference/messages) files,
 * "vision" for Assistants image file inputs, "batch" for
 * [Batch API](https://platform.openai.com/docs/guides/batch), and "fine-tune" for
 * [Fine-tuning](https://platform.openai.com/docs/api-reference/fine-tuning).
 */
export type FilePurpose = 'assistants' | 'batch' | 'fine-tune' | 'vision';

export interface FileCreateParams {
  /**
   * The File object (not file name) to be uploaded.
   */
  file: Core.Uploadable;

  /**
   * The intended purpose of the uploaded file.
   *
   * Use "assistants" for
   * [Assistants](https://platform.openai.com/docs/api-reference/assistants) and
   * [Message](https://platform.openai.com/docs/api-reference/messages) files,
   * "vision" for Assistants image file inputs, "batch" for
   * [Batch API](https://platform.openai.com/docs/guides/batch), and "fine-tune" for
   * [Fine-tuning](https://platform.openai.com/docs/api-reference/fine-tuning).
   */
  purpose: FilePurpose;
}

export interface FileListParams extends CursorPageParams {
  /**
   * Sort order by the `created_at` timestamp of the objects. `asc` for ascending
   * order and `desc` for descending order.
   */
  order?: 'asc' | 'desc';

  /**
   * Only return files with the given purpose.
   */
  purpose?: string;
}

Files.FileObjectsPage = FileObjectsPage;

export declare namespace Files {
  export {
    type FileContent as FileContent,
    type FileDeleted as FileDeleted,
    type FileObject as FileObject,
    type FilePurpose as FilePurpose,
    FileObjectsPage as FileObjectsPage,
    type FileCreateParams as FileCreateParams,
    type FileListParams as FileListParams,
  };
}

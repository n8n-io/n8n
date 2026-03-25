// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../resource';
import * as Core from '../../core';

export class Uploads extends APIResource {
  /**
   * Create Session Uploads
   */
  create(
    id: string,
    body: UploadCreateParams,
    options?: Core.RequestOptions,
  ): Core.APIPromise<UploadCreateResponse> {
    return this._client.post(
      `/v1/sessions/${id}/uploads`,
      Core.multipartFormRequestOptions({ body, ...options }),
    );
  }
}

export interface UploadCreateResponse {
  message: string;
}

export interface UploadCreateParams {
  file: Core.Uploadable;
}

export declare namespace Uploads {
  export { type UploadCreateResponse as UploadCreateResponse, type UploadCreateParams as UploadCreateParams };
}

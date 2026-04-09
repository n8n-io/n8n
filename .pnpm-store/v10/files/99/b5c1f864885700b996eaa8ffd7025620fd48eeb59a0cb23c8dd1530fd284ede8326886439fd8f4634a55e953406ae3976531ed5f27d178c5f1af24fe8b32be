// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../resource';
import * as Core from '../../../core';
import { type Response } from '../../../_shims/index';

export class Content extends APIResource {
  /**
   * Retrieve Container File Content
   */
  retrieve(containerId: string, fileId: string, options?: Core.RequestOptions): Core.APIPromise<Response> {
    return this._client.get(`/containers/${containerId}/files/${fileId}/content`, {
      ...options,
      headers: { Accept: 'application/binary', ...options?.headers },
      __binaryResponse: true,
    });
  }
}

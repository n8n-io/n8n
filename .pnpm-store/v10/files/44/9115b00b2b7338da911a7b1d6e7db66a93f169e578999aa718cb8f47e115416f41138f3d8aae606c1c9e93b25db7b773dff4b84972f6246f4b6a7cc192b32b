// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../resource';
import * as Core from '../../core';
import { type Response } from '../../_shims/index';

export class Downloads extends APIResource {
  /**
   * Session Downloads
   */
  list(id: string, options?: Core.RequestOptions): Core.APIPromise<Response> {
    return this._client.get(`/v1/sessions/${id}/downloads`, {
      ...options,
      headers: { Accept: 'application/zip', ...options?.headers },
      __binaryResponse: true,
    });
  }
}

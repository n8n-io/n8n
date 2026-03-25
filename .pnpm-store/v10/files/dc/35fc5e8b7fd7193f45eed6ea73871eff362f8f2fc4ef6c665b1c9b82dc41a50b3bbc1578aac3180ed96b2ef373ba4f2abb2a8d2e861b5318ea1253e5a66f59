// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../resource';
import * as Core from '../core';

export class Extensions extends APIResource {
  /**
   * Upload an Extension
   */
  create(body: ExtensionCreateParams, options?: Core.RequestOptions): Core.APIPromise<Extension> {
    return this._client.post('/v1/extensions', Core.multipartFormRequestOptions({ body, ...options }));
  }

  /**
   * Extension
   */
  retrieve(id: string, options?: Core.RequestOptions): Core.APIPromise<Extension> {
    return this._client.get(`/v1/extensions/${id}`, options);
  }

  /**
   * Delete Extension
   */
  delete(id: string, options?: Core.RequestOptions): Core.APIPromise<void> {
    return this._client.delete(`/v1/extensions/${id}`, {
      ...options,
      headers: { Accept: '*/*', ...options?.headers },
    });
  }
}

export interface Extension {
  id: string;

  createdAt: string;

  fileName: string;

  /**
   * The Project ID linked to the uploaded Extension.
   */
  projectId: string;

  updatedAt: string;
}

export interface ExtensionCreateParams {
  file: Core.Uploadable;
}

export declare namespace Extensions {
  export { type Extension as Extension, type ExtensionCreateParams as ExtensionCreateParams };
}

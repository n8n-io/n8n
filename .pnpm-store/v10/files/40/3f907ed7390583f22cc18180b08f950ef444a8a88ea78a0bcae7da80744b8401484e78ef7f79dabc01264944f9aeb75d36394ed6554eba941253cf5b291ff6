// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../resource';
import * as Core from '../core';

export class Contexts extends APIResource {
  /**
   * Create a Context
   */
  create(body: ContextCreateParams, options?: Core.RequestOptions): Core.APIPromise<ContextCreateResponse> {
    return this._client.post('/v1/contexts', { body, ...options });
  }

  /**
   * Context
   */
  retrieve(id: string, options?: Core.RequestOptions): Core.APIPromise<Context> {
    return this._client.get(`/v1/contexts/${id}`, options);
  }

  /**
   * Update Context
   */
  update(id: string, options?: Core.RequestOptions): Core.APIPromise<ContextUpdateResponse> {
    return this._client.put(`/v1/contexts/${id}`, options);
  }
}

export interface Context {
  id: string;

  createdAt: string;

  /**
   * The Project ID linked to the uploaded Context.
   */
  projectId: string;

  updatedAt: string;
}

export interface ContextCreateResponse {
  id: string;

  /**
   * The cipher algorithm used to encrypt the user-data-directory. AES-256-CBC is
   * currently the only supported algorithm.
   */
  cipherAlgorithm: string;

  /**
   * The initialization vector size used to encrypt the user-data-directory.
   * [Read more about how to use it](/features/contexts).
   */
  initializationVectorSize: number;

  /**
   * The public key to encrypt the user-data-directory.
   */
  publicKey: string;

  /**
   * An upload URL to upload a custom user-data-directory.
   */
  uploadUrl: string;
}

export interface ContextUpdateResponse {
  id: string;

  /**
   * The cipher algorithm used to encrypt the user-data-directory. AES-256-CBC is
   * currently the only supported algorithm.
   */
  cipherAlgorithm: string;

  /**
   * The initialization vector size used to encrypt the user-data-directory.
   * [Read more about how to use it](/features/contexts).
   */
  initializationVectorSize: number;

  /**
   * The public key to encrypt the user-data-directory.
   */
  publicKey: string;

  /**
   * An upload URL to upload a custom user-data-directory.
   */
  uploadUrl: string;
}

export interface ContextCreateParams {
  /**
   * The Project ID. Can be found in
   * [Settings](https://www.browserbase.com/settings).
   */
  projectId: string;
}

export declare namespace Contexts {
  export {
    type Context as Context,
    type ContextCreateResponse as ContextCreateResponse,
    type ContextUpdateResponse as ContextUpdateResponse,
    type ContextCreateParams as ContextCreateParams,
  };
}

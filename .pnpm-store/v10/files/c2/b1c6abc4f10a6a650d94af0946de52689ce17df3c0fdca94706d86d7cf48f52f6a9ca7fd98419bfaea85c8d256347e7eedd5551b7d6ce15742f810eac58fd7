// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../resource';
import * as Core from '../core';

export class FetchAPI extends APIResource {
  /**
   * Fetch a page and return its content, headers, and metadata.
   */
  create(body: FetchAPICreateParams, options?: Core.RequestOptions): Core.APIPromise<FetchAPICreateResponse> {
    return this._client.post('/v1/fetch', { body, ...options });
  }
}

export interface FetchAPICreateResponse {
  /**
   * Unique identifier for the fetch request
   */
  id: string;

  /**
   * The response body content
   */
  content: string;

  /**
   * The MIME type of the response
   */
  contentType: string;

  /**
   * The character encoding of the response
   */
  encoding: string;

  /**
   * Response headers as key-value pairs
   */
  headers: { [key: string]: string };

  /**
   * HTTP status code of the fetched response
   */
  statusCode: number;
}

export interface FetchAPICreateParams {
  /**
   * The URL to fetch
   */
  url: string;

  /**
   * Whether to bypass TLS certificate verification
   */
  allowInsecureSsl?: boolean;

  /**
   * Whether to follow HTTP redirects
   */
  allowRedirects?: boolean;

  /**
   * Whether to enable proxy support for the request
   */
  proxies?: boolean;
}

export declare namespace FetchAPI {
  export {
    type FetchAPICreateResponse as FetchAPICreateResponse,
    type FetchAPICreateParams as FetchAPICreateParams,
  };
}

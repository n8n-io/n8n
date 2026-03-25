// Type definitions for oauth-1.0a v2.2.3
// Project: oauth1.0a
// Definitions by: Ddo <http://ddo.me>

export as namespace OAuth;
export = OAuth;

declare class OAuth {

  body_hash_function: OAuth.BodyHashFunction;
  consumer: OAuth.Consumer;
  hash_function: OAuth.HashFunction;
  last_ampersand: boolean;
  nonce_length: number;
  parameter_seperator: string;
  realm: string;
  signature_metho: string;
  version: string;

  constructor(opts?: OAuth.Options);

  /**
   * Sign a request.
   */
  authorize(request: OAuth.RequestOptions, token?: OAuth.Token): OAuth.Authorization;

  /**
   * Generate the oauth signature (i.e. oauth_signature).
   */
  getSignature(request: OAuth.RequestOptions, token_secret: string | undefined, oauth_data: OAuth.Data): string;

  /**
   * Generate the body signature (i.e. oauth_body_hash).
   */
  getBodyHash(request: OAuth.RequestOptions, token_secret: string | undefined): string;

  /**
   * Encode the request attributes.
   *
   * Base String = "<Method>&<Base Url>&<ParameterString>"
   */
  getBaseString(request: OAuth.RequestOptions, oauth_data: OAuth.Data): string;

  /**
   * Encode the oauth data and the request parameter,
   */
  getParameterString(request: OAuth.RequestOptions, oauth_data: OAuth.Data): string;

  /**
   * Generate the signing key.
   *
   * Key = "<Consumer Key>&<Token Key or an empty string>"
   */
  getSigningKey(token_secret: string | undefined): string;

  /**
   * Return the the URL without its querystring.
   */
  getBaseUrl(url: string): string;

  /**
   * Parse querystring / form data.
   */
  deParam(str: string): OAuth.Param;

  /**
   * Parse querystring from an url
   */
  deParamUrl(url: string): OAuth.Param;

  /**
   * Form data encoding.
   */
  percentEncode(str: string): string;

  /**
   * Convert OAuth authorization data to an http header.
   */
  toHeader(data: OAuth.Authorization): OAuth.Header;

  /**
   * Generate a random nonce.
   */
  getNonce(): string;

  /**
   * Generate a current timestamp in second.
   */
  getTimeStamp(): number;

  /**
   * Merge two object into a new one.
   */
  mergeObject<T, U>(obj1: T, obj2: U): T & U;

  /**
   * Sort an object properties by keys.
   */
  sortObject<O extends {[k: string]: any}, K extends string>(obj: O): Array<{key: keyof O, value: O[K]}>;
}

declare namespace OAuth {

  /**
   * OAuth data, including the signature.
   */
  export interface Authorization extends Data {
    oauth_signature: string;
  }

  /**
   * Method used to generate the body hash.
   *
   * Note: the key is used for implementation HMAC algorithms for the body hash,
   * but typically it should return SHA1 hash of base_string.
   */
  export type BodyHashFunction = (base_string: string, key: string) => string;

  /**
   * OAuth key/secret pair.
   */
  export interface Consumer {
    key: string;
    secret: string;
  }

  /**
   * OAuth data, excluding the signature.
   */
  export interface Data {
    oauth_consumer_key: string;
    oauth_nonce: string;
    oauth_signature_method: string;
    oauth_timestamp: number;
    oauth_version: string;
    oauth_token?: string;
    oauth_body_hash?: string;
  }

  /**
   * Method used to hash the the OAuth and form/querystring data.
   */
  export type HashFunction = (base_string: string, key: string) => string;

  /**
   * Authorization header.
   */
  export interface Header {
    Authorization: string;
  }

  /**
   * OAuth options.
   */
  export interface Options {
    body_hash_function?: BodyHashFunction;
    consumer: Consumer;
    hash_function?: HashFunction;
    last_ampersand?: boolean;
    nonce_length?: number;
    parameter_seperator?: string;
    realm?: string;
    signature_method?: string;
    version?: string;
  }

  /**
   * Extra data.
   */
  export interface Param {
    [key: string]: string | string[];
  }

  /**
   * Request options.
   */
  export interface RequestOptions {
    url: string;
    method: string;
    data?: any;
    includeBodyHash?: boolean;
  }

  /**
   * OAuth token key/secret pair.
   */
  export interface Token {
    key: string;
    secret: string;
  }

}

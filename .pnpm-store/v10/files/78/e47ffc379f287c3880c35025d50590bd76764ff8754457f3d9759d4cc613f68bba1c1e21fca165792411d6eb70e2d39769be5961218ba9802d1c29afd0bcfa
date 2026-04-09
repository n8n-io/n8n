// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { NullableHeaders } from './headers';

import type { BodyInit } from './builtin-types';
import { Stream } from '../core/streaming';
import type { HTTPMethod, MergedRequestInit } from './types';
import { type HeadersLike } from './headers';

export type FinalRequestOptions = RequestOptions & { method: HTTPMethod; path: string };

export type RequestOptions = {
  method?: HTTPMethod;
  path?: string;
  query?: object | undefined | null;
  body?: unknown;
  headers?: HeadersLike;
  maxRetries?: number;
  stream?: boolean | undefined;
  timeout?: number;
  fetchOptions?: MergedRequestInit;
  signal?: AbortSignal | undefined | null;
  idempotencyKey?: string;
  defaultBaseURL?: string | undefined;

  __metadata?: Record<string, unknown>;
  __binaryResponse?: boolean | undefined;
  __streamClass?: typeof Stream;
};

export type EncodedContent = { bodyHeaders: HeadersLike; body: BodyInit };
export type RequestEncoder = (request: { headers: NullableHeaders; body: unknown }) => EncodedContent;

export const FallbackEncoder: RequestEncoder = ({ headers, body }) => {
  return {
    bodyHeaders: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  };
};

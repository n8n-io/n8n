import { APICallError } from '@ai-sdk/provider';
import { extractResponseHeaders } from './extract-response-headers';
import { FetchFunction } from './fetch-function';
import { handleFetchError } from './handle-fetch-error';
import { isAbortError } from './is-abort-error';
import { ResponseHandler } from './response-handler';
import { getRuntimeEnvironmentUserAgent } from './get-runtime-environment-user-agent';
import { withUserAgentSuffix } from './with-user-agent-suffix';
import { VERSION } from './version';

// use function to allow for mocking in tests:
const getOriginalFetch = () => globalThis.fetch;

export const postJsonToApi = async <T>({
  url,
  headers,
  body,
  failedResponseHandler,
  successfulResponseHandler,
  abortSignal,
  fetch,
}: {
  url: string;
  headers?: Record<string, string | undefined>;
  body: unknown;
  failedResponseHandler: ResponseHandler<APICallError>;
  successfulResponseHandler: ResponseHandler<T>;
  abortSignal?: AbortSignal;
  fetch?: FetchFunction;
}) =>
  postToApi({
    url,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: {
      content: JSON.stringify(body),
      values: body,
    },
    failedResponseHandler,
    successfulResponseHandler,
    abortSignal,
    fetch,
  });

export const postFormDataToApi = async <T>({
  url,
  headers,
  formData,
  failedResponseHandler,
  successfulResponseHandler,
  abortSignal,
  fetch,
}: {
  url: string;
  headers?: Record<string, string | undefined>;
  formData: FormData;
  failedResponseHandler: ResponseHandler<APICallError>;
  successfulResponseHandler: ResponseHandler<T>;
  abortSignal?: AbortSignal;
  fetch?: FetchFunction;
}) =>
  postToApi({
    url,
    headers,
    body: {
      content: formData,
      values: Object.fromEntries((formData as any).entries()),
    },
    failedResponseHandler,
    successfulResponseHandler,
    abortSignal,
    fetch,
  });

export const postToApi = async <T>({
  url,
  headers = {},
  body,
  successfulResponseHandler,
  failedResponseHandler,
  abortSignal,
  fetch = getOriginalFetch(),
}: {
  url: string;
  headers?: Record<string, string | undefined>;
  body: {
    content: string | FormData | Uint8Array;
    values: unknown;
  };
  failedResponseHandler: ResponseHandler<Error>;
  successfulResponseHandler: ResponseHandler<T>;
  abortSignal?: AbortSignal;
  fetch?: FetchFunction;
}) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: withUserAgentSuffix(
        headers,
        `ai-sdk/provider-utils/${VERSION}`,
        getRuntimeEnvironmentUserAgent(),
      ),
      body: body.content,
      signal: abortSignal,
    });

    const responseHeaders = extractResponseHeaders(response);

    if (!response.ok) {
      let errorInformation: {
        value: Error;
        responseHeaders?: Record<string, string> | undefined;
      };

      try {
        errorInformation = await failedResponseHandler({
          response,
          url,
          requestBodyValues: body.values,
        });
      } catch (error) {
        if (isAbortError(error) || APICallError.isInstance(error)) {
          throw error;
        }

        throw new APICallError({
          message: 'Failed to process error response',
          cause: error,
          statusCode: response.status,
          url,
          responseHeaders,
          requestBodyValues: body.values,
        });
      }

      throw errorInformation.value;
    }

    try {
      return await successfulResponseHandler({
        response,
        url,
        requestBodyValues: body.values,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (isAbortError(error) || APICallError.isInstance(error)) {
          throw error;
        }
      }

      throw new APICallError({
        message: 'Failed to process successful response',
        cause: error,
        statusCode: response.status,
        url,
        responseHeaders,
        requestBodyValues: body.values,
      });
    }
  } catch (error) {
    throw handleFetchError({ error, url, requestBodyValues: body.values });
  }
};

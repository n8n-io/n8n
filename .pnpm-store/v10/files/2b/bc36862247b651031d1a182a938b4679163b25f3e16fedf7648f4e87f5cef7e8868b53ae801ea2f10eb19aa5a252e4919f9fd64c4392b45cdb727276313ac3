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

export const getFromApi = async <T>({
  url,
  headers = {},
  successfulResponseHandler,
  failedResponseHandler,
  abortSignal,
  fetch = getOriginalFetch(),
}: {
  url: string;
  headers?: Record<string, string | undefined>;
  failedResponseHandler: ResponseHandler<Error>;
  successfulResponseHandler: ResponseHandler<T>;
  abortSignal?: AbortSignal;
  fetch?: FetchFunction;
}) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: withUserAgentSuffix(
        headers,
        `ai-sdk/provider-utils/${VERSION}`,
        getRuntimeEnvironmentUserAgent(),
      ),
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
          requestBodyValues: {},
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
          requestBodyValues: {},
        });
      }

      throw errorInformation.value;
    }

    try {
      return await successfulResponseHandler({
        response,
        url,
        requestBodyValues: {},
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
        requestBodyValues: {},
      });
    }
  } catch (error) {
    throw handleFetchError({ error, url, requestBodyValues: {} });
  }
};

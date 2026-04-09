import { APICallError } from '@ai-sdk/provider';
import { isAbortError } from './is-abort-error';

const FETCH_FAILED_ERROR_MESSAGES = ['fetch failed', 'failed to fetch'];

const BUN_ERROR_CODES = [
  'ConnectionRefused',
  'ConnectionClosed',
  'FailedToOpenSocket',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
];

function isBunNetworkError(error: unknown): error is Error & { code?: string } {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as any).code;
  if (typeof code === 'string' && BUN_ERROR_CODES.includes(code)) {
    return true;
  }

  return false;
}

export function handleFetchError({
  error,
  url,
  requestBodyValues,
}: {
  error: unknown;
  url: string;
  requestBodyValues: unknown;
}) {
  if (isAbortError(error)) {
    return error;
  }

  // unwrap original error when fetch failed (for easier debugging):
  if (
    error instanceof TypeError &&
    FETCH_FAILED_ERROR_MESSAGES.includes(error.message.toLowerCase())
  ) {
    const cause = (error as any).cause;

    if (cause != null) {
      // Failed to connect to server:
      return new APICallError({
        message: `Cannot connect to API: ${cause.message}`,
        cause,
        url,
        requestBodyValues,
        isRetryable: true, // retry when network error
      });
    }
  }

  if (isBunNetworkError(error)) {
    return new APICallError({
      message: `Cannot connect to API: ${error.message}`,
      cause: error,
      url,
      requestBodyValues,
      isRetryable: true,
    });
  }

  return error;
}

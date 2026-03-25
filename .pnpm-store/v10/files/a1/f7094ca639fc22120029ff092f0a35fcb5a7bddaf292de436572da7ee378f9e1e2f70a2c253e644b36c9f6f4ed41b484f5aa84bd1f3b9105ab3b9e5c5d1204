import {Metadata, status, StatusObject} from '@grpc/grpc-js';
import {isAbortError} from 'abort-controller-x';
import {ServerError} from 'nice-grpc-common';

/** @internal */
export function createErrorStatusObject(
  path: string,
  error: unknown,
  trailer: Metadata,
): StatusObject {
  if (error instanceof ServerError) {
    return {
      code: error.code,
      details: error.details,
      metadata: trailer,
    };
  } else if (isAbortError(error)) {
    return {
      code: status.CANCELLED,
      details: 'The operation was cancelled',
      metadata: trailer,
    };
  } else {
    process.emitWarning(
      `${path}: Uncaught error in server implementation method. Server methods should only throw ServerError or AbortError. ${
        error instanceof Error ? error.stack : error
      }`,
    );

    return {
      code: status.UNKNOWN,
      details: 'Unknown server error occurred',
      metadata: trailer,
    };
  }
}

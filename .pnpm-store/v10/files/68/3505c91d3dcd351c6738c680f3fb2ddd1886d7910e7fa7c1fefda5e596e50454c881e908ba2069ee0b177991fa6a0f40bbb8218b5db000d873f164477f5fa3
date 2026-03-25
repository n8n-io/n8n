import {ClientError} from 'nice-grpc-common';
import {Metadata, StatusObject} from '@grpc/grpc-js';

/** @internal */
export function wrapClientError(error: unknown, path: string) {
  if (isStatusObject(error)) {
    return new ClientError(path, error.code, error.details);
  }

  return error;
}

function isStatusObject(obj: any): obj is StatusObject {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.code === 'number' &&
    typeof obj.details === 'string' &&
    obj.metadata instanceof Metadata
  );
}

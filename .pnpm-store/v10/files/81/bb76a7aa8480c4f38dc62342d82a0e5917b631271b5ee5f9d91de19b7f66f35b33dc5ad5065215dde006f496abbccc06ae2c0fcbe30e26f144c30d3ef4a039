import {ExtendableError} from 'ts-error';
import {Status} from '../Status';

/**
 * Service implementations may throw this error to report gRPC errors to
 * clients.
 */
export class ServerError extends ExtendableError {
  /**
   * Status code to report to the client.
   */
  code: Status;
  /**
   * Status message to report to the client.
   */
  details: string;

  constructor(code: Status, details: string) {
    super(`${Status[code]}: ${details}`);

    this.code = code;
    this.details = details;

    this.name = 'ServerError';
    Object.defineProperty(this, '@@nice-grpc', {
      value: true,
    });
    Object.defineProperty(this, '@@nice-grpc:ServerError', {
      value: true,
    });
  }

  static [Symbol.hasInstance](instance: any) {
    // allow instances of ServerError from different versions of nice-grpc
    // to work with `instanceof ServerError`

    if (this !== ServerError) {
      return this.prototype.isPrototypeOf(instance);
    }

    return (
      typeof instance === 'object' &&
      instance !== null &&
      (instance.constructor === ServerError ||
        instance['@@nice-grpc:ServerError'] === true ||
        (instance.name === 'ServerError' && instance['@@nice-grpc'] === true))
    );
  }
}

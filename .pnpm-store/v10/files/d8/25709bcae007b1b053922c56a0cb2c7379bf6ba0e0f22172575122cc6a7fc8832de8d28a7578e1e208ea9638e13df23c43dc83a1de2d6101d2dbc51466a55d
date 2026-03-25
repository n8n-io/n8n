import {ExtendableError} from 'ts-error';
import {Status} from '../Status';

/**
 * Represents gRPC errors returned from client calls.
 */
export class ClientError extends ExtendableError {
  /**
   * Path of the client call.
   *
   * Has format `/package.Service/Method`.
   */
  path: string;
  /**
   * Status code reported by the server.
   */
  code: Status;
  /**
   * Status message reported by the server.
   */
  details: string;

  constructor(path: string, code: Status, details: string) {
    super(`${path} ${Status[code]}: ${details}`);

    this.path = path;
    this.code = code;
    this.details = details;

    this.name = 'ClientError';
    Object.defineProperty(this, '@@nice-grpc', {
      value: true,
    });
    Object.defineProperty(this, '@@nice-grpc:ClientError', {
      value: true,
    });
  }

  static [Symbol.hasInstance](instance: any) {
    // allow instances of ClientError from different versions of nice-grpc
    // to work with `instanceof ClientError`

    if (this !== ClientError) {
      return this.prototype.isPrototypeOf(instance);
    }

    return (
      typeof instance === 'object' &&
      instance !== null &&
      (instance.constructor === ClientError ||
        instance['@@nice-grpc:ClientError'] === true ||
        (instance.name === 'ClientError' && instance['@@nice-grpc'] === true))
    );
  }
}

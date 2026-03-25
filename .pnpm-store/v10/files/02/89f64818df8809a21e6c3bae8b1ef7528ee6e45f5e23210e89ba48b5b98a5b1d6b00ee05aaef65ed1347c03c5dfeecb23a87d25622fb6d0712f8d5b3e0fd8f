import { createErrorClass } from './createErrorClass';

export interface SequenceError extends Error {}

export interface SequenceErrorCtor {
  /**
   * @deprecated Internal implementation detail. Do not construct error instances.
   * Cannot be tagged as internal: https://github.com/ReactiveX/rxjs/issues/6269
   */
  new (message: string): SequenceError;
}

/**
 * An error thrown when something is wrong with the sequence of
 * values arriving on the observable.
 *
 * @see {@link operators/single}
 *
 * @class SequenceError
 */
export const SequenceError: SequenceErrorCtor = createErrorClass(
  (_super) =>
    function SequenceErrorImpl(this: any, message: string) {
      _super(this);
      this.name = 'SequenceError';
      this.message = message;
    }
);

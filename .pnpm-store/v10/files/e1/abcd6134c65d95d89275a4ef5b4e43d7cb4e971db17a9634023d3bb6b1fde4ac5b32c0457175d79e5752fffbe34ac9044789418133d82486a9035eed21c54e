import { createErrorClass } from './createErrorClass';

export interface NotFoundError extends Error {}

export interface NotFoundErrorCtor {
  /**
   * @deprecated Internal implementation detail. Do not construct error instances.
   * Cannot be tagged as internal: https://github.com/ReactiveX/rxjs/issues/6269
   */
  new (message: string): NotFoundError;
}

/**
 * An error thrown when a value or values are missing from an
 * observable sequence.
 *
 * @see {@link operators/single}
 */
export const NotFoundError: NotFoundErrorCtor = createErrorClass(
  (_super) =>
    function NotFoundErrorImpl(this: any, message: string) {
      _super(this);
      this.name = 'NotFoundError';
      this.message = message;
    }
);

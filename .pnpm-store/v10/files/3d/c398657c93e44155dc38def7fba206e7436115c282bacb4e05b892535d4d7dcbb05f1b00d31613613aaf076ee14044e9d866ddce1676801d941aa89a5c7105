import { createErrorClass } from './createErrorClass';

export interface ObjectUnsubscribedError extends Error {}

export interface ObjectUnsubscribedErrorCtor {
  /**
   * @deprecated Internal implementation detail. Do not construct error instances.
   * Cannot be tagged as internal: https://github.com/ReactiveX/rxjs/issues/6269
   */
  new (): ObjectUnsubscribedError;
}

/**
 * An error thrown when an action is invalid because the object has been
 * unsubscribed.
 *
 * @see {@link Subject}
 * @see {@link BehaviorSubject}
 *
 * @class ObjectUnsubscribedError
 */
export const ObjectUnsubscribedError: ObjectUnsubscribedErrorCtor = createErrorClass(
  (_super) =>
    function ObjectUnsubscribedErrorImpl(this: any) {
      _super(this);
      this.name = 'ObjectUnsubscribedError';
      this.message = 'object unsubscribed';
    }
);

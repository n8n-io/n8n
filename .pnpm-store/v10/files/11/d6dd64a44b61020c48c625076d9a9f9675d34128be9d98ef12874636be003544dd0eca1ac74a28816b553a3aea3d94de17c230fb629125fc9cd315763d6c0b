import { isFunction } from './util/isFunction';
import { UnsubscriptionError } from './util/UnsubscriptionError';
import { SubscriptionLike, TeardownLogic, Unsubscribable } from './types';
import { arrRemove } from './util/arrRemove';

/**
 * Represents a disposable resource, such as the execution of an Observable. A
 * Subscription has one important method, `unsubscribe`, that takes no argument
 * and just disposes the resource held by the subscription.
 *
 * Additionally, subscriptions may be grouped together through the `add()`
 * method, which will attach a child Subscription to the current Subscription.
 * When a Subscription is unsubscribed, all its children (and its grandchildren)
 * will be unsubscribed as well.
 */
export class Subscription implements SubscriptionLike {
  public static EMPTY = (() => {
    const empty = new Subscription();
    empty.closed = true;
    return empty;
  })();

  /**
   * A flag to indicate whether this Subscription has already been unsubscribed.
   */
  public closed = false;

  private _parentage: Subscription[] | Subscription | null = null;

  /**
   * The list of registered finalizers to execute upon unsubscription. Adding and removing from this
   * list occurs in the {@link #add} and {@link #remove} methods.
   */
  private _finalizers: Exclude<TeardownLogic, void>[] | null = null;

  /**
   * @param initialTeardown A function executed first as part of the finalization
   * process that is kicked off when {@link #unsubscribe} is called.
   */
  constructor(private initialTeardown?: () => void) {}

  /**
   * Disposes the resources held by the subscription. May, for instance, cancel
   * an ongoing Observable execution or cancel any other type of work that
   * started when the Subscription was created.
   */
  unsubscribe(): void {
    let errors: any[] | undefined;

    if (!this.closed) {
      this.closed = true;

      // Remove this from it's parents.
      const { _parentage } = this;
      if (_parentage) {
        this._parentage = null;
        if (Array.isArray(_parentage)) {
          for (const parent of _parentage) {
            parent.remove(this);
          }
        } else {
          _parentage.remove(this);
        }
      }

      const { initialTeardown: initialFinalizer } = this;
      if (isFunction(initialFinalizer)) {
        try {
          initialFinalizer();
        } catch (e) {
          errors = e instanceof UnsubscriptionError ? e.errors : [e];
        }
      }

      const { _finalizers } = this;
      if (_finalizers) {
        this._finalizers = null;
        for (const finalizer of _finalizers) {
          try {
            execFinalizer(finalizer);
          } catch (err) {
            errors = errors ?? [];
            if (err instanceof UnsubscriptionError) {
              errors = [...errors, ...err.errors];
            } else {
              errors.push(err);
            }
          }
        }
      }

      if (errors) {
        throw new UnsubscriptionError(errors);
      }
    }
  }

  /**
   * Adds a finalizer to this subscription, so that finalization will be unsubscribed/called
   * when this subscription is unsubscribed. If this subscription is already {@link #closed},
   * because it has already been unsubscribed, then whatever finalizer is passed to it
   * will automatically be executed (unless the finalizer itself is also a closed subscription).
   *
   * Closed Subscriptions cannot be added as finalizers to any subscription. Adding a closed
   * subscription to a any subscription will result in no operation. (A noop).
   *
   * Adding a subscription to itself, or adding `null` or `undefined` will not perform any
   * operation at all. (A noop).
   *
   * `Subscription` instances that are added to this instance will automatically remove themselves
   * if they are unsubscribed. Functions and {@link Unsubscribable} objects that you wish to remove
   * will need to be removed manually with {@link #remove}
   *
   * @param teardown The finalization logic to add to this subscription.
   */
  add(teardown: TeardownLogic): void {
    // Only add the finalizer if it's not undefined
    // and don't add a subscription to itself.
    if (teardown && teardown !== this) {
      if (this.closed) {
        // If this subscription is already closed,
        // execute whatever finalizer is handed to it automatically.
        execFinalizer(teardown);
      } else {
        if (teardown instanceof Subscription) {
          // We don't add closed subscriptions, and we don't add the same subscription
          // twice. Subscription unsubscribe is idempotent.
          if (teardown.closed || teardown._hasParent(this)) {
            return;
          }
          teardown._addParent(this);
        }
        (this._finalizers = this._finalizers ?? []).push(teardown);
      }
    }
  }

  /**
   * Checks to see if a this subscription already has a particular parent.
   * This will signal that this subscription has already been added to the parent in question.
   * @param parent the parent to check for
   */
  private _hasParent(parent: Subscription) {
    const { _parentage } = this;
    return _parentage === parent || (Array.isArray(_parentage) && _parentage.includes(parent));
  }

  /**
   * Adds a parent to this subscription so it can be removed from the parent if it
   * unsubscribes on it's own.
   *
   * NOTE: THIS ASSUMES THAT {@link _hasParent} HAS ALREADY BEEN CHECKED.
   * @param parent The parent subscription to add
   */
  private _addParent(parent: Subscription) {
    const { _parentage } = this;
    this._parentage = Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : _parentage ? [_parentage, parent] : parent;
  }

  /**
   * Called on a child when it is removed via {@link #remove}.
   * @param parent The parent to remove
   */
  private _removeParent(parent: Subscription) {
    const { _parentage } = this;
    if (_parentage === parent) {
      this._parentage = null;
    } else if (Array.isArray(_parentage)) {
      arrRemove(_parentage, parent);
    }
  }

  /**
   * Removes a finalizer from this subscription that was previously added with the {@link #add} method.
   *
   * Note that `Subscription` instances, when unsubscribed, will automatically remove themselves
   * from every other `Subscription` they have been added to. This means that using the `remove` method
   * is not a common thing and should be used thoughtfully.
   *
   * If you add the same finalizer instance of a function or an unsubscribable object to a `Subscription` instance
   * more than once, you will need to call `remove` the same number of times to remove all instances.
   *
   * All finalizer instances are removed to free up memory upon unsubscription.
   *
   * @param teardown The finalizer to remove from this subscription
   */
  remove(teardown: Exclude<TeardownLogic, void>): void {
    const { _finalizers } = this;
    _finalizers && arrRemove(_finalizers, teardown);

    if (teardown instanceof Subscription) {
      teardown._removeParent(this);
    }
  }
}

export const EMPTY_SUBSCRIPTION = Subscription.EMPTY;

export function isSubscription(value: any): value is Subscription {
  return (
    value instanceof Subscription ||
    (value && 'closed' in value && isFunction(value.remove) && isFunction(value.add) && isFunction(value.unsubscribe))
  );
}

function execFinalizer(finalizer: Unsubscribable | (() => void)) {
  if (isFunction(finalizer)) {
    finalizer();
  } else {
    finalizer.unsubscribe();
  }
}

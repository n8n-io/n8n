import { Observable } from '../Observable';
import { BehaviorSubject } from '../BehaviorSubject';
import { ConnectableObservable } from '../observable/ConnectableObservable';
import { UnaryFunction } from '../types';

/**
 * Creates a {@link ConnectableObservable} that utilizes a {@link BehaviorSubject}.
 *
 * @param initialValue The initial value passed to the {@link BehaviorSubject}.
 * @return A function that returns a {@link ConnectableObservable}
 * @deprecated Will be removed in v8. To create a connectable observable that uses a
 * {@link BehaviorSubject} under the hood, use {@link connectable}.
 * `source.pipe(publishBehavior(initValue))` is equivalent to
 * `connectable(source, { connector: () => new BehaviorSubject(initValue), resetOnDisconnect: false })`.
 * If you're using {@link refCount} after `publishBehavior`, use the {@link share} operator instead.
 * `source.pipe(publishBehavior(initValue), refCount())` is equivalent to
 * `source.pipe(share({ connector: () => new BehaviorSubject(initValue), resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false  }))`.
 * Details: https://rxjs.dev/deprecations/multicasting
 */
export function publishBehavior<T>(initialValue: T): UnaryFunction<Observable<T>, ConnectableObservable<T>> {
  // Note that this has *never* supported the selector function.
  return (source) => {
    const subject = new BehaviorSubject<T>(initialValue);
    return new ConnectableObservable(source, () => subject);
  };
}

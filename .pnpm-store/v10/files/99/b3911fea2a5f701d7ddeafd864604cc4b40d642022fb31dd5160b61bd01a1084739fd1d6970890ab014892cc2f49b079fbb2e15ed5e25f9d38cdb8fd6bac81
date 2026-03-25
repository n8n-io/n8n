import { Observable } from '../Observable';
import { ReplaySubject } from '../ReplaySubject';
import { multicast } from './multicast';
import { MonoTypeOperatorFunction, OperatorFunction, TimestampProvider, ObservableInput, ObservedValueOf } from '../types';
import { isFunction } from '../util/isFunction';

/**
 * Creates a {@link ConnectableObservable} that uses a {@link ReplaySubject}
 * internally.
 *
 * @param bufferSize The buffer size for the underlying {@link ReplaySubject}.
 * @param windowTime The window time for the underlying {@link ReplaySubject}.
 * @param timestampProvider The timestamp provider for the underlying {@link ReplaySubject}.
 * @deprecated Will be removed in v8. To create a connectable observable that uses a
 * {@link ReplaySubject} under the hood, use {@link connectable}.
 * `source.pipe(publishReplay(size, time, scheduler))` is equivalent to
 * `connectable(source, { connector: () => new ReplaySubject(size, time, scheduler), resetOnDisconnect: false })`.
 * If you're using {@link refCount} after `publishReplay`, use the {@link share} operator instead.
 * `publishReplay(size, time, scheduler), refCount()` is equivalent to
 * `share({ connector: () => new ReplaySubject(size, time, scheduler), resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false })`.
 * Details: https://rxjs.dev/deprecations/multicasting
 */
export function publishReplay<T>(
  bufferSize?: number,
  windowTime?: number,
  timestampProvider?: TimestampProvider
): MonoTypeOperatorFunction<T>;

/**
 * Creates an observable, that when subscribed to, will create a {@link ReplaySubject},
 * and pass an observable from it (using [asObservable](api/index/class/Subject#asObservable)) to
 * the `selector` function, which then returns an observable that is subscribed to before
 * "connecting" the source to the internal `ReplaySubject`.
 *
 * Since this is deprecated, for additional details see the documentation for {@link connect}.
 *
 * @param bufferSize The buffer size for the underlying {@link ReplaySubject}.
 * @param windowTime The window time for the underlying {@link ReplaySubject}.
 * @param selector A function used to setup the multicast.
 * @param timestampProvider The timestamp provider for the underlying {@link ReplaySubject}.
 * @deprecated Will be removed in v8. Use the {@link connect} operator instead.
 * `source.pipe(publishReplay(size, window, selector, scheduler))` is equivalent to
 * `source.pipe(connect(selector, { connector: () => new ReplaySubject(size, window, scheduler) }))`.
 * Details: https://rxjs.dev/deprecations/multicasting
 */
export function publishReplay<T, O extends ObservableInput<any>>(
  bufferSize: number | undefined,
  windowTime: number | undefined,
  selector: (shared: Observable<T>) => O,
  timestampProvider?: TimestampProvider
): OperatorFunction<T, ObservedValueOf<O>>;

/**
 * Creates a {@link ConnectableObservable} that uses a {@link ReplaySubject}
 * internally.
 *
 * @param bufferSize The buffer size for the underlying {@link ReplaySubject}.
 * @param windowTime The window time for the underlying {@link ReplaySubject}.
 * @param selector Passing `undefined` here determines that this operator will return a {@link ConnectableObservable}.
 * @param timestampProvider The timestamp provider for the underlying {@link ReplaySubject}.
 * @deprecated Will be removed in v8. To create a connectable observable that uses a
 * {@link ReplaySubject} under the hood, use {@link connectable}.
 * `source.pipe(publishReplay(size, time, scheduler))` is equivalent to
 * `connectable(source, { connector: () => new ReplaySubject(size, time, scheduler), resetOnDisconnect: false })`.
 * If you're using {@link refCount} after `publishReplay`, use the {@link share} operator instead.
 * `publishReplay(size, time, scheduler), refCount()` is equivalent to
 * `share({ connector: () => new ReplaySubject(size, time, scheduler), resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false })`.
 * Details: https://rxjs.dev/deprecations/multicasting
 */
export function publishReplay<T, O extends ObservableInput<any>>(
  bufferSize: number | undefined,
  windowTime: number | undefined,
  selector: undefined,
  timestampProvider: TimestampProvider
): OperatorFunction<T, ObservedValueOf<O>>;

/**
 * @deprecated Will be removed in v8. Use the {@link connectable} observable, the {@link connect} operator or the
 * {@link share} operator instead. See the overloads below for equivalent replacement examples of this operator's
 * behaviors.
 * Details: https://rxjs.dev/deprecations/multicasting
 */
export function publishReplay<T, R>(
  bufferSize?: number,
  windowTime?: number,
  selectorOrScheduler?: TimestampProvider | OperatorFunction<T, R>,
  timestampProvider?: TimestampProvider
) {
  if (selectorOrScheduler && !isFunction(selectorOrScheduler)) {
    timestampProvider = selectorOrScheduler;
  }
  const selector = isFunction(selectorOrScheduler) ? selectorOrScheduler : undefined;
  // Note, we're passing `selector!` here, because at runtime, `undefined` is an acceptable argument
  // but it makes our TypeScript signature for `multicast` unhappy (as it should, because it's gross).
  return (source: Observable<T>) => multicast(new ReplaySubject<T>(bufferSize, windowTime, timestampProvider), selector!)(source);
}

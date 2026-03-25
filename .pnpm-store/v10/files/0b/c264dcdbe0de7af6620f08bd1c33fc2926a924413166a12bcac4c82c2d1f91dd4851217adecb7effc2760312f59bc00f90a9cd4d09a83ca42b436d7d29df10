import { ReplaySubject } from '../ReplaySubject';
import { MonoTypeOperatorFunction, SchedulerLike } from '../types';
import { share } from './share';

export interface ShareReplayConfig {
  bufferSize?: number;
  windowTime?: number;
  refCount: boolean;
  scheduler?: SchedulerLike;
}

export function shareReplay<T>(config: ShareReplayConfig): MonoTypeOperatorFunction<T>;
export function shareReplay<T>(bufferSize?: number, windowTime?: number, scheduler?: SchedulerLike): MonoTypeOperatorFunction<T>;

/**
 * Share source and replay specified number of emissions on subscription.
 *
 * This operator is a specialization of `replay` that connects to a source observable
 * and multicasts through a `ReplaySubject` constructed with the specified arguments.
 * A successfully completed source will stay cached in the `shareReplay`ed observable forever,
 * but an errored source can be retried.
 *
 * ## Why use `shareReplay`?
 *
 * You generally want to use `shareReplay` when you have side-effects or taxing computations
 * that you do not wish to be executed amongst multiple subscribers.
 * It may also be valuable in situations where you know you will have late subscribers to
 * a stream that need access to previously emitted values.
 * This ability to replay values on subscription is what differentiates {@link share} and `shareReplay`.
 *
 * ## Reference counting
 *
 * By default `shareReplay` will use `refCount` of false, meaning that it will _not_ unsubscribe the
 * source when the reference counter drops to zero, i.e. the inner `ReplaySubject` will _not_ be unsubscribed
 * (and potentially run for ever).
 * This is the default as it is expected that `shareReplay` is often used to keep around expensive to setup
 * observables which we want to keep running instead of having to do the expensive setup again.
 *
 * As of RXJS version 6.4.0 a new overload signature was added to allow for manual control over what
 * happens when the operators internal reference counter drops to zero.
 * If `refCount` is true, the source will be unsubscribed from once the reference count drops to zero, i.e.
 * the inner `ReplaySubject` will be unsubscribed. All new subscribers will receive value emissions from a
 * new `ReplaySubject` which in turn will cause a new subscription to the source observable.
 *
 * ## Examples
 *
 * Example with a third subscriber coming late to the party
 *
 * ```ts
 * import { interval, take, shareReplay } from 'rxjs';
 *
 * const shared$ = interval(2000).pipe(
 *   take(6),
 *   shareReplay(3)
 * );
 *
 * shared$.subscribe(x => console.log('sub A: ', x));
 * shared$.subscribe(y => console.log('sub B: ', y));
 *
 * setTimeout(() => {
 *   shared$.subscribe(y => console.log('sub C: ', y));
 * }, 11000);
 *
 * // Logs:
 * // (after ~2000 ms)
 * // sub A: 0
 * // sub B: 0
 * // (after ~4000 ms)
 * // sub A: 1
 * // sub B: 1
 * // (after ~6000 ms)
 * // sub A: 2
 * // sub B: 2
 * // (after ~8000 ms)
 * // sub A: 3
 * // sub B: 3
 * // (after ~10000 ms)
 * // sub A: 4
 * // sub B: 4
 * // (after ~11000 ms, sub C gets the last 3 values)
 * // sub C: 2
 * // sub C: 3
 * // sub C: 4
 * // (after ~12000 ms)
 * // sub A: 5
 * // sub B: 5
 * // sub C: 5
 * ```
 *
 * Example for `refCount` usage
 *
 * ```ts
 * import { Observable, tap, interval, shareReplay, take } from 'rxjs';
 *
 * const log = <T>(name: string, source: Observable<T>) => source.pipe(
 *   tap({
 *     subscribe: () => console.log(`${ name }: subscribed`),
 *     next: value => console.log(`${ name }: ${ value }`),
 *     complete: () => console.log(`${ name }: completed`),
 *     finalize: () => console.log(`${ name }: unsubscribed`)
 *   })
 * );
 *
 * const obs$ = log('source', interval(1000));
 *
 * const shared$ = log('shared', obs$.pipe(
 *   shareReplay({ bufferSize: 1, refCount: true }),
 *   take(2)
 * ));
 *
 * shared$.subscribe(x => console.log('sub A: ', x));
 * shared$.subscribe(y => console.log('sub B: ', y));
 *
 * // PRINTS:
 * // shared: subscribed <-- reference count = 1
 * // source: subscribed
 * // shared: subscribed <-- reference count = 2
 * // source: 0
 * // shared: 0
 * // sub A: 0
 * // shared: 0
 * // sub B: 0
 * // source: 1
 * // shared: 1
 * // sub A: 1
 * // shared: completed <-- take(2) completes the subscription for sub A
 * // shared: unsubscribed <-- reference count = 1
 * // shared: 1
 * // sub B: 1
 * // shared: completed <-- take(2) completes the subscription for sub B
 * // shared: unsubscribed <-- reference count = 0
 * // source: unsubscribed <-- replaySubject unsubscribes from source observable because the reference count dropped to 0 and refCount is true
 *
 * // In case of refCount being false, the unsubscribe is never called on the source and the source would keep on emitting, even if no subscribers
 * // are listening.
 * // source: 2
 * // source: 3
 * // source: 4
 * // ...
 * ```
 *
 * @see {@link publish}
 * @see {@link share}
 * @see {@link publishReplay}
 *
 * @param configOrBufferSize Maximum element count of the replay buffer or {@link ShareReplayConfig configuration}
 * object.
 * @param windowTime Maximum time length of the replay buffer in milliseconds.
 * @param scheduler Scheduler where connected observers within the selector function
 * will be invoked on.
 * @return A function that returns an Observable sequence that contains the
 * elements of a sequence produced by multicasting the source sequence within a
 * selector function.
 */
export function shareReplay<T>(
  configOrBufferSize?: ShareReplayConfig | number,
  windowTime?: number,
  scheduler?: SchedulerLike
): MonoTypeOperatorFunction<T> {
  let bufferSize: number;
  let refCount = false;
  if (configOrBufferSize && typeof configOrBufferSize === 'object') {
    ({ bufferSize = Infinity, windowTime = Infinity, refCount = false, scheduler } = configOrBufferSize);
  } else {
    bufferSize = (configOrBufferSize ?? Infinity) as number;
  }
  return share<T>({
    connector: () => new ReplaySubject(bufferSize, windowTime, scheduler),
    resetOnError: true,
    resetOnComplete: false,
    resetOnRefCountZero: refCount,
  });
}

import { MonoTypeOperatorFunction } from '../types';
import { operate } from '../util/lift';

/**
 * Returns an Observable that mirrors the source Observable, but will call a specified function when
 * the source terminates on complete or error.
 * The specified function will also be called when the subscriber explicitly unsubscribes.
 *
 * ## Examples
 *
 * Execute callback function when the observable completes
 *
 * ```ts
 * import { interval, take, finalize } from 'rxjs';
 *
 * // emit value in sequence every 1 second
 * const source = interval(1000);
 * const example = source.pipe(
 *   take(5), //take only the first 5 values
 *   finalize(() => console.log('Sequence complete')) // Execute when the observable completes
 * );
 * const subscribe = example.subscribe(val => console.log(val));
 *
 * // results:
 * // 0
 * // 1
 * // 2
 * // 3
 * // 4
 * // 'Sequence complete'
 * ```
 *
 * Execute callback function when the subscriber explicitly unsubscribes
 *
 * ```ts
 * import { interval, finalize, tap, noop, timer } from 'rxjs';
 *
 * const source = interval(100).pipe(
 *   finalize(() => console.log('[finalize] Called')),
 *   tap({
 *     next: () => console.log('[next] Called'),
 *     error: () => console.log('[error] Not called'),
 *     complete: () => console.log('[tap complete] Not called')
 *   })
 * );
 *
 * const sub = source.subscribe({
 *   next: x => console.log(x),
 *   error: noop,
 *   complete: () => console.log('[complete] Not called')
 * });
 *
 * timer(150).subscribe(() => sub.unsubscribe());
 *
 * // results:
 * // '[next] Called'
 * // 0
 * // '[finalize] Called'
 * ```
 *
 * @param callback Function to be called when source terminates.
 * @return A function that returns an Observable that mirrors the source, but
 * will call the specified function on termination.
 */
export function finalize<T>(callback: () => void): MonoTypeOperatorFunction<T> {
  return operate((source, subscriber) => {
    // TODO: This try/finally was only added for `useDeprecatedSynchronousErrorHandling`.
    // REMOVE THIS WHEN THAT HOT GARBAGE IS REMOVED IN V8.
    try {
      source.subscribe(subscriber);
    } finally {
      subscriber.add(callback);
    }
  });
}

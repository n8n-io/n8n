import { Observable } from '../../Observable';
import { TimestampProvider } from '../../types';
import { performanceTimestampProvider } from '../../scheduler/performanceTimestampProvider';
import { animationFrameProvider } from '../../scheduler/animationFrameProvider';

/**
 * An observable of animation frames
 *
 * Emits the amount of time elapsed since subscription and the timestamp on each animation frame.
 * Defaults to milliseconds provided to the requestAnimationFrame's callback. Does not end on its own.
 *
 * Every subscription will start a separate animation loop. Since animation frames are always scheduled
 * by the browser to occur directly before a repaint, scheduling more than one animation frame synchronously
 * should not be much different or have more overhead than looping over an array of events during
 * a single animation frame. However, if for some reason the developer would like to ensure the
 * execution of animation-related handlers are all executed during the same task by the engine,
 * the `share` operator can be used.
 *
 * This is useful for setting up animations with RxJS.
 *
 * ## Examples
 *
 * Tweening a div to move it on the screen
 *
 * ```ts
 * import { animationFrames, map, takeWhile, endWith } from 'rxjs';
 *
 * function tween(start: number, end: number, duration: number) {
 *   const diff = end - start;
 *   return animationFrames().pipe(
 *     // Figure out what percentage of time has passed
 *     map(({ elapsed }) => elapsed / duration),
 *     // Take the vector while less than 100%
 *     takeWhile(v => v < 1),
 *     // Finish with 100%
 *     endWith(1),
 *     // Calculate the distance traveled between start and end
 *     map(v => v * diff + start)
 *   );
 * }
 *
 * // Setup a div for us to move around
 * const div = document.createElement('div');
 * document.body.appendChild(div);
 * div.style.position = 'absolute';
 * div.style.width = '40px';
 * div.style.height = '40px';
 * div.style.backgroundColor = 'lime';
 * div.style.transform = 'translate3d(10px, 0, 0)';
 *
 * tween(10, 200, 4000).subscribe(x => {
 *   div.style.transform = `translate3d(${ x }px, 0, 0)`;
 * });
 * ```
 *
 * Providing a custom timestamp provider
 *
 * ```ts
 * import { animationFrames, TimestampProvider } from 'rxjs';
 *
 * // A custom timestamp provider
 * let now = 0;
 * const customTSProvider: TimestampProvider = {
 *   now() { return now++; }
 * };
 *
 * const source$ = animationFrames(customTSProvider);
 *
 * // Log increasing numbers 0...1...2... on every animation frame.
 * source$.subscribe(({ elapsed }) => console.log(elapsed));
 * ```
 *
 * @param timestampProvider An object with a `now` method that provides a numeric timestamp
 */
export function animationFrames(timestampProvider?: TimestampProvider) {
  return timestampProvider ? animationFramesFactory(timestampProvider) : DEFAULT_ANIMATION_FRAMES;
}

/**
 * Does the work of creating the observable for `animationFrames`.
 * @param timestampProvider The timestamp provider to use to create the observable
 */
function animationFramesFactory(timestampProvider?: TimestampProvider) {
  return new Observable<{ timestamp: number; elapsed: number }>((subscriber) => {
    // If no timestamp provider is specified, use performance.now() - as it
    // will return timestamps 'compatible' with those passed to the run
    // callback and won't be affected by NTP adjustments, etc.
    const provider = timestampProvider || performanceTimestampProvider;

    // Capture the start time upon subscription, as the run callback can remain
    // queued for a considerable period of time and the elapsed time should
    // represent the time elapsed since subscription - not the time since the
    // first rendered animation frame.
    const start = provider.now();

    let id = 0;
    const run = () => {
      if (!subscriber.closed) {
        id = animationFrameProvider.requestAnimationFrame((timestamp: DOMHighResTimeStamp | number) => {
          id = 0;
          // Use the provider's timestamp to calculate the elapsed time. Note that
          // this means - if the caller hasn't passed a provider - that
          // performance.now() will be used instead of the timestamp that was
          // passed to the run callback. The reason for this is that the timestamp
          // passed to the callback can be earlier than the start time, as it
          // represents the time at which the browser decided it would render any
          // queued frames - and that time can be earlier the captured start time.
          const now = provider.now();
          subscriber.next({
            timestamp: timestampProvider ? now : timestamp,
            elapsed: now - start,
          });
          run();
        });
      }
    };

    run();

    return () => {
      if (id) {
        animationFrameProvider.cancelAnimationFrame(id);
      }
    };
  });
}

/**
 * In the common case, where the timestamp provided by the rAF API is used,
 * we use this shared observable to reduce overhead.
 */
const DEFAULT_ANIMATION_FRAMES = animationFramesFactory();

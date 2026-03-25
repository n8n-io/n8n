import { Observable } from '../../Observable';
import { TimestampProvider } from '../../types';
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
export declare function animationFrames(timestampProvider?: TimestampProvider): Observable<{
    timestamp: number;
    elapsed: number;
}>;
//# sourceMappingURL=animationFrames.d.ts.map
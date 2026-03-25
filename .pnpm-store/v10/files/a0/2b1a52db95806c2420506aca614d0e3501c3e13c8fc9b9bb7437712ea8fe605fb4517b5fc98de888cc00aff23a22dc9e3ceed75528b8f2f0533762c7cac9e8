import { MonoTypeOperatorFunction, ObservableInput } from '../types';
/**
 * An object interface used by {@link throttle} or {@link throttleTime} that ensure
 * configuration options of these operators.
 *
 * @see {@link throttle}
 * @see {@link throttleTime}
 */
export interface ThrottleConfig {
    /**
     * If `true`, the resulting Observable will emit the first value from the source
     * Observable at the **start** of the "throttling" process (when starting an
     * internal timer that prevents other emissions from the source to pass through).
     * If `false`, it will not emit the first value from the source Observable at the
     * start of the "throttling" process.
     *
     * If not provided, defaults to: `true`.
     */
    leading?: boolean;
    /**
     * If `true`, the resulting Observable will emit the last value from the source
     * Observable at the **end** of the "throttling" process (when ending an internal
     * timer that prevents other emissions from the source to pass through).
     * If `false`, it will not emit the last value from the source Observable at the
     * end of the "throttling" process.
     *
     * If not provided, defaults to: `false`.
     */
    trailing?: boolean;
}
/**
 * Emits a value from the source Observable, then ignores subsequent source
 * values for a duration determined by another Observable, then repeats this
 * process.
 *
 * <span class="informal">It's like {@link throttleTime}, but the silencing
 * duration is determined by a second Observable.</span>
 *
 * ![](throttle.svg)
 *
 * `throttle` emits the source Observable values on the output Observable
 * when its internal timer is disabled, and ignores source values when the timer
 * is enabled. Initially, the timer is disabled. As soon as the first source
 * value arrives, it is forwarded to the output Observable, and then the timer
 * is enabled by calling the `durationSelector` function with the source value,
 * which returns the "duration" Observable. When the duration Observable emits a
 * value, the timer is disabled, and this process repeats for the
 * next source value.
 *
 * ## Example
 *
 * Emit clicks at a rate of at most one click per second
 *
 * ```ts
 * import { fromEvent, throttle, interval } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const result = clicks.pipe(throttle(() => interval(1000)));
 *
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link audit}
 * @see {@link debounce}
 * @see {@link delayWhen}
 * @see {@link sample}
 * @see {@link throttleTime}
 *
 * @param durationSelector A function that receives a value from the source
 * Observable, for computing the silencing duration for each source value,
 * returned as an `ObservableInput`.
 * @param config A configuration object to define `leading` and `trailing`
 * behavior. Defaults to `{ leading: true, trailing: false }`.
 * @return A function that returns an Observable that performs the throttle
 * operation to limit the rate of emissions from the source.
 */
export declare function throttle<T>(durationSelector: (value: T) => ObservableInput<any>, config?: ThrottleConfig): MonoTypeOperatorFunction<T>;
//# sourceMappingURL=throttle.d.ts.map
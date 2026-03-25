import { MonoTypeOperatorFunction, ObservableInput } from '../types';
/**
 * Emits the most recently emitted value from the source Observable whenever
 * another Observable, the `notifier`, emits.
 *
 * <span class="informal">It's like {@link sampleTime}, but samples whenever
 * the `notifier` `ObservableInput` emits something.</span>
 *
 * ![](sample.png)
 *
 * Whenever the `notifier` `ObservableInput` emits a value, `sample`
 * looks at the source Observable and emits whichever value it has most recently
 * emitted since the previous sampling, unless the source has not emitted
 * anything since the previous sampling. The `notifier` is subscribed to as soon
 * as the output Observable is subscribed.
 *
 * ## Example
 *
 * On every click, sample the most recent `seconds` timer
 *
 * ```ts
 * import { fromEvent, interval, sample } from 'rxjs';
 *
 * const seconds = interval(1000);
 * const clicks = fromEvent(document, 'click');
 * const result = seconds.pipe(sample(clicks));
 *
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link audit}
 * @see {@link debounce}
 * @see {@link sampleTime}
 * @see {@link throttle}
 *
 * @param notifier The `ObservableInput` to use for sampling the
 * source Observable.
 * @return A function that returns an Observable that emits the results of
 * sampling the values emitted by the source Observable whenever the notifier
 * Observable emits value or completes.
 */
export declare function sample<T>(notifier: ObservableInput<any>): MonoTypeOperatorFunction<T>;
//# sourceMappingURL=sample.d.ts.map
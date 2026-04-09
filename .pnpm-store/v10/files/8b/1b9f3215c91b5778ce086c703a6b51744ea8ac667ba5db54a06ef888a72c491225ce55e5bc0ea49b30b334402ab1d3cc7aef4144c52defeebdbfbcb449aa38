import { Observable } from '../Observable';
import { ColdObservable } from './ColdObservable';
import { HotObservable } from './HotObservable';
import { TestMessage } from './TestMessage';
import { SubscriptionLog } from './SubscriptionLog';
import { VirtualTimeScheduler } from '../scheduler/VirtualTimeScheduler';
export interface RunHelpers {
    cold: typeof TestScheduler.prototype.createColdObservable;
    hot: typeof TestScheduler.prototype.createHotObservable;
    flush: typeof TestScheduler.prototype.flush;
    time: typeof TestScheduler.prototype.createTime;
    expectObservable: typeof TestScheduler.prototype.expectObservable;
    expectSubscriptions: typeof TestScheduler.prototype.expectSubscriptions;
    animate: (marbles: string) => void;
}
export declare type observableToBeFn = (marbles: string, values?: any, errorValue?: any) => void;
export declare type subscriptionLogsToBeFn = (marbles: string | string[]) => void;
export declare class TestScheduler extends VirtualTimeScheduler {
    assertDeepEqual: (actual: any, expected: any) => boolean | void;
    /**
     * The number of virtual time units each character in a marble diagram represents. If
     * the test scheduler is being used in "run mode", via the `run` method, this is temporarily
     * set to `1` for the duration of the `run` block, then set back to whatever value it was.
     */
    static frameTimeFactor: number;
    /**
     * @deprecated Internal implementation detail, do not use directly. Will be made internal in v8.
     */
    readonly hotObservables: HotObservable<any>[];
    /**
     * @deprecated Internal implementation detail, do not use directly. Will be made internal in v8.
     */
    readonly coldObservables: ColdObservable<any>[];
    /**
     * Test meta data to be processed during `flush()`
     */
    private flushTests;
    /**
     * Indicates whether the TestScheduler instance is operating in "run mode",
     * meaning it's processing a call to `run()`
     */
    private runMode;
    /**
     *
     * @param assertDeepEqual A function to set up your assertion for your test harness
     */
    constructor(assertDeepEqual: (actual: any, expected: any) => boolean | void);
    createTime(marbles: string): number;
    /**
     * @param marbles A diagram in the marble DSL. Letters map to keys in `values` if provided.
     * @param values Values to use for the letters in `marbles`. If omitted, the letters themselves are used.
     * @param error The error to use for the `#` marble (if present).
     */
    createColdObservable<T = string>(marbles: string, values?: {
        [marble: string]: T;
    }, error?: any): ColdObservable<T>;
    /**
     * @param marbles A diagram in the marble DSL. Letters map to keys in `values` if provided.
     * @param values Values to use for the letters in `marbles`. If omitted, the letters themselves are used.
     * @param error The error to use for the `#` marble (if present).
     */
    createHotObservable<T = string>(marbles: string, values?: {
        [marble: string]: T;
    }, error?: any): HotObservable<T>;
    private materializeInnerObservable;
    expectObservable<T>(observable: Observable<T>, subscriptionMarbles?: string | null): {
        toBe(marbles: string, values?: any, errorValue?: any): void;
        toEqual: (other: Observable<T>) => void;
    };
    expectSubscriptions(actualSubscriptionLogs: SubscriptionLog[]): {
        toBe: subscriptionLogsToBeFn;
    };
    flush(): void;
    static parseMarblesAsSubscriptions(marbles: string | null, runMode?: boolean): SubscriptionLog;
    static parseMarbles(marbles: string, values?: any, errorValue?: any, materializeInnerObservables?: boolean, runMode?: boolean): TestMessage[];
    private createAnimator;
    private createDelegates;
    /**
     * The `run` method performs the test in 'run mode' - in which schedulers
     * used within the test automatically delegate to the `TestScheduler`. That
     * is, in 'run mode' there is no need to explicitly pass a `TestScheduler`
     * instance to observable creators or operators.
     *
     * @see {@link /guide/testing/marble-testing}
     */
    run<T>(callback: (helpers: RunHelpers) => T): T;
}
//# sourceMappingURL=TestScheduler.d.ts.map
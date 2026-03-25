import { AsyncAction } from './AsyncAction';
import { Subscription } from '../Subscription';
import { AsyncScheduler } from './AsyncScheduler';
import { SchedulerAction } from '../types';
import { TimerHandle } from './timerHandle';
export declare class VirtualTimeScheduler extends AsyncScheduler {
    maxFrames: number;
    /** @deprecated Not used in VirtualTimeScheduler directly. Will be removed in v8. */
    static frameTimeFactor: number;
    /**
     * The current frame for the state of the virtual scheduler instance. The difference
     * between two "frames" is synonymous with the passage of "virtual time units". So if
     * you record `scheduler.frame` to be `1`, then later, observe `scheduler.frame` to be at `11`,
     * that means `10` virtual time units have passed.
     */
    frame: number;
    /**
     * Used internally to examine the current virtual action index being processed.
     * @deprecated Internal implementation detail, do not use directly. Will be made internal in v8.
     */
    index: number;
    /**
     * This creates an instance of a `VirtualTimeScheduler`. Experts only. The signature of
     * this constructor is likely to change in the long run.
     *
     * @param schedulerActionCtor The type of Action to initialize when initializing actions during scheduling.
     * @param maxFrames The maximum number of frames to process before stopping. Used to prevent endless flush cycles.
     */
    constructor(schedulerActionCtor?: typeof AsyncAction, maxFrames?: number);
    /**
     * Prompt the Scheduler to execute all of its queued actions, therefore
     * clearing its queue.
     * @return {void}
     */
    flush(): void;
}
export declare class VirtualAction<T> extends AsyncAction<T> {
    protected scheduler: VirtualTimeScheduler;
    protected work: (this: SchedulerAction<T>, state?: T) => void;
    protected index: number;
    protected active: boolean;
    constructor(scheduler: VirtualTimeScheduler, work: (this: SchedulerAction<T>, state?: T) => void, index?: number);
    schedule(state?: T, delay?: number): Subscription;
    protected requestAsyncId(scheduler: VirtualTimeScheduler, id?: any, delay?: number): TimerHandle;
    protected recycleAsyncId(scheduler: VirtualTimeScheduler, id?: any, delay?: number): TimerHandle | undefined;
    protected _execute(state: T, delay: number): any;
    private static sortActions;
}
//# sourceMappingURL=VirtualTimeScheduler.d.ts.map
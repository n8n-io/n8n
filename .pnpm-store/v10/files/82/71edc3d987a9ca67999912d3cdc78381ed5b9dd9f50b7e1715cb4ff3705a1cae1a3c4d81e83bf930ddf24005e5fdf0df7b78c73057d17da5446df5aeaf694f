import { Action } from './Action';
import { SchedulerAction } from '../types';
import { Subscription } from '../Subscription';
import { AsyncScheduler } from './AsyncScheduler';
import { TimerHandle } from './timerHandle';
export declare class AsyncAction<T> extends Action<T> {
    protected scheduler: AsyncScheduler;
    protected work: (this: SchedulerAction<T>, state?: T) => void;
    id: TimerHandle | undefined;
    state?: T;
    delay: number;
    protected pending: boolean;
    constructor(scheduler: AsyncScheduler, work: (this: SchedulerAction<T>, state?: T) => void);
    schedule(state?: T, delay?: number): Subscription;
    protected requestAsyncId(scheduler: AsyncScheduler, _id?: TimerHandle, delay?: number): TimerHandle;
    protected recycleAsyncId(_scheduler: AsyncScheduler, id?: TimerHandle, delay?: number | null): TimerHandle | undefined;
    /**
     * Immediately executes this action and the `work` it contains.
     */
    execute(state: T, delay: number): any;
    protected _execute(state: T, _delay: number): any;
    unsubscribe(): void;
}
//# sourceMappingURL=AsyncAction.d.ts.map
import { AsyncAction } from './AsyncAction';
import { Subscription } from '../Subscription';
import { QueueScheduler } from './QueueScheduler';
import { SchedulerAction } from '../types';
import { TimerHandle } from './timerHandle';
export declare class QueueAction<T> extends AsyncAction<T> {
    protected scheduler: QueueScheduler;
    protected work: (this: SchedulerAction<T>, state?: T) => void;
    constructor(scheduler: QueueScheduler, work: (this: SchedulerAction<T>, state?: T) => void);
    schedule(state?: T, delay?: number): Subscription;
    execute(state: T, delay: number): any;
    protected requestAsyncId(scheduler: QueueScheduler, id?: TimerHandle, delay?: number): TimerHandle;
}
//# sourceMappingURL=QueueAction.d.ts.map
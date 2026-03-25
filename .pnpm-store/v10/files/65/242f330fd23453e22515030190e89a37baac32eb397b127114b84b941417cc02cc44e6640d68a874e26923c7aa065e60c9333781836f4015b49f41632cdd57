import { AsyncAction } from './AsyncAction';
import { AsapScheduler } from './AsapScheduler';
import { SchedulerAction } from '../types';
import { TimerHandle } from './timerHandle';
export declare class AsapAction<T> extends AsyncAction<T> {
    protected scheduler: AsapScheduler;
    protected work: (this: SchedulerAction<T>, state?: T) => void;
    constructor(scheduler: AsapScheduler, work: (this: SchedulerAction<T>, state?: T) => void);
    protected requestAsyncId(scheduler: AsapScheduler, id?: TimerHandle, delay?: number): TimerHandle;
    protected recycleAsyncId(scheduler: AsapScheduler, id?: TimerHandle, delay?: number): TimerHandle | undefined;
}
//# sourceMappingURL=AsapAction.d.ts.map
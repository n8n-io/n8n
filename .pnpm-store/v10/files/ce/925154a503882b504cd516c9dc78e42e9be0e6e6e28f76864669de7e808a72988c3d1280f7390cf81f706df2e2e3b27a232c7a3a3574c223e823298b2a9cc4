import { AsyncAction } from './AsyncAction';
import { AnimationFrameScheduler } from './AnimationFrameScheduler';
import { SchedulerAction } from '../types';
import { TimerHandle } from './timerHandle';
export declare class AnimationFrameAction<T> extends AsyncAction<T> {
    protected scheduler: AnimationFrameScheduler;
    protected work: (this: SchedulerAction<T>, state?: T) => void;
    constructor(scheduler: AnimationFrameScheduler, work: (this: SchedulerAction<T>, state?: T) => void);
    protected requestAsyncId(scheduler: AnimationFrameScheduler, id?: TimerHandle, delay?: number): TimerHandle;
    protected recycleAsyncId(scheduler: AnimationFrameScheduler, id?: TimerHandle, delay?: number): TimerHandle | undefined;
}
//# sourceMappingURL=AnimationFrameAction.d.ts.map
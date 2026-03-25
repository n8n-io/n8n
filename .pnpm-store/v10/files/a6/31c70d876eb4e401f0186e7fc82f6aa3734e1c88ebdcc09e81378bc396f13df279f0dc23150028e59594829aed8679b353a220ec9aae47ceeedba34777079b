import { AsyncAction } from './AsyncAction';
import { Subscription } from '../Subscription';
import { QueueScheduler } from './QueueScheduler';
import { SchedulerAction } from '../types';
import { TimerHandle } from './timerHandle';

export class QueueAction<T> extends AsyncAction<T> {
  constructor(protected scheduler: QueueScheduler, protected work: (this: SchedulerAction<T>, state?: T) => void) {
    super(scheduler, work);
  }

  public schedule(state?: T, delay: number = 0): Subscription {
    if (delay > 0) {
      return super.schedule(state, delay);
    }
    this.delay = delay;
    this.state = state;
    this.scheduler.flush(this);
    return this;
  }

  public execute(state: T, delay: number): any {
    return delay > 0 || this.closed ? super.execute(state, delay) : this._execute(state, delay);
  }

  protected requestAsyncId(scheduler: QueueScheduler, id?: TimerHandle, delay: number = 0): TimerHandle {
    // If delay exists and is greater than 0, or if the delay is null (the
    // action wasn't rescheduled) but was originally scheduled as an async
    // action, then recycle as an async action.

    if ((delay != null && delay > 0) || (delay == null && this.delay > 0)) {
      return super.requestAsyncId(scheduler, id, delay);
    }

    // Otherwise flush the scheduler starting with this action.
    scheduler.flush(this);

    // HACK: In the past, this was returning `void`. However, `void` isn't a valid
    // `TimerHandle`, and generally the return value here isn't really used. So the
    // compromise is to return `0` which is both "falsy" and a valid `TimerHandle`,
    // as opposed to refactoring every other instanceo of `requestAsyncId`.
    return 0;
  }
}

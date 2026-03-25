import { AsyncAction } from './AsyncAction';
import { AsapScheduler } from './AsapScheduler';
import { SchedulerAction } from '../types';
import { immediateProvider } from './immediateProvider';
import { TimerHandle } from './timerHandle';

export class AsapAction<T> extends AsyncAction<T> {
  constructor(protected scheduler: AsapScheduler, protected work: (this: SchedulerAction<T>, state?: T) => void) {
    super(scheduler, work);
  }

  protected requestAsyncId(scheduler: AsapScheduler, id?: TimerHandle, delay: number = 0): TimerHandle {
    // If delay is greater than 0, request as an async action.
    if (delay !== null && delay > 0) {
      return super.requestAsyncId(scheduler, id, delay);
    }
    // Push the action to the end of the scheduler queue.
    scheduler.actions.push(this);
    // If a microtask has already been scheduled, don't schedule another
    // one. If a microtask hasn't been scheduled yet, schedule one now. Return
    // the current scheduled microtask id.
    return scheduler._scheduled || (scheduler._scheduled = immediateProvider.setImmediate(scheduler.flush.bind(scheduler, undefined)));
  }

  protected recycleAsyncId(scheduler: AsapScheduler, id?: TimerHandle, delay: number = 0): TimerHandle | undefined {
    // If delay exists and is greater than 0, or if the delay is null (the
    // action wasn't rescheduled) but was originally scheduled as an async
    // action, then recycle as an async action.
    if (delay != null ? delay > 0 : this.delay > 0) {
      return super.recycleAsyncId(scheduler, id, delay);
    }
    // If the scheduler queue has no remaining actions with the same async id,
    // cancel the requested microtask and set the scheduled flag to undefined
    // so the next AsapAction will request its own.
    const { actions } = scheduler;
    if (id != null && actions[actions.length - 1]?.id !== id) {
      immediateProvider.clearImmediate(id);
      if (scheduler._scheduled === id) {
        scheduler._scheduled = undefined;
      }
    }
    // Return undefined so the action knows to request a new async id if it's rescheduled.
    return undefined;
  }
}

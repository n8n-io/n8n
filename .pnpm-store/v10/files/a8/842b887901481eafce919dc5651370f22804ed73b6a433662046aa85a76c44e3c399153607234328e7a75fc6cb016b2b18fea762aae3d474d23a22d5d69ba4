import { AsyncAction } from './AsyncAction';
import { Subscription } from '../Subscription';
import { AsyncScheduler } from './AsyncScheduler';
import { SchedulerAction } from '../types';
import { TimerHandle } from './timerHandle';

export class VirtualTimeScheduler extends AsyncScheduler {
  /** @deprecated Not used in VirtualTimeScheduler directly. Will be removed in v8. */
  static frameTimeFactor = 10;

  /**
   * The current frame for the state of the virtual scheduler instance. The difference
   * between two "frames" is synonymous with the passage of "virtual time units". So if
   * you record `scheduler.frame` to be `1`, then later, observe `scheduler.frame` to be at `11`,
   * that means `10` virtual time units have passed.
   */
  public frame: number = 0;

  /**
   * Used internally to examine the current virtual action index being processed.
   * @deprecated Internal implementation detail, do not use directly. Will be made internal in v8.
   */
  public index: number = -1;

  /**
   * This creates an instance of a `VirtualTimeScheduler`. Experts only. The signature of
   * this constructor is likely to change in the long run.
   *
   * @param schedulerActionCtor The type of Action to initialize when initializing actions during scheduling.
   * @param maxFrames The maximum number of frames to process before stopping. Used to prevent endless flush cycles.
   */
  constructor(schedulerActionCtor: typeof AsyncAction = VirtualAction as any, public maxFrames: number = Infinity) {
    super(schedulerActionCtor, () => this.frame);
  }

  /**
   * Prompt the Scheduler to execute all of its queued actions, therefore
   * clearing its queue.
   */
  public flush(): void {
    const { actions, maxFrames } = this;
    let error: any;
    let action: AsyncAction<any> | undefined;

    while ((action = actions[0]) && action.delay <= maxFrames) {
      actions.shift();
      this.frame = action.delay;

      if ((error = action.execute(action.state, action.delay))) {
        break;
      }
    }

    if (error) {
      while ((action = actions.shift())) {
        action.unsubscribe();
      }
      throw error;
    }
  }
}

export class VirtualAction<T> extends AsyncAction<T> {
  protected active: boolean = true;

  constructor(
    protected scheduler: VirtualTimeScheduler,
    protected work: (this: SchedulerAction<T>, state?: T) => void,
    protected index: number = (scheduler.index += 1)
  ) {
    super(scheduler, work);
    this.index = scheduler.index = index;
  }

  public schedule(state?: T, delay: number = 0): Subscription {
    if (Number.isFinite(delay)) {
      if (!this.id) {
        return super.schedule(state, delay);
      }
      this.active = false;
      // If an action is rescheduled, we save allocations by mutating its state,
      // pushing it to the end of the scheduler queue, and recycling the action.
      // But since the VirtualTimeScheduler is used for testing, VirtualActions
      // must be immutable so they can be inspected later.
      const action = new VirtualAction(this.scheduler, this.work);
      this.add(action);
      return action.schedule(state, delay);
    } else {
      // If someone schedules something with Infinity, it'll never happen. So we
      // don't even schedule it.
      return Subscription.EMPTY;
    }
  }

  protected requestAsyncId(scheduler: VirtualTimeScheduler, id?: any, delay: number = 0): TimerHandle {
    this.delay = scheduler.frame + delay;
    const { actions } = scheduler;
    actions.push(this);
    (actions as Array<VirtualAction<T>>).sort(VirtualAction.sortActions);
    return 1;
  }

  protected recycleAsyncId(scheduler: VirtualTimeScheduler, id?: any, delay: number = 0): TimerHandle | undefined {
    return undefined;
  }

  protected _execute(state: T, delay: number): any {
    if (this.active === true) {
      return super._execute(state, delay);
    }
  }

  private static sortActions<T>(a: VirtualAction<T>, b: VirtualAction<T>) {
    if (a.delay === b.delay) {
      if (a.index === b.index) {
        return 0;
      } else if (a.index > b.index) {
        return 1;
      } else {
        return -1;
      }
    } else if (a.delay > b.delay) {
      return 1;
    } else {
      return -1;
    }
  }
}

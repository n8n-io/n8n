import { Action } from './Action';
import { SchedulerAction } from '../types';
import { Subscription } from '../Subscription';
import { AsyncScheduler } from './AsyncScheduler';
import { intervalProvider } from './intervalProvider';
import { arrRemove } from '../util/arrRemove';
import { TimerHandle } from './timerHandle';

export class AsyncAction<T> extends Action<T> {
  public id: TimerHandle | undefined;
  public state?: T;
  // @ts-ignore: Property has no initializer and is not definitely assigned
  public delay: number;
  protected pending: boolean = false;

  constructor(protected scheduler: AsyncScheduler, protected work: (this: SchedulerAction<T>, state?: T) => void) {
    super(scheduler, work);
  }

  public schedule(state?: T, delay: number = 0): Subscription {
    if (this.closed) {
      return this;
    }

    // Always replace the current state with the new state.
    this.state = state;

    const id = this.id;
    const scheduler = this.scheduler;

    //
    // Important implementation note:
    //
    // Actions only execute once by default, unless rescheduled from within the
    // scheduled callback. This allows us to implement single and repeat
    // actions via the same code path, without adding API surface area, as well
    // as mimic traditional recursion but across asynchronous boundaries.
    //
    // However, JS runtimes and timers distinguish between intervals achieved by
    // serial `setTimeout` calls vs. a single `setInterval` call. An interval of
    // serial `setTimeout` calls can be individually delayed, which delays
    // scheduling the next `setTimeout`, and so on. `setInterval` attempts to
    // guarantee the interval callback will be invoked more precisely to the
    // interval period, regardless of load.
    //
    // Therefore, we use `setInterval` to schedule single and repeat actions.
    // If the action reschedules itself with the same delay, the interval is not
    // canceled. If the action doesn't reschedule, or reschedules with a
    // different delay, the interval will be canceled after scheduled callback
    // execution.
    //
    if (id != null) {
      this.id = this.recycleAsyncId(scheduler, id, delay);
    }

    // Set the pending flag indicating that this action has been scheduled, or
    // has recursively rescheduled itself.
    this.pending = true;

    this.delay = delay;
    // If this action has already an async Id, don't request a new one.
    this.id = this.id ?? this.requestAsyncId(scheduler, this.id, delay);

    return this;
  }

  protected requestAsyncId(scheduler: AsyncScheduler, _id?: TimerHandle, delay: number = 0): TimerHandle {
    return intervalProvider.setInterval(scheduler.flush.bind(scheduler, this), delay);
  }

  protected recycleAsyncId(_scheduler: AsyncScheduler, id?: TimerHandle, delay: number | null = 0): TimerHandle | undefined {
    // If this action is rescheduled with the same delay time, don't clear the interval id.
    if (delay != null && this.delay === delay && this.pending === false) {
      return id;
    }
    // Otherwise, if the action's delay time is different from the current delay,
    // or the action has been rescheduled before it's executed, clear the interval id
    if (id != null) {
      intervalProvider.clearInterval(id);
    }

    return undefined;
  }

  /**
   * Immediately executes this action and the `work` it contains.
   */
  public execute(state: T, delay: number): any {
    if (this.closed) {
      return new Error('executing a cancelled action');
    }

    this.pending = false;
    const error = this._execute(state, delay);
    if (error) {
      return error;
    } else if (this.pending === false && this.id != null) {
      // Dequeue if the action didn't reschedule itself. Don't call
      // unsubscribe(), because the action could reschedule later.
      // For example:
      // ```
      // scheduler.schedule(function doWork(counter) {
      //   /* ... I'm a busy worker bee ... */
      //   var originalAction = this;
      //   /* wait 100ms before rescheduling the action */
      //   setTimeout(function () {
      //     originalAction.schedule(counter + 1);
      //   }, 100);
      // }, 1000);
      // ```
      this.id = this.recycleAsyncId(this.scheduler, this.id, null);
    }
  }

  protected _execute(state: T, _delay: number): any {
    let errored: boolean = false;
    let errorValue: any;
    try {
      this.work(state);
    } catch (e) {
      errored = true;
      // HACK: Since code elsewhere is relying on the "truthiness" of the
      // return here, we can't have it return "" or 0 or false.
      // TODO: Clean this up when we refactor schedulers mid-version-8 or so.
      errorValue = e ? e : new Error('Scheduled action threw falsy error');
    }
    if (errored) {
      this.unsubscribe();
      return errorValue;
    }
  }

  unsubscribe() {
    if (!this.closed) {
      const { id, scheduler } = this;
      const { actions } = scheduler;

      this.work = this.state = this.scheduler = null!;
      this.pending = false;

      arrRemove(actions, this);
      if (id != null) {
        this.id = this.recycleAsyncId(scheduler, id, null);
      }

      this.delay = null!;
      super.unsubscribe();
    }
  }
}

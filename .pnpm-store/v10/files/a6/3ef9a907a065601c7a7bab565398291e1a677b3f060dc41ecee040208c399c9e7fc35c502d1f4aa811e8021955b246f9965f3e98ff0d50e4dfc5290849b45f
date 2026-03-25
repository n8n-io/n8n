import { Subscription } from '../Subscription';
import { SchedulerAction, SchedulerLike } from '../types';

export function executeSchedule(
  parentSubscription: Subscription,
  scheduler: SchedulerLike,
  work: () => void,
  delay: number,
  repeat: true
): void;
export function executeSchedule(
  parentSubscription: Subscription,
  scheduler: SchedulerLike,
  work: () => void,
  delay?: number,
  repeat?: false
): Subscription;

export function executeSchedule(
  parentSubscription: Subscription,
  scheduler: SchedulerLike,
  work: () => void,
  delay = 0,
  repeat = false
): Subscription | void {
  const scheduleSubscription = scheduler.schedule(function (this: SchedulerAction<any>) {
    work();
    if (repeat) {
      parentSubscription.add(this.schedule(null, delay));
    } else {
      this.unsubscribe();
    }
  }, delay);

  parentSubscription.add(scheduleSubscription);

  if (!repeat) {
    // Because user-land scheduler implementations are unlikely to properly reuse
    // Actions for repeat scheduling, we can't trust that the returned subscription
    // will control repeat subscription scenarios. So we're trying to avoid using them
    // incorrectly within this library.
    return scheduleSubscription;
  }
}

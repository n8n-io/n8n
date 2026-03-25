import { Scheduler } from '../Scheduler';
import { SubscriptionLog } from './SubscriptionLog';

export class SubscriptionLoggable {
  public subscriptions: SubscriptionLog[] = [];
  // @ts-ignore: Property has no initializer and is not definitely assigned
  scheduler: Scheduler;

  logSubscribedFrame(): number {
    this.subscriptions.push(new SubscriptionLog(this.scheduler.now()));
    return this.subscriptions.length - 1;
  }

  logUnsubscribedFrame(index: number) {
    const subscriptionLogs = this.subscriptions;
    const oldSubscriptionLog = subscriptionLogs[index];
    subscriptionLogs[index] = new SubscriptionLog(
      oldSubscriptionLog.subscribedFrame,
      this.scheduler.now()
    );
  }
}

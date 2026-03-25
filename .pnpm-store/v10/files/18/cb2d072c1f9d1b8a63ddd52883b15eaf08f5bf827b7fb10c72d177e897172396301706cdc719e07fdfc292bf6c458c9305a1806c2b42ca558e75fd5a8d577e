import { Subject } from '../Subject';
import { Subscription } from '../Subscription';
import { SubscriptionLoggable } from './SubscriptionLoggable';
import { applyMixins } from '../util/applyMixins';
import { observeNotification } from '../Notification';
export class HotObservable extends Subject {
    constructor(messages, scheduler) {
        super();
        this.messages = messages;
        this.subscriptions = [];
        this.scheduler = scheduler;
    }
    _subscribe(subscriber) {
        const subject = this;
        const index = subject.logSubscribedFrame();
        const subscription = new Subscription();
        subscription.add(new Subscription(() => {
            subject.logUnsubscribedFrame(index);
        }));
        subscription.add(super._subscribe(subscriber));
        return subscription;
    }
    setup() {
        const subject = this;
        const messagesLength = subject.messages.length;
        for (let i = 0; i < messagesLength; i++) {
            (() => {
                const { notification, frame } = subject.messages[i];
                subject.scheduler.schedule(() => {
                    observeNotification(notification, subject);
                }, frame);
            })();
        }
    }
}
applyMixins(HotObservable, [SubscriptionLoggable]);
//# sourceMappingURL=HotObservable.js.map
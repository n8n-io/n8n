import { Subject } from '../Subject';
import { Scheduler } from '../Scheduler';
import { TestMessage } from './TestMessage';
import { SubscriptionLog } from './SubscriptionLog';
import { SubscriptionLoggable } from './SubscriptionLoggable';
export declare class HotObservable<T> extends Subject<T> implements SubscriptionLoggable {
    messages: TestMessage[];
    subscriptions: SubscriptionLog[];
    scheduler: Scheduler;
    logSubscribedFrame: () => number;
    logUnsubscribedFrame: (index: number) => void;
    constructor(messages: TestMessage[], scheduler: Scheduler);
    setup(): void;
}
//# sourceMappingURL=HotObservable.d.ts.map
import { asyncScheduler } from '../scheduler/async';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function timeInterval(scheduler = asyncScheduler) {
    return operate((source, subscriber) => {
        let last = scheduler.now();
        source.subscribe(createOperatorSubscriber(subscriber, (value) => {
            const now = scheduler.now();
            const interval = now - last;
            last = now;
            subscriber.next(new TimeInterval(value, interval));
        }));
    });
}
export class TimeInterval {
    constructor(value, interval) {
        this.value = value;
        this.interval = interval;
    }
}
//# sourceMappingURL=timeInterval.js.map
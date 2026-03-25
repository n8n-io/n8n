import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function pairwise() {
    return operate((source, subscriber) => {
        let prev;
        let hasPrev = false;
        source.subscribe(createOperatorSubscriber(subscriber, (value) => {
            const p = prev;
            prev = value;
            hasPrev && subscriber.next([p, value]);
            hasPrev = true;
        }));
    });
}
//# sourceMappingURL=pairwise.js.map
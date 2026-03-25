import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function pairwise() {
    return operate(function (source, subscriber) {
        var prev;
        var hasPrev = false;
        source.subscribe(createOperatorSubscriber(subscriber, function (value) {
            var p = prev;
            prev = value;
            hasPrev && subscriber.next([p, value]);
            hasPrev = true;
        }));
    });
}
//# sourceMappingURL=pairwise.js.map
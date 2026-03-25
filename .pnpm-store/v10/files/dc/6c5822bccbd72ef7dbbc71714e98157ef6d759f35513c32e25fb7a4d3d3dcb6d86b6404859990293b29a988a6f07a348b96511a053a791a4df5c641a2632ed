import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { noop } from '../util/noop';
import { innerFrom } from '../observable/innerFrom';
export function distinct(keySelector, flushes) {
    return operate(function (source, subscriber) {
        var distinctKeys = new Set();
        source.subscribe(createOperatorSubscriber(subscriber, function (value) {
            var key = keySelector ? keySelector(value) : value;
            if (!distinctKeys.has(key)) {
                distinctKeys.add(key);
                subscriber.next(value);
            }
        }));
        flushes && innerFrom(flushes).subscribe(createOperatorSubscriber(subscriber, function () { return distinctKeys.clear(); }, noop));
    });
}
//# sourceMappingURL=distinct.js.map
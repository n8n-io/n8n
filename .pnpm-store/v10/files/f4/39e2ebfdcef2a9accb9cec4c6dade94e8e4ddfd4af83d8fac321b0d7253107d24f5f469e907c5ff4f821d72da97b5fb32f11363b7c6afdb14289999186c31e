import { innerFrom } from '../observable/innerFrom';
import { operate } from '../util/lift';
import { noop } from '../util/noop';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function sample(notifier) {
    return operate(function (source, subscriber) {
        var hasValue = false;
        var lastValue = null;
        source.subscribe(createOperatorSubscriber(subscriber, function (value) {
            hasValue = true;
            lastValue = value;
        }));
        innerFrom(notifier).subscribe(createOperatorSubscriber(subscriber, function () {
            if (hasValue) {
                hasValue = false;
                var value = lastValue;
                lastValue = null;
                subscriber.next(value);
            }
        }, noop));
    });
}
//# sourceMappingURL=sample.js.map
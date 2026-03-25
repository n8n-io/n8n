import { innerFrom } from '../observable/innerFrom';
import { operate } from '../util/lift';
import { noop } from '../util/noop';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function sample(notifier) {
    return operate((source, subscriber) => {
        let hasValue = false;
        let lastValue = null;
        source.subscribe(createOperatorSubscriber(subscriber, (value) => {
            hasValue = true;
            lastValue = value;
        }));
        innerFrom(notifier).subscribe(createOperatorSubscriber(subscriber, () => {
            if (hasValue) {
                hasValue = false;
                const value = lastValue;
                lastValue = null;
                subscriber.next(value);
            }
        }, noop));
    });
}
//# sourceMappingURL=sample.js.map
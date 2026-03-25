import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function defaultIfEmpty(defaultValue) {
    return operate((source, subscriber) => {
        let hasValue = false;
        source.subscribe(createOperatorSubscriber(subscriber, (value) => {
            hasValue = true;
            subscriber.next(value);
        }, () => {
            if (!hasValue) {
                subscriber.next(defaultValue);
            }
            subscriber.complete();
        }));
    });
}
//# sourceMappingURL=defaultIfEmpty.js.map
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function defaultIfEmpty(defaultValue) {
    return operate(function (source, subscriber) {
        var hasValue = false;
        source.subscribe(createOperatorSubscriber(subscriber, function (value) {
            hasValue = true;
            subscriber.next(value);
        }, function () {
            if (!hasValue) {
                subscriber.next(defaultValue);
            }
            subscriber.complete();
        }));
    });
}
//# sourceMappingURL=defaultIfEmpty.js.map
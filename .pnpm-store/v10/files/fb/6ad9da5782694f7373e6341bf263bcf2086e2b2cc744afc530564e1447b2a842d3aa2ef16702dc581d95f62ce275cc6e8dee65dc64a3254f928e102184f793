import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function isEmpty() {
    return operate(function (source, subscriber) {
        source.subscribe(createOperatorSubscriber(subscriber, function () {
            subscriber.next(false);
            subscriber.complete();
        }, function () {
            subscriber.next(true);
            subscriber.complete();
        }));
    });
}
//# sourceMappingURL=isEmpty.js.map
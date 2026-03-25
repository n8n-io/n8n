import { Notification } from '../Notification';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function materialize() {
    return operate(function (source, subscriber) {
        source.subscribe(createOperatorSubscriber(subscriber, function (value) {
            subscriber.next(Notification.createNext(value));
        }, function () {
            subscriber.next(Notification.createComplete());
            subscriber.complete();
        }, function (err) {
            subscriber.next(Notification.createError(err));
            subscriber.complete();
        }));
    });
}
//# sourceMappingURL=materialize.js.map
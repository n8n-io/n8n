import { observeNotification } from '../Notification';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function dematerialize() {
    return operate(function (source, subscriber) {
        source.subscribe(createOperatorSubscriber(subscriber, function (notification) { return observeNotification(notification, subscriber); }));
    });
}
//# sourceMappingURL=dematerialize.js.map
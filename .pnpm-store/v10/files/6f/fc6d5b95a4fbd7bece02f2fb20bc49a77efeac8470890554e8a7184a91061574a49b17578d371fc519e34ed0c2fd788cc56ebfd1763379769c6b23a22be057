import { observeNotification } from '../Notification';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function dematerialize() {
    return operate((source, subscriber) => {
        source.subscribe(createOperatorSubscriber(subscriber, (notification) => observeNotification(notification, subscriber)));
    });
}
//# sourceMappingURL=dematerialize.js.map
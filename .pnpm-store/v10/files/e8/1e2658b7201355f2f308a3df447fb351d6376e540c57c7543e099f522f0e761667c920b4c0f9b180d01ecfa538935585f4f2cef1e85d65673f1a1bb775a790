import { Notification } from '../Notification';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function materialize() {
    return operate((source, subscriber) => {
        source.subscribe(createOperatorSubscriber(subscriber, (value) => {
            subscriber.next(Notification.createNext(value));
        }, () => {
            subscriber.next(Notification.createComplete());
            subscriber.complete();
        }, (err) => {
            subscriber.next(Notification.createError(err));
            subscriber.complete();
        }));
    });
}
//# sourceMappingURL=materialize.js.map
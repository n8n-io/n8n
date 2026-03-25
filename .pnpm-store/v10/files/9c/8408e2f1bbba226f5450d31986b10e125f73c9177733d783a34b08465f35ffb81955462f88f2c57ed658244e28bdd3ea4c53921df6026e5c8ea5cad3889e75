import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function isEmpty() {
    return operate((source, subscriber) => {
        source.subscribe(createOperatorSubscriber(subscriber, () => {
            subscriber.next(false);
            subscriber.complete();
        }, () => {
            subscriber.next(true);
            subscriber.complete();
        }));
    });
}
//# sourceMappingURL=isEmpty.js.map
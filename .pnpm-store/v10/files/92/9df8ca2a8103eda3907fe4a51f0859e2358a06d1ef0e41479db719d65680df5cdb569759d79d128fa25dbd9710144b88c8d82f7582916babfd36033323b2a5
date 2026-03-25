import { EMPTY } from '../observable/empty';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function take(count) {
    return count <= 0
        ?
            () => EMPTY
        : operate((source, subscriber) => {
            let seen = 0;
            source.subscribe(createOperatorSubscriber(subscriber, (value) => {
                if (++seen <= count) {
                    subscriber.next(value);
                    if (count <= seen) {
                        subscriber.complete();
                    }
                }
            }));
        });
}
//# sourceMappingURL=take.js.map
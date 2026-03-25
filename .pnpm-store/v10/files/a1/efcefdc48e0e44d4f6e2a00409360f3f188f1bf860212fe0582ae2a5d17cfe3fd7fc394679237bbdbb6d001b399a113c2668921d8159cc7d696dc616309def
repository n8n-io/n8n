import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function skipWhile(predicate) {
    return operate((source, subscriber) => {
        let taking = false;
        let index = 0;
        source.subscribe(createOperatorSubscriber(subscriber, (value) => (taking || (taking = !predicate(value, index++))) && subscriber.next(value)));
    });
}
//# sourceMappingURL=skipWhile.js.map
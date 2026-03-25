import { identity } from '../util/identity';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function distinctUntilChanged(comparator, keySelector = identity) {
    comparator = comparator !== null && comparator !== void 0 ? comparator : defaultCompare;
    return operate((source, subscriber) => {
        let previousKey;
        let first = true;
        source.subscribe(createOperatorSubscriber(subscriber, (value) => {
            const currentKey = keySelector(value);
            if (first || !comparator(previousKey, currentKey)) {
                first = false;
                previousKey = currentKey;
                subscriber.next(value);
            }
        }));
    });
}
function defaultCompare(a, b) {
    return a === b;
}
//# sourceMappingURL=distinctUntilChanged.js.map
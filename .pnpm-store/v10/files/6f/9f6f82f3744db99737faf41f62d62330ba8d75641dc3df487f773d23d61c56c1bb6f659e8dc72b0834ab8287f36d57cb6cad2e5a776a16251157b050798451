import { identity } from '../util/identity';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function skipLast(skipCount) {
    return skipCount <= 0
        ?
            identity
        : operate((source, subscriber) => {
            let ring = new Array(skipCount);
            let seen = 0;
            source.subscribe(createOperatorSubscriber(subscriber, (value) => {
                const valueIndex = seen++;
                if (valueIndex < skipCount) {
                    ring[valueIndex] = value;
                }
                else {
                    const index = valueIndex % skipCount;
                    const oldValue = ring[index];
                    ring[index] = value;
                    subscriber.next(oldValue);
                }
            }));
            return () => {
                ring = null;
            };
        });
}
//# sourceMappingURL=skipLast.js.map
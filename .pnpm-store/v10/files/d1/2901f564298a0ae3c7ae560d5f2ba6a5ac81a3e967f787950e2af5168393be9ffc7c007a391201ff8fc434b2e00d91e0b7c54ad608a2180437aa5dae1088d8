import { EmptyError } from '../util/EmptyError';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function throwIfEmpty(errorFactory = defaultErrorFactory) {
    return operate((source, subscriber) => {
        let hasValue = false;
        source.subscribe(createOperatorSubscriber(subscriber, (value) => {
            hasValue = true;
            subscriber.next(value);
        }, () => (hasValue ? subscriber.complete() : subscriber.error(errorFactory()))));
    });
}
function defaultErrorFactory() {
    return new EmptyError();
}
//# sourceMappingURL=throwIfEmpty.js.map
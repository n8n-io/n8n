import { EmptyError } from '../util/EmptyError';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function throwIfEmpty(errorFactory) {
    if (errorFactory === void 0) { errorFactory = defaultErrorFactory; }
    return operate(function (source, subscriber) {
        var hasValue = false;
        source.subscribe(createOperatorSubscriber(subscriber, function (value) {
            hasValue = true;
            subscriber.next(value);
        }, function () { return (hasValue ? subscriber.complete() : subscriber.error(errorFactory())); }));
    });
}
function defaultErrorFactory() {
    return new EmptyError();
}
//# sourceMappingURL=throwIfEmpty.js.map
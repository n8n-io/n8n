import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function takeWhile(predicate, inclusive) {
    if (inclusive === void 0) { inclusive = false; }
    return operate(function (source, subscriber) {
        var index = 0;
        source.subscribe(createOperatorSubscriber(subscriber, function (value) {
            var result = predicate(value, index++);
            (result || inclusive) && subscriber.next(value);
            !result && subscriber.complete();
        }));
    });
}
//# sourceMappingURL=takeWhile.js.map
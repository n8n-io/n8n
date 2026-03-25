import { EmptyError } from '../util/EmptyError';
import { SequenceError } from '../util/SequenceError';
import { NotFoundError } from '../util/NotFoundError';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function single(predicate) {
    return operate(function (source, subscriber) {
        var hasValue = false;
        var singleValue;
        var seenValue = false;
        var index = 0;
        source.subscribe(createOperatorSubscriber(subscriber, function (value) {
            seenValue = true;
            if (!predicate || predicate(value, index++, source)) {
                hasValue && subscriber.error(new SequenceError('Too many matching values'));
                hasValue = true;
                singleValue = value;
            }
        }, function () {
            if (hasValue) {
                subscriber.next(singleValue);
                subscriber.complete();
            }
            else {
                subscriber.error(seenValue ? new NotFoundError('No matching values') : new EmptyError());
            }
        }));
    });
}
//# sourceMappingURL=single.js.map
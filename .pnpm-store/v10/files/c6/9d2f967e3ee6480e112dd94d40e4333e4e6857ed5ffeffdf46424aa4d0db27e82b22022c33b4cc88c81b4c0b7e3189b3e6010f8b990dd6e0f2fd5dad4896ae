import { EmptyError } from '../util/EmptyError';
import { SequenceError } from '../util/SequenceError';
import { NotFoundError } from '../util/NotFoundError';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function single(predicate) {
    return operate((source, subscriber) => {
        let hasValue = false;
        let singleValue;
        let seenValue = false;
        let index = 0;
        source.subscribe(createOperatorSubscriber(subscriber, (value) => {
            seenValue = true;
            if (!predicate || predicate(value, index++, source)) {
                hasValue && subscriber.error(new SequenceError('Too many matching values'));
                hasValue = true;
                singleValue = value;
            }
        }, () => {
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
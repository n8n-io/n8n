import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { noop } from '../util/noop';
export function ignoreElements() {
    return operate(function (source, subscriber) {
        source.subscribe(createOperatorSubscriber(subscriber, noop));
    });
}
//# sourceMappingURL=ignoreElements.js.map
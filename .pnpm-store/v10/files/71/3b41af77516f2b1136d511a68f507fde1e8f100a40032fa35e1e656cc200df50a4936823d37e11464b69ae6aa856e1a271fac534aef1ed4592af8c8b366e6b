import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { innerFrom } from '../observable/innerFrom';
import { noop } from '../util/noop';
export function takeUntil(notifier) {
    return operate(function (source, subscriber) {
        innerFrom(notifier).subscribe(createOperatorSubscriber(subscriber, function () { return subscriber.complete(); }, noop));
        !subscriber.closed && source.subscribe(subscriber);
    });
}
//# sourceMappingURL=takeUntil.js.map
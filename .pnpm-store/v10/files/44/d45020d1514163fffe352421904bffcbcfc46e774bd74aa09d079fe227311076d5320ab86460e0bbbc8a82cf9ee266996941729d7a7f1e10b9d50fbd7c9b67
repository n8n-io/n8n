import { operate } from '../util/lift';
import { noop } from '../util/noop';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { innerFrom } from '../observable/innerFrom';
export function buffer(closingNotifier) {
    return operate(function (source, subscriber) {
        var currentBuffer = [];
        source.subscribe(createOperatorSubscriber(subscriber, function (value) { return currentBuffer.push(value); }, function () {
            subscriber.next(currentBuffer);
            subscriber.complete();
        }));
        innerFrom(closingNotifier).subscribe(createOperatorSubscriber(subscriber, function () {
            var b = currentBuffer;
            currentBuffer = [];
            subscriber.next(b);
        }, noop));
        return function () {
            currentBuffer = null;
        };
    });
}
//# sourceMappingURL=buffer.js.map
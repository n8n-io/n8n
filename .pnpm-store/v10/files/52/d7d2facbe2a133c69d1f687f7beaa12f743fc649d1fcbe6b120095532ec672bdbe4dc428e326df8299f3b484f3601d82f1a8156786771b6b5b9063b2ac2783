import { isFunction } from '../util/isFunction';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { identity } from '../util/identity';
export function tap(observerOrNext, error, complete) {
    const tapObserver = isFunction(observerOrNext) || error || complete
        ?
            { next: observerOrNext, error, complete }
        : observerOrNext;
    return tapObserver
        ? operate((source, subscriber) => {
            var _a;
            (_a = tapObserver.subscribe) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
            let isUnsub = true;
            source.subscribe(createOperatorSubscriber(subscriber, (value) => {
                var _a;
                (_a = tapObserver.next) === null || _a === void 0 ? void 0 : _a.call(tapObserver, value);
                subscriber.next(value);
            }, () => {
                var _a;
                isUnsub = false;
                (_a = tapObserver.complete) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
                subscriber.complete();
            }, (err) => {
                var _a;
                isUnsub = false;
                (_a = tapObserver.error) === null || _a === void 0 ? void 0 : _a.call(tapObserver, err);
                subscriber.error(err);
            }, () => {
                var _a, _b;
                if (isUnsub) {
                    (_a = tapObserver.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
                }
                (_b = tapObserver.finalize) === null || _b === void 0 ? void 0 : _b.call(tapObserver);
            }));
        })
        :
            identity;
}
//# sourceMappingURL=tap.js.map
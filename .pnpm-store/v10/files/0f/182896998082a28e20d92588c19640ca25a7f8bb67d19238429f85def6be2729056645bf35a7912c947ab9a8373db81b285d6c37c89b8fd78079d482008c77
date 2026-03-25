import { Subject } from '../Subject';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { noop } from '../util/noop';
import { innerFrom } from '../observable/innerFrom';
export function window(windowBoundaries) {
    return operate((source, subscriber) => {
        let windowSubject = new Subject();
        subscriber.next(windowSubject.asObservable());
        const errorHandler = (err) => {
            windowSubject.error(err);
            subscriber.error(err);
        };
        source.subscribe(createOperatorSubscriber(subscriber, (value) => windowSubject === null || windowSubject === void 0 ? void 0 : windowSubject.next(value), () => {
            windowSubject.complete();
            subscriber.complete();
        }, errorHandler));
        innerFrom(windowBoundaries).subscribe(createOperatorSubscriber(subscriber, () => {
            windowSubject.complete();
            subscriber.next((windowSubject = new Subject()));
        }, noop, errorHandler));
        return () => {
            windowSubject === null || windowSubject === void 0 ? void 0 : windowSubject.unsubscribe();
            windowSubject = null;
        };
    });
}
//# sourceMappingURL=window.js.map
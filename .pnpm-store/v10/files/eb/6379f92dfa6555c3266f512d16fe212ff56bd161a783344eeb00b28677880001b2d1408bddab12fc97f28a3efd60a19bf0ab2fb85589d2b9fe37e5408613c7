import { Subject } from '../Subject';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { innerFrom } from '../observable/innerFrom';
export function windowWhen(closingSelector) {
    return operate((source, subscriber) => {
        let window;
        let closingSubscriber;
        const handleError = (err) => {
            window.error(err);
            subscriber.error(err);
        };
        const openWindow = () => {
            closingSubscriber === null || closingSubscriber === void 0 ? void 0 : closingSubscriber.unsubscribe();
            window === null || window === void 0 ? void 0 : window.complete();
            window = new Subject();
            subscriber.next(window.asObservable());
            let closingNotifier;
            try {
                closingNotifier = innerFrom(closingSelector());
            }
            catch (err) {
                handleError(err);
                return;
            }
            closingNotifier.subscribe((closingSubscriber = createOperatorSubscriber(subscriber, openWindow, openWindow, handleError)));
        };
        openWindow();
        source.subscribe(createOperatorSubscriber(subscriber, (value) => window.next(value), () => {
            window.complete();
            subscriber.complete();
        }, handleError, () => {
            closingSubscriber === null || closingSubscriber === void 0 ? void 0 : closingSubscriber.unsubscribe();
            window = null;
        }));
    });
}
//# sourceMappingURL=windowWhen.js.map
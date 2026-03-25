import { innerFrom } from '../observable/innerFrom';
import { Subject } from '../Subject';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function retryWhen(notifier) {
    return operate((source, subscriber) => {
        let innerSub;
        let syncResub = false;
        let errors$;
        const subscribeForRetryWhen = () => {
            innerSub = source.subscribe(createOperatorSubscriber(subscriber, undefined, undefined, (err) => {
                if (!errors$) {
                    errors$ = new Subject();
                    innerFrom(notifier(errors$)).subscribe(createOperatorSubscriber(subscriber, () => innerSub ? subscribeForRetryWhen() : (syncResub = true)));
                }
                if (errors$) {
                    errors$.next(err);
                }
            }));
            if (syncResub) {
                innerSub.unsubscribe();
                innerSub = null;
                syncResub = false;
                subscribeForRetryWhen();
            }
        };
        subscribeForRetryWhen();
    });
}
//# sourceMappingURL=retryWhen.js.map
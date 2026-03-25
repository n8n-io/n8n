import { innerFrom } from '../observable/innerFrom';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { operate } from '../util/lift';
export function catchError(selector) {
    return operate((source, subscriber) => {
        let innerSub = null;
        let syncUnsub = false;
        let handledResult;
        innerSub = source.subscribe(createOperatorSubscriber(subscriber, undefined, undefined, (err) => {
            handledResult = innerFrom(selector(err, catchError(selector)(source)));
            if (innerSub) {
                innerSub.unsubscribe();
                innerSub = null;
                handledResult.subscribe(subscriber);
            }
            else {
                syncUnsub = true;
            }
        }));
        if (syncUnsub) {
            innerSub.unsubscribe();
            innerSub = null;
            handledResult.subscribe(subscriber);
        }
    });
}
//# sourceMappingURL=catchError.js.map
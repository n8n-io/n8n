import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function refCount() {
    return operate((source, subscriber) => {
        let connection = null;
        source._refCount++;
        const refCounter = createOperatorSubscriber(subscriber, undefined, undefined, undefined, () => {
            if (!source || source._refCount <= 0 || 0 < --source._refCount) {
                connection = null;
                return;
            }
            const sharedConnection = source._connection;
            const conn = connection;
            connection = null;
            if (sharedConnection && (!conn || sharedConnection === conn)) {
                sharedConnection.unsubscribe();
            }
            subscriber.unsubscribe();
        });
        source.subscribe(refCounter);
        if (!refCounter.closed) {
            connection = source.connect();
        }
    });
}
//# sourceMappingURL=refCount.js.map
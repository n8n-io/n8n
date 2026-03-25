import { EMPTY } from '../observable/empty';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { innerFrom } from '../observable/innerFrom';
import { timer } from '../observable/timer';
export function repeat(countOrConfig) {
    let count = Infinity;
    let delay;
    if (countOrConfig != null) {
        if (typeof countOrConfig === 'object') {
            ({ count = Infinity, delay } = countOrConfig);
        }
        else {
            count = countOrConfig;
        }
    }
    return count <= 0
        ? () => EMPTY
        : operate((source, subscriber) => {
            let soFar = 0;
            let sourceSub;
            const resubscribe = () => {
                sourceSub === null || sourceSub === void 0 ? void 0 : sourceSub.unsubscribe();
                sourceSub = null;
                if (delay != null) {
                    const notifier = typeof delay === 'number' ? timer(delay) : innerFrom(delay(soFar));
                    const notifierSubscriber = createOperatorSubscriber(subscriber, () => {
                        notifierSubscriber.unsubscribe();
                        subscribeToSource();
                    });
                    notifier.subscribe(notifierSubscriber);
                }
                else {
                    subscribeToSource();
                }
            };
            const subscribeToSource = () => {
                let syncUnsub = false;
                sourceSub = source.subscribe(createOperatorSubscriber(subscriber, undefined, () => {
                    if (++soFar < count) {
                        if (sourceSub) {
                            resubscribe();
                        }
                        else {
                            syncUnsub = true;
                        }
                    }
                    else {
                        subscriber.complete();
                    }
                }));
                if (syncUnsub) {
                    resubscribe();
                }
            };
            subscribeToSource();
        });
}
//# sourceMappingURL=repeat.js.map
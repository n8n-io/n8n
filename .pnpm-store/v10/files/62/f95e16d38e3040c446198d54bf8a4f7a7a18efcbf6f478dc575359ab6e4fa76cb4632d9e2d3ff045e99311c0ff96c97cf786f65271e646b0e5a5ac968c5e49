import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { identity } from '../util/identity';
import { timer } from '../observable/timer';
import { innerFrom } from '../observable/innerFrom';
export function retry(configOrCount = Infinity) {
    let config;
    if (configOrCount && typeof configOrCount === 'object') {
        config = configOrCount;
    }
    else {
        config = {
            count: configOrCount,
        };
    }
    const { count = Infinity, delay, resetOnSuccess: resetOnSuccess = false } = config;
    return count <= 0
        ? identity
        : operate((source, subscriber) => {
            let soFar = 0;
            let innerSub;
            const subscribeForRetry = () => {
                let syncUnsub = false;
                innerSub = source.subscribe(createOperatorSubscriber(subscriber, (value) => {
                    if (resetOnSuccess) {
                        soFar = 0;
                    }
                    subscriber.next(value);
                }, undefined, (err) => {
                    if (soFar++ < count) {
                        const resub = () => {
                            if (innerSub) {
                                innerSub.unsubscribe();
                                innerSub = null;
                                subscribeForRetry();
                            }
                            else {
                                syncUnsub = true;
                            }
                        };
                        if (delay != null) {
                            const notifier = typeof delay === 'number' ? timer(delay) : innerFrom(delay(err, soFar));
                            const notifierSubscriber = createOperatorSubscriber(subscriber, () => {
                                notifierSubscriber.unsubscribe();
                                resub();
                            }, () => {
                                subscriber.complete();
                            });
                            notifier.subscribe(notifierSubscriber);
                        }
                        else {
                            resub();
                        }
                    }
                    else {
                        subscriber.error(err);
                    }
                }));
                if (syncUnsub) {
                    innerSub.unsubscribe();
                    innerSub = null;
                    subscribeForRetry();
                }
            };
            subscribeForRetry();
        });
}
//# sourceMappingURL=retry.js.map
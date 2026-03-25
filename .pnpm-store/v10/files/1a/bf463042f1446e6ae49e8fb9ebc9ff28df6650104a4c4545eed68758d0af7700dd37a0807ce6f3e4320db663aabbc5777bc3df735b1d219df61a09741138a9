import { Observable } from '../Observable';
import { innerFrom } from '../observable/innerFrom';
import { Subject } from '../Subject';
import { operate } from '../util/lift';
import { createOperatorSubscriber, OperatorSubscriber } from './OperatorSubscriber';
export function groupBy(keySelector, elementOrOptions, duration, connector) {
    return operate((source, subscriber) => {
        let element;
        if (!elementOrOptions || typeof elementOrOptions === 'function') {
            element = elementOrOptions;
        }
        else {
            ({ duration, element, connector } = elementOrOptions);
        }
        const groups = new Map();
        const notify = (cb) => {
            groups.forEach(cb);
            cb(subscriber);
        };
        const handleError = (err) => notify((consumer) => consumer.error(err));
        let activeGroups = 0;
        let teardownAttempted = false;
        const groupBySourceSubscriber = new OperatorSubscriber(subscriber, (value) => {
            try {
                const key = keySelector(value);
                let group = groups.get(key);
                if (!group) {
                    groups.set(key, (group = connector ? connector() : new Subject()));
                    const grouped = createGroupedObservable(key, group);
                    subscriber.next(grouped);
                    if (duration) {
                        const durationSubscriber = createOperatorSubscriber(group, () => {
                            group.complete();
                            durationSubscriber === null || durationSubscriber === void 0 ? void 0 : durationSubscriber.unsubscribe();
                        }, undefined, undefined, () => groups.delete(key));
                        groupBySourceSubscriber.add(innerFrom(duration(grouped)).subscribe(durationSubscriber));
                    }
                }
                group.next(element ? element(value) : value);
            }
            catch (err) {
                handleError(err);
            }
        }, () => notify((consumer) => consumer.complete()), handleError, () => groups.clear(), () => {
            teardownAttempted = true;
            return activeGroups === 0;
        });
        source.subscribe(groupBySourceSubscriber);
        function createGroupedObservable(key, groupSubject) {
            const result = new Observable((groupSubscriber) => {
                activeGroups++;
                const innerSub = groupSubject.subscribe(groupSubscriber);
                return () => {
                    innerSub.unsubscribe();
                    --activeGroups === 0 && teardownAttempted && groupBySourceSubscriber.unsubscribe();
                };
            });
            result.key = key;
            return result;
        }
    });
}
//# sourceMappingURL=groupBy.js.map
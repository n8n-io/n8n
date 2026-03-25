import { innerFrom } from '../observable/innerFrom';
import { executeSchedule } from '../util/executeSchedule';
import { createOperatorSubscriber } from './OperatorSubscriber';
export function mergeInternals(source, subscriber, project, concurrent, onBeforeNext, expand, innerSubScheduler, additionalFinalizer) {
    const buffer = [];
    let active = 0;
    let index = 0;
    let isComplete = false;
    const checkComplete = () => {
        if (isComplete && !buffer.length && !active) {
            subscriber.complete();
        }
    };
    const outerNext = (value) => (active < concurrent ? doInnerSub(value) : buffer.push(value));
    const doInnerSub = (value) => {
        expand && subscriber.next(value);
        active++;
        let innerComplete = false;
        innerFrom(project(value, index++)).subscribe(createOperatorSubscriber(subscriber, (innerValue) => {
            onBeforeNext === null || onBeforeNext === void 0 ? void 0 : onBeforeNext(innerValue);
            if (expand) {
                outerNext(innerValue);
            }
            else {
                subscriber.next(innerValue);
            }
        }, () => {
            innerComplete = true;
        }, undefined, () => {
            if (innerComplete) {
                try {
                    active--;
                    while (buffer.length && active < concurrent) {
                        const bufferedValue = buffer.shift();
                        if (innerSubScheduler) {
                            executeSchedule(subscriber, innerSubScheduler, () => doInnerSub(bufferedValue));
                        }
                        else {
                            doInnerSub(bufferedValue);
                        }
                    }
                    checkComplete();
                }
                catch (err) {
                    subscriber.error(err);
                }
            }
        }));
    };
    source.subscribe(createOperatorSubscriber(subscriber, outerNext, () => {
        isComplete = true;
        checkComplete();
    }));
    return () => {
        additionalFinalizer === null || additionalFinalizer === void 0 ? void 0 : additionalFinalizer();
    };
}
//# sourceMappingURL=mergeInternals.js.map
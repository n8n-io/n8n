import { asyncScheduler } from '../scheduler/async';
import { isValidDate } from '../util/isDate';
import { operate } from '../util/lift';
import { innerFrom } from '../observable/innerFrom';
import { createErrorClass } from '../util/createErrorClass';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { executeSchedule } from '../util/executeSchedule';
export const TimeoutError = createErrorClass((_super) => function TimeoutErrorImpl(info = null) {
    _super(this);
    this.message = 'Timeout has occurred';
    this.name = 'TimeoutError';
    this.info = info;
});
export function timeout(config, schedulerArg) {
    const { first, each, with: _with = timeoutErrorFactory, scheduler = schedulerArg !== null && schedulerArg !== void 0 ? schedulerArg : asyncScheduler, meta = null, } = (isValidDate(config) ? { first: config } : typeof config === 'number' ? { each: config } : config);
    if (first == null && each == null) {
        throw new TypeError('No timeout provided.');
    }
    return operate((source, subscriber) => {
        let originalSourceSubscription;
        let timerSubscription;
        let lastValue = null;
        let seen = 0;
        const startTimer = (delay) => {
            timerSubscription = executeSchedule(subscriber, scheduler, () => {
                try {
                    originalSourceSubscription.unsubscribe();
                    innerFrom(_with({
                        meta,
                        lastValue,
                        seen,
                    })).subscribe(subscriber);
                }
                catch (err) {
                    subscriber.error(err);
                }
            }, delay);
        };
        originalSourceSubscription = source.subscribe(createOperatorSubscriber(subscriber, (value) => {
            timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.unsubscribe();
            seen++;
            subscriber.next((lastValue = value));
            each > 0 && startTimer(each);
        }, undefined, undefined, () => {
            if (!(timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.closed)) {
                timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.unsubscribe();
            }
            lastValue = null;
        }));
        !seen && startTimer(first != null ? (typeof first === 'number' ? first : +first - scheduler.now()) : each);
    });
}
function timeoutErrorFactory(info) {
    throw new TimeoutError(info);
}
//# sourceMappingURL=timeout.js.map
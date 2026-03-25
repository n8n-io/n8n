import { isScheduler } from '../util/isScheduler';
import { Observable } from '../Observable';
import { subscribeOn } from '../operators/subscribeOn';
import { mapOneOrManyArgs } from '../util/mapOneOrManyArgs';
import { observeOn } from '../operators/observeOn';
import { AsyncSubject } from '../AsyncSubject';
export function bindCallbackInternals(isNodeStyle, callbackFunc, resultSelector, scheduler) {
    if (resultSelector) {
        if (isScheduler(resultSelector)) {
            scheduler = resultSelector;
        }
        else {
            return function (...args) {
                return bindCallbackInternals(isNodeStyle, callbackFunc, scheduler)
                    .apply(this, args)
                    .pipe(mapOneOrManyArgs(resultSelector));
            };
        }
    }
    if (scheduler) {
        return function (...args) {
            return bindCallbackInternals(isNodeStyle, callbackFunc)
                .apply(this, args)
                .pipe(subscribeOn(scheduler), observeOn(scheduler));
        };
    }
    return function (...args) {
        const subject = new AsyncSubject();
        let uninitialized = true;
        return new Observable((subscriber) => {
            const subs = subject.subscribe(subscriber);
            if (uninitialized) {
                uninitialized = false;
                let isAsync = false;
                let isComplete = false;
                callbackFunc.apply(this, [
                    ...args,
                    (...results) => {
                        if (isNodeStyle) {
                            const err = results.shift();
                            if (err != null) {
                                subject.error(err);
                                return;
                            }
                        }
                        subject.next(1 < results.length ? results : results[0]);
                        isComplete = true;
                        if (isAsync) {
                            subject.complete();
                        }
                    },
                ]);
                if (isComplete) {
                    subject.complete();
                }
                isAsync = true;
            }
            return subs;
        });
    };
}
//# sourceMappingURL=bindCallbackInternals.js.map
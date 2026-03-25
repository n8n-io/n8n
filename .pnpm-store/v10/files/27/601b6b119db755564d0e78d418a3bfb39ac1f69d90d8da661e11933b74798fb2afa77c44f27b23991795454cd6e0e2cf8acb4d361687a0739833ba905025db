import { Observable } from '../Observable';
import { iterator as Symbol_iterator } from '../symbol/iterator';
import { isFunction } from '../util/isFunction';
import { executeSchedule } from '../util/executeSchedule';
export function scheduleIterable(input, scheduler) {
    return new Observable(function (subscriber) {
        var iterator;
        executeSchedule(subscriber, scheduler, function () {
            iterator = input[Symbol_iterator]();
            executeSchedule(subscriber, scheduler, function () {
                var _a;
                var value;
                var done;
                try {
                    (_a = iterator.next(), value = _a.value, done = _a.done);
                }
                catch (err) {
                    subscriber.error(err);
                    return;
                }
                if (done) {
                    subscriber.complete();
                }
                else {
                    subscriber.next(value);
                }
            }, 0, true);
        });
        return function () { return isFunction(iterator === null || iterator === void 0 ? void 0 : iterator.return) && iterator.return(); };
    });
}
//# sourceMappingURL=scheduleIterable.js.map
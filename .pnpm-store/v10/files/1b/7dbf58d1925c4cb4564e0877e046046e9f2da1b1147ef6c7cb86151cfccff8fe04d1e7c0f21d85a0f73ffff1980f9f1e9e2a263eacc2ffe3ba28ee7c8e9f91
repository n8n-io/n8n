import { asyncScheduler } from '../scheduler/async';
import { delayWhen } from './delayWhen';
import { timer } from '../observable/timer';
export function delay(due, scheduler) {
    if (scheduler === void 0) { scheduler = asyncScheduler; }
    var duration = timer(due, scheduler);
    return delayWhen(function () { return duration; });
}
//# sourceMappingURL=delay.js.map
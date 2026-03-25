import { asyncScheduler } from '../scheduler/async';
import { throttle } from './throttle';
import { timer } from '../observable/timer';
export function throttleTime(duration, scheduler, config) {
    if (scheduler === void 0) { scheduler = asyncScheduler; }
    var duration$ = timer(duration, scheduler);
    return throttle(function () { return duration$; }, config);
}
//# sourceMappingURL=throttleTime.js.map
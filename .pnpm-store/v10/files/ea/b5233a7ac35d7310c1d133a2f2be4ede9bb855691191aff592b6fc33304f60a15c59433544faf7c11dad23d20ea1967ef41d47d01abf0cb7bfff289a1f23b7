import { asyncScheduler } from '../scheduler/async';
import { audit } from './audit';
import { timer } from '../observable/timer';
export function auditTime(duration, scheduler) {
    if (scheduler === void 0) { scheduler = asyncScheduler; }
    return audit(function () { return timer(duration, scheduler); });
}
//# sourceMappingURL=auditTime.js.map
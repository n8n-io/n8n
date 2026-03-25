import { asyncScheduler } from '../scheduler/async';
import { timer } from './timer';
export function interval(period = 0, scheduler = asyncScheduler) {
    if (period < 0) {
        period = 0;
    }
    return timer(period, period, scheduler);
}
//# sourceMappingURL=interval.js.map
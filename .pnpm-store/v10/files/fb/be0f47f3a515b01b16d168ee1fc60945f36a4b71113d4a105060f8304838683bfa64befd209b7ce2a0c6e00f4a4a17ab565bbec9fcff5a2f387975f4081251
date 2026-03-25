import { asyncScheduler } from '../scheduler/async';
import { delayWhen } from './delayWhen';
import { timer } from '../observable/timer';
export function delay(due, scheduler = asyncScheduler) {
    const duration = timer(due, scheduler);
    return delayWhen(() => duration);
}
//# sourceMappingURL=delay.js.map
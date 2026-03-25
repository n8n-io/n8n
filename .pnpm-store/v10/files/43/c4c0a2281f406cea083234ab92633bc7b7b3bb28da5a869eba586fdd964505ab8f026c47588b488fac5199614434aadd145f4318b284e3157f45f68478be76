import { asyncScheduler } from '../scheduler/async';
import { sample } from './sample';
import { interval } from '../observable/interval';
export function sampleTime(period, scheduler) {
    if (scheduler === void 0) { scheduler = asyncScheduler; }
    return sample(interval(period, scheduler));
}
//# sourceMappingURL=sampleTime.js.map
import { asyncScheduler } from '../scheduler/async';
import { audit } from './audit';
import { timer } from '../observable/timer';
export function auditTime(duration, scheduler = asyncScheduler) {
    return audit(() => timer(duration, scheduler));
}
//# sourceMappingURL=auditTime.js.map
import { innerFrom } from '../observable/innerFrom';
import { observeOn } from '../operators/observeOn';
import { subscribeOn } from '../operators/subscribeOn';
export function schedulePromise(input, scheduler) {
    return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
}
//# sourceMappingURL=schedulePromise.js.map
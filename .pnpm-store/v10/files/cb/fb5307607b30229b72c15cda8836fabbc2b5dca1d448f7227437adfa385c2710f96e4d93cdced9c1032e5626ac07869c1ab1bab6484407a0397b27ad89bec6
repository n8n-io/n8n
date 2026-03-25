import { concat } from '../observable/concat';
import { popScheduler } from '../util/args';
import { operate } from '../util/lift';
export function startWith(...values) {
    const scheduler = popScheduler(values);
    return operate((source, subscriber) => {
        (scheduler ? concat(values, source, scheduler) : concat(values, source)).subscribe(subscriber);
    });
}
//# sourceMappingURL=startWith.js.map
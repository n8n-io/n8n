import { operate } from '../util/lift';
import { mergeAll } from './mergeAll';
import { popNumber, popScheduler } from '../util/args';
import { from } from '../observable/from';
export function merge(...args) {
    const scheduler = popScheduler(args);
    const concurrent = popNumber(args, Infinity);
    return operate((source, subscriber) => {
        mergeAll(concurrent)(from([source, ...args], scheduler)).subscribe(subscriber);
    });
}
//# sourceMappingURL=merge.js.map
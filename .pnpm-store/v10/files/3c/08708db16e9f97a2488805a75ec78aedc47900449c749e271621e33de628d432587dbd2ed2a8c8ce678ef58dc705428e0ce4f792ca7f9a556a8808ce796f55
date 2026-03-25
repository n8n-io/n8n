import { operate } from '../util/lift';
import { argsOrArgArray } from '../util/argsOrArgArray';
import { mergeAll } from './mergeAll';
import { popNumber, popScheduler } from '../util/args';
import { from } from '../observable/from';
export function merge(...args) {
    const scheduler = popScheduler(args);
    const concurrent = popNumber(args, Infinity);
    args = argsOrArgArray(args);
    return operate((source, subscriber) => {
        mergeAll(concurrent)(from([source, ...args], scheduler)).subscribe(subscriber);
    });
}
//# sourceMappingURL=merge.js.map
import { combineLatestInit } from '../observable/combineLatest';
import { operate } from '../util/lift';
import { argsOrArgArray } from '../util/argsOrArgArray';
import { mapOneOrManyArgs } from '../util/mapOneOrManyArgs';
import { pipe } from '../util/pipe';
import { popResultSelector } from '../util/args';
export function combineLatest(...args) {
    const resultSelector = popResultSelector(args);
    return resultSelector
        ? pipe(combineLatest(...args), mapOneOrManyArgs(resultSelector))
        : operate((source, subscriber) => {
            combineLatestInit([source, ...argsOrArgArray(args)])(subscriber);
        });
}
//# sourceMappingURL=combineLatest.js.map
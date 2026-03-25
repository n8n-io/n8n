import { mergeAll } from '../operators/mergeAll';
import { innerFrom } from './innerFrom';
import { EMPTY } from './empty';
import { popNumber, popScheduler } from '../util/args';
import { from } from './from';
export function merge(...args) {
    const scheduler = popScheduler(args);
    const concurrent = popNumber(args, Infinity);
    const sources = args;
    return !sources.length
        ?
            EMPTY
        : sources.length === 1
            ?
                innerFrom(sources[0])
            :
                mergeAll(concurrent)(from(sources, scheduler));
}
//# sourceMappingURL=merge.js.map
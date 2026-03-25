import { mergeAll } from '../operators/mergeAll';
import { innerFrom } from './innerFrom';
import { EMPTY } from './empty';
import { popNumber, popScheduler } from '../util/args';
import { from } from './from';
export function merge() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var scheduler = popScheduler(args);
    var concurrent = popNumber(args, Infinity);
    var sources = args;
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
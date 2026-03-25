import { operate } from '../util/lift';
import { mergeInternals } from './mergeInternals';
export function mergeScan(accumulator, seed, concurrent) {
    if (concurrent === void 0) { concurrent = Infinity; }
    return operate(function (source, subscriber) {
        var state = seed;
        return mergeInternals(source, subscriber, function (value, index) { return accumulator(state, value, index); }, concurrent, function (value) {
            state = value;
        }, false, undefined, function () { return (state = null); });
    });
}
//# sourceMappingURL=mergeScan.js.map
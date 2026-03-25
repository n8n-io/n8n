import { mergeMap } from './mergeMap';
import { isFunction } from '../util/isFunction';
export function mergeMapTo(innerObservable, resultSelector, concurrent) {
    if (concurrent === void 0) { concurrent = Infinity; }
    if (isFunction(resultSelector)) {
        return mergeMap(function () { return innerObservable; }, resultSelector, concurrent);
    }
    if (typeof resultSelector === 'number') {
        concurrent = resultSelector;
    }
    return mergeMap(function () { return innerObservable; }, concurrent);
}
//# sourceMappingURL=mergeMapTo.js.map
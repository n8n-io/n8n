import { concatMap } from './concatMap';
import { isFunction } from '../util/isFunction';
export function concatMapTo(innerObservable, resultSelector) {
    return isFunction(resultSelector) ? concatMap(() => innerObservable, resultSelector) : concatMap(() => innerObservable);
}
//# sourceMappingURL=concatMapTo.js.map
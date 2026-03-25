import { switchMap } from './switchMap';
import { isFunction } from '../util/isFunction';
export function switchMapTo(innerObservable, resultSelector) {
    return isFunction(resultSelector) ? switchMap(() => innerObservable, resultSelector) : switchMap(() => innerObservable);
}
//# sourceMappingURL=switchMapTo.js.map
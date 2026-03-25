import { reduce } from './reduce';
import { isFunction } from '../util/isFunction';
export function max(comparer) {
    return reduce(isFunction(comparer) ? function (x, y) { return (comparer(x, y) > 0 ? x : y); } : function (x, y) { return (x > y ? x : y); });
}
//# sourceMappingURL=max.js.map
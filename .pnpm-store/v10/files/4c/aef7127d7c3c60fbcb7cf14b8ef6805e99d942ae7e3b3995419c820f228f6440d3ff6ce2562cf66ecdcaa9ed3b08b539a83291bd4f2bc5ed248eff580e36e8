import { reduce } from './reduce';
import { isFunction } from '../util/isFunction';
export function max(comparer) {
    return reduce(isFunction(comparer) ? (x, y) => (comparer(x, y) > 0 ? x : y) : (x, y) => (x > y ? x : y));
}
//# sourceMappingURL=max.js.map
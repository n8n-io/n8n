import { Observable } from '../Observable';
import { isFunction } from './isFunction';
export function isObservable(obj) {
    return !!obj && (obj instanceof Observable || (isFunction(obj.lift) && isFunction(obj.subscribe)));
}
//# sourceMappingURL=isObservable.js.map
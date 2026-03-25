import { isFunction } from './isFunction';
import { isScheduler } from './isScheduler';
function last(arr) {
    return arr[arr.length - 1];
}
export function popResultSelector(args) {
    return isFunction(last(args)) ? args.pop() : undefined;
}
export function popScheduler(args) {
    return isScheduler(last(args)) ? args.pop() : undefined;
}
export function popNumber(args, defaultValue) {
    return typeof last(args) === 'number' ? args.pop() : defaultValue;
}
//# sourceMappingURL=args.js.map
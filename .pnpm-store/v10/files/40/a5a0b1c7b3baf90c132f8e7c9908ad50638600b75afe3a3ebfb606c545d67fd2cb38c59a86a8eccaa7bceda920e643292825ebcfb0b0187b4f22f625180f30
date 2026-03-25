import { reduce } from './reduce';
import { operate } from '../util/lift';
var arrReducer = function (arr, value) { return (arr.push(value), arr); };
export function toArray() {
    return operate(function (source, subscriber) {
        reduce(arrReducer, [])(source).subscribe(subscriber);
    });
}
//# sourceMappingURL=toArray.js.map
import { reduce } from './reduce';
import { operate } from '../util/lift';
const arrReducer = (arr, value) => (arr.push(value), arr);
export function toArray() {
    return operate((source, subscriber) => {
        reduce(arrReducer, [])(source).subscribe(subscriber);
    });
}
//# sourceMappingURL=toArray.js.map
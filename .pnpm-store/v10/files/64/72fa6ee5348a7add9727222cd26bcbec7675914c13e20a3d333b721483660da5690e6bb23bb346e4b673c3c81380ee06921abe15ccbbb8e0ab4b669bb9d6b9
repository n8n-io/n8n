import { not } from '../util/not';
import { filter } from '../operators/filter';
import { innerFrom } from './innerFrom';
export function partition(source, predicate, thisArg) {
    return [filter(predicate, thisArg)(innerFrom(source)), filter(not(predicate, thisArg))(innerFrom(source))];
}
//# sourceMappingURL=partition.js.map
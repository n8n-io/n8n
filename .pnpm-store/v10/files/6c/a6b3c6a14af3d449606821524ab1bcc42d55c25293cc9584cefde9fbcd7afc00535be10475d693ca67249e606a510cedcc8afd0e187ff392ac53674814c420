import { mergeMap } from './mergeMap';
import { isFunction } from '../util/isFunction';
export function concatMap(project, resultSelector) {
    return isFunction(resultSelector) ? mergeMap(project, resultSelector, 1) : mergeMap(project, 1);
}
//# sourceMappingURL=concatMap.js.map
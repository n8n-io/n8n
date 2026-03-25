import { map } from './map';
import { innerFrom } from '../observable/innerFrom';
import { operate } from '../util/lift';
import { mergeInternals } from './mergeInternals';
import { isFunction } from '../util/isFunction';
export function mergeMap(project, resultSelector, concurrent = Infinity) {
    if (isFunction(resultSelector)) {
        return mergeMap((a, i) => map((b, ii) => resultSelector(a, b, i, ii))(innerFrom(project(a, i))), concurrent);
    }
    else if (typeof resultSelector === 'number') {
        concurrent = resultSelector;
    }
    return operate((source, subscriber) => mergeInternals(source, subscriber, project, concurrent));
}
//# sourceMappingURL=mergeMap.js.map
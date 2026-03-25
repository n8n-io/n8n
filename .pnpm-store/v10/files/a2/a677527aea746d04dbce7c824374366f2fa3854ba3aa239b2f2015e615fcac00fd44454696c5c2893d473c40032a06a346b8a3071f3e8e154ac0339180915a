import { identity } from '../util/identity';
import { mapOneOrManyArgs } from '../util/mapOneOrManyArgs';
import { pipe } from '../util/pipe';
import { mergeMap } from './mergeMap';
import { toArray } from './toArray';
export function joinAllInternals(joinFn, project) {
    return pipe(toArray(), mergeMap(function (sources) { return joinFn(sources); }), project ? mapOneOrManyArgs(project) : identity);
}
//# sourceMappingURL=joinAllInternals.js.map
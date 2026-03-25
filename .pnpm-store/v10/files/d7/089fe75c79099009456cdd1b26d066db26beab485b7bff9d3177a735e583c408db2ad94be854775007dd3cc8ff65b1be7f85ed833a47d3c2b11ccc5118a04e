import { argsOrArgArray } from '../util/argsOrArgArray';
import { onErrorResumeNext as oERNCreate } from '../observable/onErrorResumeNext';
export function onErrorResumeNextWith(...sources) {
    const nextSources = argsOrArgArray(sources);
    return (source) => oERNCreate(source, ...nextSources);
}
export const onErrorResumeNext = onErrorResumeNextWith;
//# sourceMappingURL=onErrorResumeNextWith.js.map
import { operate } from '../util/lift';
import { mergeInternals } from './mergeInternals';
export function expand(project, concurrent = Infinity, scheduler) {
    concurrent = (concurrent || 0) < 1 ? Infinity : concurrent;
    return operate((source, subscriber) => mergeInternals(source, subscriber, project, concurrent, undefined, true, scheduler));
}
//# sourceMappingURL=expand.js.map
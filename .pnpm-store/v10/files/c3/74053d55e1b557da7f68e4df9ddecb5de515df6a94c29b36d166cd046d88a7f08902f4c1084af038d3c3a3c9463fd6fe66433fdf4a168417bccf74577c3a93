import { operate } from '../util/lift';
import { concatAll } from './concatAll';
import { popScheduler } from '../util/args';
import { from } from '../observable/from';
export function concat(...args) {
    const scheduler = popScheduler(args);
    return operate((source, subscriber) => {
        concatAll()(from([source, ...args], scheduler)).subscribe(subscriber);
    });
}
//# sourceMappingURL=concat.js.map
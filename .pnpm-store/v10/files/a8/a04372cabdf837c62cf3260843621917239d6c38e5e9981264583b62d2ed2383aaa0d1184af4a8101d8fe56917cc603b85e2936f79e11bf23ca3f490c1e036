import { concat } from '../observable/concat';
import { take } from './take';
import { ignoreElements } from './ignoreElements';
import { mapTo } from './mapTo';
import { mergeMap } from './mergeMap';
import { innerFrom } from '../observable/innerFrom';
export function delayWhen(delayDurationSelector, subscriptionDelay) {
    if (subscriptionDelay) {
        return function (source) {
            return concat(subscriptionDelay.pipe(take(1), ignoreElements()), source.pipe(delayWhen(delayDurationSelector)));
        };
    }
    return mergeMap(function (value, index) { return innerFrom(delayDurationSelector(value, index)).pipe(take(1), mapTo(value)); });
}
//# sourceMappingURL=delayWhen.js.map
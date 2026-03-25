import { identity } from '../util/identity';
import { isScheduler } from '../util/isScheduler';
import { defer } from './defer';
import { scheduleIterable } from '../scheduled/scheduleIterable';
export function generate(initialStateOrOptions, condition, iterate, resultSelectorOrScheduler, scheduler) {
    let resultSelector;
    let initialState;
    if (arguments.length === 1) {
        ({
            initialState,
            condition,
            iterate,
            resultSelector = identity,
            scheduler,
        } = initialStateOrOptions);
    }
    else {
        initialState = initialStateOrOptions;
        if (!resultSelectorOrScheduler || isScheduler(resultSelectorOrScheduler)) {
            resultSelector = identity;
            scheduler = resultSelectorOrScheduler;
        }
        else {
            resultSelector = resultSelectorOrScheduler;
        }
    }
    function* gen() {
        for (let state = initialState; !condition || condition(state); state = iterate(state)) {
            yield resultSelector(state);
        }
    }
    return defer((scheduler
        ?
            () => scheduleIterable(gen(), scheduler)
        :
            gen));
}
//# sourceMappingURL=generate.js.map
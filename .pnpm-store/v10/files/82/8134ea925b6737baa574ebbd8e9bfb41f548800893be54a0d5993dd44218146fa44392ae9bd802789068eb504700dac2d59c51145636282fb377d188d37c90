import { createOperatorSubscriber } from './OperatorSubscriber';
export function scanInternals(accumulator, seed, hasSeed, emitOnNext, emitBeforeComplete) {
    return (source, subscriber) => {
        let hasState = hasSeed;
        let state = seed;
        let index = 0;
        source.subscribe(createOperatorSubscriber(subscriber, (value) => {
            const i = index++;
            state = hasState
                ?
                    accumulator(state, value, i)
                :
                    ((hasState = true), value);
            emitOnNext && subscriber.next(state);
        }, emitBeforeComplete &&
            (() => {
                hasState && subscriber.next(state);
                subscriber.complete();
            })));
    };
}
//# sourceMappingURL=scanInternals.js.map
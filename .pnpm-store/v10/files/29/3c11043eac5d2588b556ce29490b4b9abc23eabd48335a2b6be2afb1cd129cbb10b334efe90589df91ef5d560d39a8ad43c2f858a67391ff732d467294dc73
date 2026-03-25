import { Observable } from '../Observable';
import { innerFrom } from './innerFrom';
import { argsOrArgArray } from '../util/argsOrArgArray';
import { createOperatorSubscriber } from '../operators/OperatorSubscriber';
export function race(...sources) {
    sources = argsOrArgArray(sources);
    return sources.length === 1 ? innerFrom(sources[0]) : new Observable(raceInit(sources));
}
export function raceInit(sources) {
    return (subscriber) => {
        let subscriptions = [];
        for (let i = 0; subscriptions && !subscriber.closed && i < sources.length; i++) {
            subscriptions.push(innerFrom(sources[i]).subscribe(createOperatorSubscriber(subscriber, (value) => {
                if (subscriptions) {
                    for (let s = 0; s < subscriptions.length; s++) {
                        s !== i && subscriptions[s].unsubscribe();
                    }
                    subscriptions = null;
                }
                subscriber.next(value);
            })));
        }
    };
}
//# sourceMappingURL=race.js.map
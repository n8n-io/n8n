import { Observable } from '../Observable';
import { argsOrArgArray } from '../util/argsOrArgArray';
import { OperatorSubscriber } from '../operators/OperatorSubscriber';
import { noop } from '../util/noop';
import { innerFrom } from './innerFrom';
export function onErrorResumeNext(...sources) {
    const nextSources = argsOrArgArray(sources);
    return new Observable((subscriber) => {
        let sourceIndex = 0;
        const subscribeNext = () => {
            if (sourceIndex < nextSources.length) {
                let nextSource;
                try {
                    nextSource = innerFrom(nextSources[sourceIndex++]);
                }
                catch (err) {
                    subscribeNext();
                    return;
                }
                const innerSubscriber = new OperatorSubscriber(subscriber, undefined, noop, noop);
                nextSource.subscribe(innerSubscriber);
                innerSubscriber.add(subscribeNext);
            }
            else {
                subscriber.complete();
            }
        };
        subscribeNext();
    });
}
//# sourceMappingURL=onErrorResumeNext.js.map
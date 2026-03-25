import { Observable } from '../Observable';
import { argsOrArgArray } from '../util/argsOrArgArray';
import { OperatorSubscriber } from '../operators/OperatorSubscriber';
import { noop } from '../util/noop';
import { innerFrom } from './innerFrom';
export function onErrorResumeNext() {
    var sources = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        sources[_i] = arguments[_i];
    }
    var nextSources = argsOrArgArray(sources);
    return new Observable(function (subscriber) {
        var sourceIndex = 0;
        var subscribeNext = function () {
            if (sourceIndex < nextSources.length) {
                var nextSource = void 0;
                try {
                    nextSource = innerFrom(nextSources[sourceIndex++]);
                }
                catch (err) {
                    subscribeNext();
                    return;
                }
                var innerSubscriber = new OperatorSubscriber(subscriber, undefined, noop, noop);
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
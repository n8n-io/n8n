import { __assign, __rest } from "tslib";
import { createOperatorSubscriber } from '../../operators/OperatorSubscriber';
import { Observable } from '../../Observable';
import { innerFrom } from '../../observable/innerFrom';
export function fromFetch(input, initWithSelector) {
    if (initWithSelector === void 0) { initWithSelector = {}; }
    var selector = initWithSelector.selector, init = __rest(initWithSelector, ["selector"]);
    return new Observable(function (subscriber) {
        var controller = new AbortController();
        var signal = controller.signal;
        var abortable = true;
        var outerSignal = init.signal;
        if (outerSignal) {
            if (outerSignal.aborted) {
                controller.abort();
            }
            else {
                var outerSignalHandler_1 = function () {
                    if (!signal.aborted) {
                        controller.abort();
                    }
                };
                outerSignal.addEventListener('abort', outerSignalHandler_1);
                subscriber.add(function () { return outerSignal.removeEventListener('abort', outerSignalHandler_1); });
            }
        }
        var perSubscriberInit = __assign(__assign({}, init), { signal: signal });
        var handleError = function (err) {
            abortable = false;
            subscriber.error(err);
        };
        fetch(input, perSubscriberInit)
            .then(function (response) {
            if (selector) {
                innerFrom(selector(response)).subscribe(createOperatorSubscriber(subscriber, undefined, function () {
                    abortable = false;
                    subscriber.complete();
                }, handleError));
            }
            else {
                abortable = false;
                subscriber.next(response);
                subscriber.complete();
            }
        })
            .catch(handleError);
        return function () {
            if (abortable) {
                controller.abort();
            }
        };
    });
}
//# sourceMappingURL=fetch.js.map
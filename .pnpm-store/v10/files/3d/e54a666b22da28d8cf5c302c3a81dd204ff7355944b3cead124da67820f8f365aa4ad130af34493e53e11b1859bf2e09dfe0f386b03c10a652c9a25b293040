"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.takeUntil = void 0;
var lift_1 = require("../util/lift");
var OperatorSubscriber_1 = require("./OperatorSubscriber");
var innerFrom_1 = require("../observable/innerFrom");
var noop_1 = require("../util/noop");
function takeUntil(notifier) {
    return lift_1.operate(function (source, subscriber) {
        innerFrom_1.innerFrom(notifier).subscribe(OperatorSubscriber_1.createOperatorSubscriber(subscriber, function () { return subscriber.complete(); }, noop_1.noop));
        !subscriber.closed && source.subscribe(subscriber);
    });
}
exports.takeUntil = takeUntil;
//# sourceMappingURL=takeUntil.js.map
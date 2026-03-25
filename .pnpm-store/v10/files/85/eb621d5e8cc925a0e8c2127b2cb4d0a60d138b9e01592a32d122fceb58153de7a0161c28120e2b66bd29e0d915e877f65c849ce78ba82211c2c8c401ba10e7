"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleObservable = void 0;
var innerFrom_1 = require("../observable/innerFrom");
var observeOn_1 = require("../operators/observeOn");
var subscribeOn_1 = require("../operators/subscribeOn");
function scheduleObservable(input, scheduler) {
    return innerFrom_1.innerFrom(input).pipe(subscribeOn_1.subscribeOn(scheduler), observeOn_1.observeOn(scheduler));
}
exports.scheduleObservable = scheduleObservable;
//# sourceMappingURL=scheduleObservable.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeToArray = void 0;
var subscribeToArray = function (array) { return function (subscriber) {
    for (var i = 0, len = array.length; i < len && !subscriber.closed; i++) {
        subscriber.next(array[i]);
    }
    subscriber.complete();
}; };
exports.subscribeToArray = subscribeToArray;
//# sourceMappingURL=subscribeToArray.js.map
"use strict";

var Q = require("./q");

module.exports = Queue;
function Queue() {
    if (!(this instanceof Queue)) {
        return new Queue();
    }
    var ends = Q.defer();
    this.put = function (value) {
        var next = Q.defer();
        ends.resolve({
            head: value,
            tail: next.promise
        });
        ends.resolve = next.resolve;
    };
    this.get = function () {
        var result = ends.promise.get("head");
        ends.promise = ends.promise.get("tail");
        return result;
    };
}


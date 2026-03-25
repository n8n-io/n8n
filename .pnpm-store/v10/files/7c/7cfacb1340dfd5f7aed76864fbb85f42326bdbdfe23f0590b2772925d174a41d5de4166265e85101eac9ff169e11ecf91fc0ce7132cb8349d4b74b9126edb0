"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PromiseQueue = /** @class */ (function () {
    function PromiseQueue(_a) {
        var _b = (_a === void 0 ? {} : _a).concurrency, concurrency = _b === void 0 ? 1 : _b;
        this.options = { concurrency: concurrency };
        this.running = 0;
        this.queue = [];
        this.idleCallbacks = [];
    }
    PromiseQueue.prototype.clear = function () {
        this.queue = [];
    };
    PromiseQueue.prototype.onIdle = function (callback) {
        var _this = this;
        this.idleCallbacks.push(callback);
        return function () {
            var index = _this.idleCallbacks.indexOf(callback);
            if (index !== -1) {
                _this.idleCallbacks.splice(index, 1);
            }
        };
    };
    PromiseQueue.prototype.waitTillIdle = function () {
        var _this = this;
        return new Promise(function (resolve) {
            if (_this.running === 0) {
                resolve();
                return;
            }
            var dispose = _this.onIdle(function () {
                dispose();
                resolve();
            });
        });
    };
    PromiseQueue.prototype.add = function (callback) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var runCallback = function () {
                _this.running += 1;
                try {
                    Promise.resolve(callback()).then(function (val) {
                        resolve(val);
                        _this.processNext();
                    }, function (err) {
                        reject(err);
                        _this.processNext();
                    });
                }
                catch (err) {
                    reject(err);
                    _this.processNext();
                }
            };
            if (_this.running >= _this.options.concurrency) {
                _this.queue.push(runCallback);
            }
            else {
                runCallback();
            }
        });
    };
    // Internal function, don't use
    PromiseQueue.prototype.processNext = function () {
        this.running -= 1;
        var callback = this.queue.shift();
        if (callback) {
            callback();
        }
        else if (this.running === 0) {
            this.idleCallbacks.forEach(function (item) { return item(); });
        }
    };
    return PromiseQueue;
}());
exports.PromiseQueue = PromiseQueue;

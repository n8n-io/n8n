import { __awaiter, __generator } from "tslib";
import { E_CANCELED } from './errors';
var Semaphore = /** @class */ (function () {
    function Semaphore(_value, _cancelError) {
        if (_cancelError === void 0) { _cancelError = E_CANCELED; }
        this._value = _value;
        this._cancelError = _cancelError;
        this._queue = [];
        this._weightedWaiters = [];
    }
    Semaphore.prototype.acquire = function (weight, priority) {
        var _this = this;
        if (weight === void 0) { weight = 1; }
        if (priority === void 0) { priority = 0; }
        if (weight <= 0)
            throw new Error("invalid weight ".concat(weight, ": must be positive"));
        return new Promise(function (resolve, reject) {
            var task = { resolve: resolve, reject: reject, weight: weight, priority: priority };
            var i = findIndexFromEnd(_this._queue, function (other) { return priority <= other.priority; });
            if (i === -1 && weight <= _this._value) {
                // Needs immediate dispatch, skip the queue
                _this._dispatchItem(task);
            }
            else {
                _this._queue.splice(i + 1, 0, task);
            }
        });
    };
    Semaphore.prototype.runExclusive = function (callback_1) {
        return __awaiter(this, arguments, void 0, function (callback, weight, priority) {
            var _a, value, release;
            if (weight === void 0) { weight = 1; }
            if (priority === void 0) { priority = 0; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.acquire(weight, priority)];
                    case 1:
                        _a = _b.sent(), value = _a[0], release = _a[1];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, , 4, 5]);
                        return [4 /*yield*/, callback(value)];
                    case 3: return [2 /*return*/, _b.sent()];
                    case 4:
                        release();
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    Semaphore.prototype.waitForUnlock = function (weight, priority) {
        var _this = this;
        if (weight === void 0) { weight = 1; }
        if (priority === void 0) { priority = 0; }
        if (weight <= 0)
            throw new Error("invalid weight ".concat(weight, ": must be positive"));
        if (this._couldLockImmediately(weight, priority)) {
            return Promise.resolve();
        }
        else {
            return new Promise(function (resolve) {
                if (!_this._weightedWaiters[weight - 1])
                    _this._weightedWaiters[weight - 1] = [];
                insertSorted(_this._weightedWaiters[weight - 1], { resolve: resolve, priority: priority });
            });
        }
    };
    Semaphore.prototype.isLocked = function () {
        return this._value <= 0;
    };
    Semaphore.prototype.getValue = function () {
        return this._value;
    };
    Semaphore.prototype.setValue = function (value) {
        this._value = value;
        this._dispatchQueue();
    };
    Semaphore.prototype.release = function (weight) {
        if (weight === void 0) { weight = 1; }
        if (weight <= 0)
            throw new Error("invalid weight ".concat(weight, ": must be positive"));
        this._value += weight;
        this._dispatchQueue();
    };
    Semaphore.prototype.cancel = function () {
        var _this = this;
        this._queue.forEach(function (entry) { return entry.reject(_this._cancelError); });
        this._queue = [];
    };
    Semaphore.prototype._dispatchQueue = function () {
        this._drainUnlockWaiters();
        while (this._queue.length > 0 && this._queue[0].weight <= this._value) {
            this._dispatchItem(this._queue.shift());
            this._drainUnlockWaiters();
        }
    };
    Semaphore.prototype._dispatchItem = function (item) {
        var previousValue = this._value;
        this._value -= item.weight;
        item.resolve([previousValue, this._newReleaser(item.weight)]);
    };
    Semaphore.prototype._newReleaser = function (weight) {
        var _this = this;
        var called = false;
        return function () {
            if (called)
                return;
            called = true;
            _this.release(weight);
        };
    };
    Semaphore.prototype._drainUnlockWaiters = function () {
        if (this._queue.length === 0) {
            for (var weight = this._value; weight > 0; weight--) {
                var waiters = this._weightedWaiters[weight - 1];
                if (!waiters)
                    continue;
                waiters.forEach(function (waiter) { return waiter.resolve(); });
                this._weightedWaiters[weight - 1] = [];
            }
        }
        else {
            var queuedPriority_1 = this._queue[0].priority;
            for (var weight = this._value; weight > 0; weight--) {
                var waiters = this._weightedWaiters[weight - 1];
                if (!waiters)
                    continue;
                var i = waiters.findIndex(function (waiter) { return waiter.priority <= queuedPriority_1; });
                (i === -1 ? waiters : waiters.splice(0, i))
                    .forEach((function (waiter) { return waiter.resolve(); }));
            }
        }
    };
    Semaphore.prototype._couldLockImmediately = function (weight, priority) {
        return (this._queue.length === 0 || this._queue[0].priority < priority) &&
            weight <= this._value;
    };
    return Semaphore;
}());
function insertSorted(a, v) {
    var i = findIndexFromEnd(a, function (other) { return v.priority <= other.priority; });
    a.splice(i + 1, 0, v);
}
function findIndexFromEnd(a, predicate) {
    for (var i = a.length - 1; i >= 0; i--) {
        if (predicate(a[i])) {
            return i;
        }
    }
    return -1;
}
export default Semaphore;

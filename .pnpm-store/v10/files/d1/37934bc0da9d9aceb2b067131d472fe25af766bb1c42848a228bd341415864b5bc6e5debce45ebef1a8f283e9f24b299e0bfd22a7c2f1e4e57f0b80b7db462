import { __awaiter, __generator } from "tslib";
import Semaphore from './Semaphore';
var Mutex = /** @class */ (function () {
    function Mutex(cancelError) {
        this._semaphore = new Semaphore(1, cancelError);
    }
    Mutex.prototype.acquire = function () {
        return __awaiter(this, arguments, void 0, function (priority) {
            var _a, releaser;
            if (priority === void 0) { priority = 0; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this._semaphore.acquire(1, priority)];
                    case 1:
                        _a = _b.sent(), releaser = _a[1];
                        return [2 /*return*/, releaser];
                }
            });
        });
    };
    Mutex.prototype.runExclusive = function (callback, priority) {
        if (priority === void 0) { priority = 0; }
        return this._semaphore.runExclusive(function () { return callback(); }, 1, priority);
    };
    Mutex.prototype.isLocked = function () {
        return this._semaphore.isLocked();
    };
    Mutex.prototype.waitForUnlock = function (priority) {
        if (priority === void 0) { priority = 0; }
        return this._semaphore.waitForUnlock(1, priority);
    };
    Mutex.prototype.release = function () {
        if (this._semaphore.isLocked())
            this._semaphore.release();
    };
    Mutex.prototype.cancel = function () {
        return this._semaphore.cancel();
    };
    return Mutex;
}());
export default Mutex;

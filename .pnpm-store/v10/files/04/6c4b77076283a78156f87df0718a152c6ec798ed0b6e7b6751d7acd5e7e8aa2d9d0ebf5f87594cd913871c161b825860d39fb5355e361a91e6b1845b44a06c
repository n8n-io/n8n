"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeoutTimer = void 0;
class TimeoutTimer {
    constructor(timeout) {
        this.timerPromise = new Promise((resolve) => {
            this.timeoutTimerId = setTimeout(resolve, timeout);
        });
    }
    get promise() {
        return this.timerPromise;
    }
    clear() {
        clearTimeout(this.timeoutTimerId);
    }
    static start(timeout) {
        return new TimeoutTimer(timeout);
    }
}
exports.TimeoutTimer = TimeoutTimer;

//# sourceMappingURL=Timer.js.map

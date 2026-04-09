"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timer = void 0;
const consts_1 = require("../../consts");
class Timer {
    static instance;
    startTime;
    constructor() {
        this.startTime = Date.now();
    }
    static getInstance() {
        if (!Timer.instance) {
            Timer.instance = new Timer();
        }
        return Timer.instance;
    }
    isTimedOut() {
        const parsedTimeout = parseInt(process.env.RESPECT_TIMEOUT, 10);
        const timeout = isNaN(parsedTimeout) ? consts_1.DEFAULT_RESPECT_TIMEOUT : parsedTimeout;
        return Date.now() - this.startTime > timeout;
    }
}
exports.Timer = Timer;
//# sourceMappingURL=timer.js.map
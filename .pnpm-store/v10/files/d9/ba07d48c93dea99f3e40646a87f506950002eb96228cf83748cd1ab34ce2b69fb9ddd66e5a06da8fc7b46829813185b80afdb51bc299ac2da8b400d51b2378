"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractWaitStrategy = void 0;
class AbstractWaitStrategy {
    startupTimeoutMs = 60_000;
    startupTimeoutSet = false;
    withStartupTimeout(startupTimeoutMs) {
        this.startupTimeoutMs = startupTimeoutMs;
        this.startupTimeoutSet = true;
        return this;
    }
    isStartupTimeoutSet() {
        return this.startupTimeoutSet;
    }
    getStartupTimeout() {
        return this.startupTimeoutMs;
    }
}
exports.AbstractWaitStrategy = AbstractWaitStrategy;
//# sourceMappingURL=wait-strategy.js.map